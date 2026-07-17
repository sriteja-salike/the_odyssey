"""Scenario run use cases coordinating sources, engine, audit, and execution."""
from __future__ import annotations

from dataclasses import replace
from decimal import Decimal
from typing import Any
from uuid import uuid4

from nourishops.agents.contracts import DecisionAgent
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.application.decision_package import (
    build_decision_brief,
    build_recommendation_package,
)
from nourishops.application.decisioning import SolverRegistry, UnsupportedDecisionProblem
from nourishops.persistence.postgres import PostgresStore, jsonable, sha256


class ApplicationError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class NourishOpsService:
    def __init__(self, store: PostgresStore, solver_registry: SolverRegistry | None = None,
                 agent: DecisionAgent | None = None):
        self.store = store
        self.solver_registry = solver_registry or SolverRegistry()
        self.agent = agent or OfflineDecisionAgent()

    def create_run(
        self, scenario_key: str, parent_run_id: str | None = None, connection=None,
    ) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.create_run(scenario_key, parent_run_id, owned)
        try:
            run_id = self.store.create_run(scenario_key, parent_run_id, connection)
        except (FileNotFoundError, KeyError, RuntimeError, ValueError) as exc:
            raise ApplicationError("SCENARIO_NOT_FOUND", "That synthetic scenario is unavailable.", 404) from exc
        return self.get_run(run_id, connection)

    def get_run(self, run_id: str, connection=None) -> dict:
        run = self.store.get_run(run_id, connection)
        if run is None:
            raise ApplicationError("RUN_NOT_FOUND", "That run does not exist.", 404)
        run["knowledge"] = self.store.run_knowledge_summary(run_id, connection)
        run["context"] = self.store.run_context(run_id, connection)
        return run

    def get_decision_brief(self, run_id: str) -> dict:
        run = self.get_run(run_id)
        if run["decision_brief"] is None:
            raise ApplicationError(
                "DECISION_BRIEF_NOT_READY", "Analyze this run before requesting its decision brief.", 409,
            )
        return run["decision_brief"]

    def capabilities(self) -> dict[str, Any]:
        return {
            "scenario_context_version": "scenario-context/1.0.0",
            "decision_brief_version": "decision-brief/1.0.0",
            "recommendation_package_version": "recommendation-package/1.0.0",
            "agent": self.agent.describe().model_dump(mode="json"),
            "supported_agent_providers": ["offline", "anthropic", "openai"],
            "agent_authority": "READ_ONLY_EXPLANATION",
            "scenario_packages": [
                {
                    "package_id": package.package_id,
                    "package_version": package.package_version,
                    "scenario_keys": package.scenario_keys,
                    "problem_type": package.problem_type,
                    "solver_id": package.solver_id,
                    "result_contract": package.result_contract,
                }
                for package in self.store.scenario_registry.packages()
            ],
            "solvers": self.solver_registry.describe(),
            "post_recommendation_workflows_enabled": False,
        }

    def preview_action(
        self, run_id: str, action_id: str, quantity_lb: int,
        expected_revision: int | None = None,
        recommendation_id: str | None = None,
    ) -> dict:
        run = self.get_run(run_id)
        if run["state"] != "READY_FOR_REVIEW":
            raise ApplicationError(
                "INVALID_RUN_STATE", "Actions can only be previewed before a decision.", 409,
            )
        self._check_recommendation_identity(run, expected_revision, recommendation_id)
        result, evaluation = self._evaluate_action(run_id, action_id, quantity_lb)
        recommendation = result.get("recommended_action") or {}
        return {
            "run_id": run_id,
            "action_id": action_id,
            "requested_quantity_lb": quantity_lb,
            "decision_status": result["decision_status"],
            "feasible": evaluation["feasible"],
            "evaluation": evaluation,
            "would_be_recommended": (
                recommendation.get("evaluated_action_id") == evaluation["evaluated_action_id"]
            ),
            "recommended_action": recommendation or None,
            "simulated": True,
        }

    def evaluate(self, run_id: str, connection=None) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.evaluate(run_id, owned)
        self.store.lock_run(connection, run_id)
        run = self.get_run(run_id, connection)
        if run["state"] != "DRAFT":
            if run["analysis"] is not None:
                return run
            raise ApplicationError("INVALID_RUN_STATE", "Only a draft run can be analyzed.", 409)

        snapshot = self.store.load_run_scenario(run_id, connection)
        try:
            solver = self.solver_registry.select(
                snapshot,
                run.get("problem_type") or "SINGLE_ACTION_CATALOG",
                run.get("solver_id"),
            )
        except UnsupportedDecisionProblem as exc:
            self.store.append_event(run_id, "ANALYSIS_FAILED", "SYSTEM", {
                "state": "FAILED",
                "error": {"code": "UNSUPPORTED_DECISION_PROBLEM", "message": str(exc)},
            }, connection)
            return self.get_run(run_id, connection)

        result = jsonable(solver.solve(snapshot))
        analysis_output_hash = sha256(result)
        package = build_recommendation_package(result, run["context"], solver.descriptor)
        agent_outcome = self.agent.explain(package) if package is not None else None
        agent_metadata = agent_outcome.metadata if agent_outcome else self.agent.describe()
        decision_brief = build_decision_brief(
            run_id=run_id,
            analysis=result,
            context=run["context"],
            solver=solver.descriptor,
            analysis_output_hash=analysis_output_hash,
            agent_metadata=agent_metadata,
            agent_outcome=agent_outcome,
        ).model_dump(mode="json")
        if agent_metadata.fallback_code:
            self.store.append_event(run_id, "FALLBACK_USED", "LLM_ADAPTER", {
                "state": "DRAFT",
                "fallback_code": agent_metadata.fallback_code,
                "agent": agent_metadata.model_dump(mode="json"),
            }, connection)
        state = result["decision_status"]
        event_type = (
            "RECOMMENDATION_PREPARED" if state == "READY_FOR_REVIEW"
            else "RECOMMENDATION_ABSTAINED" if state == "ABSTAINED"
            else "NO_ACTION_REQUIRED"
        )
        self.store.append_event(run_id, event_type, "SYSTEM", {
            "state": state,
            "analysis": result,
            "analysis_output_hash": analysis_output_hash,
            "decision_brief": decision_brief,
            "solver": solver.descriptor.as_dict(),
            "agent": agent_metadata.model_dump(mode="json"),
            "knowledge_sources": run["knowledge"],
            "trace": [
                "SOURCE_RECORDS_LOADED", "SCENARIO_VALIDATED", "FORECAST_COMPUTED",
                "RISKS_DETECTED", "ACTIONS_RANKED", "DECISION_BRIEF_PREPARED",
            ],
        }, connection)
        return self.get_run(run_id, connection)

    def decide(self, run_id: str, kind: str, action_id: str, quantity_lb: int,
               reason: str | None, expected_revision: int | None = None,
               recommendation_id: str | None = None, connection=None) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.decide(
                    run_id, kind, action_id, quantity_lb, reason,
                    expected_revision, recommendation_id, owned,
                )
        self.store.lock_run(connection, run_id)
        run = self.get_run(run_id, connection)
        if run["state"] != "READY_FOR_REVIEW":
            if run["decision"] is not None:
                raise ApplicationError(
                    "DECISION_ALREADY_FINAL", "A final decision already exists for this run.", 409,
                )
            raise ApplicationError("INVALID_RUN_STATE", "This run is not awaiting a decision.", 409)
        self._check_recommendation_identity(run, expected_revision, recommendation_id)

        normalized_kind = kind.lower()
        clean_reason = reason.strip() if reason else None
        if normalized_kind in {"reject", "edit-approve"} and not clean_reason:
            raise ApplicationError("INVALID_REQUEST", "A reason is required for this decision.")

        analysis = run["analysis"]
        recommendation = analysis.get("recommended_action") or {}
        evaluations = analysis.get("action_evaluations") or []
        evaluation = next(
            (item for item in evaluations
             if item["action"]["action_id"] == action_id
             and int(item["action"]["requested_lb"]) == quantity_lb),
            None,
        )
        if evaluation is None and normalized_kind == "edit-approve":
            _, evaluation = self._evaluate_action(run_id, action_id, quantity_lb, connection)
        if normalized_kind in {"approve", "edit-approve"}:
            if evaluation is None or not evaluation["feasible"]:
                raise ApplicationError(
                    "ACTION_NOT_FEASIBLE",
                    "That action and quantity must be rechecked before approval.", 422,
                )
            is_top = action_id == recommendation.get("action_id")
            if (not is_top or normalized_kind == "edit-approve") and not clean_reason:
                raise ApplicationError("INVALID_REQUEST", "A reason is required for a changed plan.")

        state = {
            "approve": "APPROVED", "edit-approve": "APPROVED",
            "reject": "REJECTED", "defer": "DEFERRED",
        }[normalized_kind]
        decision_record = {
            "decision_id": f"DEC-{uuid4().hex[:10].upper()}",
            "kind": normalized_kind,
            "action_id": action_id,
            "quantity_lb": quantity_lb,
            "reason": clean_reason,
            "recommendation_id": recommendation.get("recommendation_id"),
        }
        event_payload = {"state": state, "decision": decision_record}

        execution = None
        if state == "APPROVED" and evaluation is not None:
            action = evaluation["action"]
            execution_type = {
                "PURCHASE": "PURCHASE_ORDER_REQUEST",
                "REQUEST_TRANSFER": "PEER_TRANSFER_REQUEST",
                "TARGETED_DONOR_REQUEST": "DONOR_OUTREACH_REQUEST",
                "ACCEPT_DONATION": "DONATION_ACCEPTANCE_REQUEST",
                "PARTIAL_ACCEPT": "PARTIAL_DONATION_ACCEPTANCE_REQUEST",
                "REDIRECT_DONATION": "DONATION_REDIRECT_REQUEST",
                "ACCELERATE_DISTRIBUTION": "DISTRIBUTION_TASK_REQUEST",
            }.get(action["action_type"], "OPERATIONS_TASK_REQUEST")
            execution = {
                "execution_id": f"SIM-{uuid4().hex[:10].upper()}",
                "action_id": action_id,
                "execution_type": execution_type,
                "status": "SIMULATED_SUBMITTED",
                "target_system": "Synthetic operations gateway",
                "quantity_lb": quantity_lb,
                "cost_usd": evaluation["cost_usd"],
                "arrival_week_start": action.get("arrival_week_start"),
                "external_write_performed": False,
            }

        event_type = {
            "approve": "MANAGER_APPROVED", "edit-approve": "MANAGER_EDITED_APPROVED",
            "reject": "MANAGER_REJECTED", "defer": "MANAGER_DEFERRED",
        }[normalized_kind]
        self.store.append_decision_with_execution(
            run_id, event_type, event_payload, execution, connection,
        )
        return self.get_run(run_id, connection)

    def record_feedback(self, run_id: str, rating: str, reason: str | None,
                        survey: dict[str, Any], connection=None) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.record_feedback(run_id, rating, reason, survey, owned)
        self.store.lock_run(connection, run_id)
        run = self.get_run(run_id, connection)
        recommendation = (run.get("analysis") or {}).get("recommended_action") or {}
        recommendation_id = recommendation.get("recommendation_id")
        if recommendation_id is None:
            raise ApplicationError("NO_RECOMMENDATION", "This run has no recommendation to rate.", 409)
        return self.store.add_feedback(
            run_id, recommendation_id, rating,
            reason.strip() if reason else None, survey, connection,
        )

    def _evaluate_action(self, run_id: str, action_id: str,
                         quantity_lb: int, connection=None) -> tuple[dict, dict]:
        snapshot = self.store.load_run_scenario(run_id, connection)
        catalog_action = next((item for item in snapshot.actions if item.action_id == action_id), None)
        requested = Decimal(quantity_lb)
        if catalog_action is None:
            raise ApplicationError("ACTION_NOT_FOUND", "That action is not in this scenario.", 404)
        if requested < catalog_action.minimum_lb or requested > catalog_action.maximum_lb \
                or (requested - catalog_action.minimum_lb) % catalog_action.increment_lb != 0:
            raise ApplicationError(
                "EDIT_QUANTITY_INFEASIBLE",
                "The edited quantity is outside the catalog range or increment.", 422,
            )
        computed_cost = catalog_action.fixed_cost
        if catalog_action.unit_price is not None:
            computed_cost += requested * catalog_action.unit_price
        edited_action = replace(
            catalog_action, requested_lb=requested, computed_cost=computed_cost,
        )
        edited_snapshot = replace(
            snapshot,
            actions=[
                edited_action if item.action_id == action_id else item
                for item in snapshot.actions
            ],
        )
        run = self.store.get_run(run_id, connection)
        if run is None:
            raise ApplicationError("RUN_NOT_FOUND", "That run does not exist.", 404)
        solver = self.solver_registry.select(
            edited_snapshot,
            run.get("problem_type") or "SINGLE_ACTION_CATALOG",
            run.get("solver_id"),
        )
        result = jsonable(solver.solve(edited_snapshot))
        evaluation = next(
            (
                item for item in result.get("action_evaluations", [])
                if item["action"]["action_id"] == action_id
                and int(item["action"]["requested_lb"]) == quantity_lb
            ),
            None,
        )
        if evaluation is None:
            raise ApplicationError(
                "ACTION_NOT_EVALUATED", "The engine could not evaluate that action.", 422,
            )
        return result, evaluation

    @staticmethod
    def _check_recommendation_identity(
        run: dict, expected_revision: int | None, recommendation_id: str | None,
    ) -> None:
        recommendation = (run.get("analysis") or {}).get("recommended_action") or {}
        if expected_revision is not None and run["revision"] != expected_revision:
            raise ApplicationError(
                "STALE_RECOMMENDATION",
                "This recommendation changed. Refresh it before taking action.",
                409,
            )
        if recommendation_id is not None and (
            recommendation.get("recommendation_id") != recommendation_id
        ):
            raise ApplicationError(
                "STALE_RECOMMENDATION",
                "This recommendation changed. Refresh it before taking action.",
                409,
            )
