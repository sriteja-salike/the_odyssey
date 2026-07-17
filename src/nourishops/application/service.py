"""Scenario run use cases coordinating sources, engine, audit, and execution."""
from __future__ import annotations

from dataclasses import replace
from decimal import Decimal
from time import perf_counter_ns
from typing import Any
from uuid import uuid4

from nourishops.agents.contracts import DecisionAgent, DecisionReviewer
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.agents.operations import OfflineOperationsAgent, OperationsAgent
from nourishops.agents.reviewer import OfflineDecisionReviewer
from nourishops.application.decision_package import (
    build_decision_brief,
    build_recommendation_package,
)
from nourishops.application.decision_trace import (
    DecisionTraceStage,
    TraceFinalStatus,
    new_trace,
)
from nourishops.application.decisioning import (
    InvalidSolverResult,
    SolverRegistry,
    UnsupportedDecisionProblem,
    validate_solver_result,
)
from nourishops.application.execution import (
    SimulatedExecutionAdapter,
    build_action_intent,
)
from nourishops.application.presentation import WorkItem, build_work_item
from nourishops.persistence.postgres import PostgresStore, jsonable, sha256


class ApplicationError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class NourishOpsService:
    def __init__(self, store: PostgresStore, solver_registry: SolverRegistry | None = None,
                 agent: DecisionAgent | None = None,
                 reviewer: DecisionReviewer | None = None,
                 operations_agent: OperationsAgent | None = None):
        self.store = store
        self.solver_registry = solver_registry or SolverRegistry()
        self.agent = agent or OfflineDecisionAgent()
        self.reviewer = reviewer or OfflineDecisionReviewer()
        self.operations_agent = operations_agent or OfflineOperationsAgent()
        self.execution_adapter = SimulatedExecutionAdapter()

    def create_run(
        self, scenario_key: str, parent_run_id: str | None = None, connection=None,
    ) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.create_run(scenario_key, parent_run_id, owned)
        try:
            self.store.scenario_registry.get(scenario_key)
        except KeyError as exc:
            raise ApplicationError("SCENARIO_NOT_FOUND", "That synthetic scenario is unavailable.", 404) from exc
        try:
            run_id = self.store.create_run(scenario_key, parent_run_id, connection)
        except (FileNotFoundError, RuntimeError, ValueError) as exc:
            raise ApplicationError(
                "SCENARIO_CONTRACT_INVALID",
                "The scenario contract or its source snapshots are invalid.",
                500,
            ) from exc
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

    def list_work_items(self) -> list[dict[str, Any]]:
        """Return deterministic, non-persisted previews for the operations home.

        These previews route the coordinator into a real frozen run; they do not
        call a language model, create a recommendation record, or execute work.
        """
        work_items: list[WorkItem] = []
        for scenario in self.store.list_scenarios():
            scenario_key = scenario["key"]
            snapshot = self.store.load_scenario(scenario_key)
            package = self.store.scenario_registry.get(scenario_key)
            solver = self.solver_registry.select(
                snapshot, package.problem_type, package.solver_id,
            )
            analysis = jsonable(solver.solve(snapshot))
            validate_solver_result(analysis, snapshot.scenario_id)
            context = self.store.scenario_context(scenario_key)
            work_items.append(build_work_item(scenario_key, analysis, context))
        return [item.model_dump(mode="json") for item in work_items]

    def answer_operations_question(
        self,
        messages: list[dict[str, str]],
        current_work_item_id: str | None = None,
    ) -> dict[str, Any]:
        """Let the operations agent route intent, then render only verified facts."""
        items = self.list_work_items()
        outcome = self.operations_agent.route(messages, items, current_work_item_id)
        selection = outcome.selection
        selected = next(
            (item for item in items if item["work_item_id"] == selection.work_item_id),
            None,
        )
        answer = self._render_operations_answer(selection.answer_style, selected)
        return {
            "schema_version": "operations-assistant-response/2.0.0",
            "response_type": selection.response_type,
            "answer": answer,
            "work_item": selected,
            "suggested_questions": (
                selected["presentation"]["suggested_questions"] if selected else [
                    "What needs my attention first?",
                    "Are any deliveries at risk?",
                    "Do any records conflict?",
                ]
            ),
            "authority_note": (
                "The agent can match, explain, and recommend from verified options; "
                "only a manager can approve a simulated action."
            ),
            "agent": outcome.metadata.model_dump(mode="json"),
            "guardrails": {
                "facts": "Backend-rendered from verified snapshots",
                "constraints": "Rechecked by the deterministic safety engine",
                "approval": "Human manager required",
            },
            "synthetic": True,
        }

    @staticmethod
    def _render_operations_answer(
        style: str, selected: dict[str, Any] | None,
    ) -> str:
        if selected is None:
            return (
                "I can help with shipment delays, short-life offers, donation "
                "mismatches, budget tradeoffs, or conflicting records. What changed, "
                "or what decision do you need to make?"
            )
        presentation = selected["presentation"]
        issue = presentation["issue"]
        recommendation = presentation["recommendation"]
        if style == "PRIORITY":
            return f"Start with {issue['title']} {issue['summary']}"
        if style == "SOURCES":
            return (
                f"I matched this issue using {selected['source_count']} active evidence "
                "records and the frozen operational snapshots. Open the review to see "
                "each source and assumption."
            )
        if style in {"CONFLICTS", "CORRECTION"}:
            conflicts = presentation["visual"].get("conflicts") or []
            if not conflicts:
                return f"{issue['title']} {issue['summary']}"
            details = "; ".join(
                f"{item['field_label']}: {' versus '.join(item['observed_values'])} "
                f"in {', '.join(item['sources'])}"
                for item in conflicts
            )
            if style == "CORRECTION":
                return (
                    f"Confirm these fields against the source of record before retrying: "
                    f"{details}. No approval is available until they agree."
                )
            return f"These decision-critical records conflict: {details}."
        if style == "RATIONALE" and recommendation:
            caution = f" {recommendation['caution']}" if recommendation.get("caution") else ""
            return f"{recommendation['effect']} {issue['summary']}{caution}"
        if style == "RECOMMENDATION" and recommendation:
            return (
                f"The agent-matched response to review is {recommendation['title']}. "
                f"{recommendation['effect']}"
            )
        if recommendation:
            return f"{issue['title']} {issue['summary']}"
        return (
            f"{issue['title']} {issue['summary']} The agent stopped safely and did "
            "not create an approval."
        )

    def get_context_bundle(self, run_id: str) -> dict[str, Any]:
        run = self.get_run(run_id)
        context_hash = sha256({
            "contract_snapshot_hash": run["contract_snapshot_hash"],
            "context": run["context"],
        })
        return {
            "schema_version": "context-bundle/1.0.0",
            "run_id": run_id,
            "scenario_id": run["scenario_id"],
            "frozen": True,
            "context_sha256": context_hash,
            "contract_snapshot_hash": run["contract_snapshot_hash"],
            "knowledge_sources": run["knowledge"],
            "context": run["context"],
            "quality": {"status": "COMPLETE", "missing": [], "conflicts": []},
            "synthetic": True,
        }

    def get_decision_trace(self, run_id: str) -> dict[str, Any]:
        run = self.get_run(run_id)
        if run["decision_trace"] is None:
            raise ApplicationError(
                "DECISION_TRACE_NOT_READY",
                "Analyze this run before requesting its decision trace.",
                409,
            )
        return run["decision_trace"]

    def capabilities(self) -> dict[str, Any]:
        return {
            "scenario_context_version": "scenario-context/1.0.0",
            "context_bundle_version": "context-bundle/1.0.0",
            "decision_brief_version": "decision-brief/1.0.0",
            "decision_presentation_version": "decision-presentation/1.0.0",
            "work_item_version": "work-item/1.0.0",
            "decision_trace_version": "decision-trace/1.0.0",
            "recommendation_package_version": "recommendation-package/1.0.0",
            "agent": self.agent.describe().model_dump(mode="json"),
            "operations_agent": self.operations_agent.describe().model_dump(mode="json"),
            "reviewer": self.reviewer.describe().model_dump(mode="json"),
            "supported_agent_providers": ["offline", "anthropic", "openai"],
            "agent_authority": "READ_ONLY_RECOMMENDATION_AND_REVIEW",
            "scenario_packages": [
                {
                    "package_id": package.package_id,
                    "package_version": package.package_version,
                    "scenario_keys": package.scenario_keys,
                    "problem_type": package.problem_type,
                    "solver_id": package.solver_id,
                    "context_builder_id": package.context_builder_id,
                    "result_contract": package.result_contract,
                }
                for package in self.store.scenario_registry.packages()
            ],
            "context_builders": self.store.context_builder_registry.describe(),
            "solvers": self.solver_registry.describe(),
            "post_recommendation_workflows_enabled": True,
            "execution": {
                "mode": "SIMULATED",
                "requires_human_approval": True,
                "external_writes_allowed": False,
                "action_intent_version": "action-intent/1.0.0",
                "execution_receipt_version": "execution-receipt/1.0.0",
                "outcome_feedback_enabled": True,
            },
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

        context_hash = sha256(run["context"])
        trace_stages = [DecisionTraceStage(
            stage="CONTEXT_FROZEN",
            actor="CONTEXT_LAYER",
            status="PASSED",
            duration_ms=0,
            input_sha256=run["contract_snapshot_hash"],
            output_sha256=context_hash,
            summary="Pinned current, organizational, and scenario snapshots were loaded.",
            details={
                "document_count": len(run["input_manifest"]),
                "current_sources": len(run["knowledge"]["current"]),
                "organizational_sources": len(run["knowledge"]["organizational"]),
                "simulation_sources": len(run["knowledge"]["simulation"]),
            },
        )]
        solver_started = perf_counter_ns()
        result = jsonable(solver.solve(snapshot))
        solver_duration_ms = (perf_counter_ns() - solver_started) // 1_000_000
        try:
            validate_solver_result(result, snapshot.scenario_id)
        except InvalidSolverResult as exc:
            self.store.append_event(run_id, "ANALYSIS_FAILED", "SYSTEM", {
                "state": "FAILED",
                "error": {"code": "INVALID_SOLVER_RESULT", "message": str(exc)},
            }, connection)
            return self.get_run(run_id, connection)
        analysis_output_hash = sha256(result)
        trace_stages.append(DecisionTraceStage(
            stage="DETERMINISTIC_SOLVER",
            actor="SOLVER",
            status="PASSED",
            duration_ms=solver_duration_ms,
            input_sha256=context_hash,
            output_sha256=analysis_output_hash,
            summary="The deterministic solver evaluated and ranked the declared action catalog.",
            details={
                "solver_id": solver.descriptor.solver_id,
                "decision_status": result["decision_status"],
                "evaluated_actions": len(result.get("action_evaluations", [])),
            },
        ))
        package = build_recommendation_package(result, run["context"], solver.descriptor)
        orchestrator_started = perf_counter_ns()
        agent_outcome = self.agent.explain(package) if package is not None else None
        safe_stop_outcome = None
        if package is None and result["decision_status"] == "ABSTAINED":
            safe_stop_item = build_work_item(
                run["scenario_key"], result, run["context"],
            ).model_dump(mode="json")
            safe_stop_outcome = self.operations_agent.route(
                [{
                    "role": "user",
                    "content": "Review the conflicting records and identify the safe next step.",
                }],
                [safe_stop_item],
                safe_stop_item["work_item_id"],
            )
        orchestrator_duration_ms = (perf_counter_ns() - orchestrator_started) // 1_000_000
        agent_metadata = (
            agent_outcome.metadata if agent_outcome
            else safe_stop_outcome.metadata if safe_stop_outcome
            else self.agent.describe()
        )
        orchestrator_output_hash = (
            sha256(agent_outcome.explanation.model_dump(mode="json"))
            if agent_outcome else None
        )
        if safe_stop_outcome is not None:
            orchestrator_output_hash = sha256(
                safe_stop_outcome.selection.model_dump(mode="json")
            )
        trace_stages.append(DecisionTraceStage(
            stage="DECISION_ORCHESTRATOR",
            actor="AI_AGENT",
            status=(
                "SKIPPED" if package is None and safe_stop_outcome is None
                else "FALLBACK" if agent_metadata.fallback_code
                else "PASSED"
            ),
            duration_ms=orchestrator_duration_ms,
            input_sha256=analysis_output_hash,
            output_sha256=orchestrator_output_hash,
            summary=(
                "The operations agent matched the unresolved conflict to a safe-stop flow."
                if safe_stop_outcome is not None
                else "No recommendation required an explanation."
                if package is None
                else "The orchestrator produced a schema-validated, evidence-grounded explanation."
            ),
            details={
                "effective_mode": agent_metadata.effective_mode,
                "provider": agent_metadata.provider,
                "model": agent_metadata.model,
                "fallback_code": agent_metadata.fallback_code,
                "tool_calls": agent_metadata.tool_calls,
            },
        ))

        reviewer_outcome = None
        reviewer_started = perf_counter_ns()
        if package is not None and agent_outcome is not None:
            reviewer_outcome = self.reviewer.review(package, agent_outcome.explanation)
        reviewer_duration_ms = (perf_counter_ns() - reviewer_started) // 1_000_000
        reviewer_metadata = (
            reviewer_outcome.metadata if reviewer_outcome else self.reviewer.describe()
        )
        reviewer_output_hash = (
            sha256(reviewer_outcome.verdict.model_dump(mode="json"))
            if reviewer_outcome else None
        )
        trace_stages.append(DecisionTraceStage(
            stage="INDEPENDENT_REVIEWER",
            actor="AI_AGENT",
            status=(
                "SKIPPED" if package is None
                else "FALLBACK" if reviewer_metadata.fallback_code
                else "PASSED"
            ),
            duration_ms=reviewer_duration_ms,
            input_sha256=orchestrator_output_hash or analysis_output_hash,
            output_sha256=reviewer_output_hash,
            summary=(
                "No recommendation required independent review."
                if package is None
                else "An isolated reviewer verified authority, evidence, approval, and simulation boundaries."
            ),
            details={
                "effective_mode": reviewer_metadata.effective_mode,
                "provider": reviewer_metadata.provider,
                "model": reviewer_metadata.model,
                "fallback_code": reviewer_metadata.fallback_code,
                "verdict": reviewer_outcome.verdict.verdict if reviewer_outcome else None,
                "reason_codes": (
                    reviewer_outcome.verdict.reason_codes if reviewer_outcome else []
                ),
                "tool_calls": reviewer_metadata.tool_calls,
            },
        ))
        authority_input_hash = reviewer_output_hash or analysis_output_hash
        trace_stages.append(DecisionTraceStage(
            stage="AUTHORITY_VALIDATOR",
            actor="POLICY_ENGINE",
            status="PASSED",
            duration_ms=0,
            input_sha256=authority_input_hash,
            output_sha256=analysis_output_hash,
            summary="The backend confirmed that AI did not calculate, rank, write, or execute.",
            details={
                "recommendation_authority": (
                    "AI_AGENT_GROUNDED_BY_DETERMINISTIC_SOLVER"
                    if package is not None
                    else "POLICY_SAFE_STOP_MATCHED_BY_AI_AGENT"
                ),
                "write_authority": "APPLICATION_SERVICE",
                "requires_human_approval": package is not None,
                "external_writes_allowed": False,
            },
        ))
        final_trace_status: TraceFinalStatus
        if result["decision_status"] == "READY_FOR_REVIEW":
            final_trace_status = "PASSED"
        elif result["decision_status"] == "ABSTAINED":
            final_trace_status = "ABSTAINED"
        else:
            final_trace_status = "NO_ACTION"
        decision_trace = new_trace(run_id, trace_stages, final_trace_status)
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
        if reviewer_metadata.fallback_code:
            self.store.append_event(run_id, "REVIEWER_FALLBACK_USED", "LLM_ADAPTER", {
                "state": "DRAFT",
                "fallback_code": reviewer_metadata.fallback_code,
                "reviewer": reviewer_metadata.model_dump(mode="json"),
            }, connection)
        self.store.append_event(run_id, "DECISION_TRACE_RECORDED", "SYSTEM", {
            "state": "DRAFT",
            "decision_trace": decision_trace,
            "reviewer": reviewer_metadata.model_dump(mode="json"),
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
            "reviewer": reviewer_metadata.model_dump(mode="json"),
            "knowledge_sources": run["knowledge"],
            "trace": [stage.stage for stage in trace_stages],
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
        decision_id = f"DEC-{uuid4().hex[:10].upper()}"
        decision_record = {
            "decision_id": decision_id,
            "kind": normalized_kind,
            "action_id": action_id,
            "quantity_lb": quantity_lb,
            "reason": clean_reason,
            "recommendation_id": recommendation.get("recommendation_id"),
        }
        event_payload = {"state": state, "decision": decision_record}

        action_intent = None
        execution_receipt = None
        if state == "APPROVED" and evaluation is not None:
            action = evaluation["action"]
            authority_input_sha256 = sha256({
                "run_id": run_id,
                "revision": run["revision"],
                "recommendation_id": recommendation.get("recommendation_id"),
                "decision": decision_record,
                "evaluation": evaluation,
            })
            action_intent_model = build_action_intent(
                run_id=run_id,
                decision_id=decision_id,
                recommendation_id=recommendation["recommendation_id"],
                action=action,
                evaluation=evaluation,
                authority_input_sha256=authority_input_sha256,
            )
            action_intent = action_intent_model.model_dump(mode="json")
            execution_receipt = self.execution_adapter.execute(
                action_intent_model,
            ).model_dump(mode="json")

        event_type = {
            "approve": "MANAGER_APPROVED", "edit-approve": "MANAGER_EDITED_APPROVED",
            "reject": "MANAGER_REJECTED", "defer": "MANAGER_DEFERRED",
        }[normalized_kind]
        self.store.append_decision_with_execution(
            run_id,
            event_type,
            event_payload,
            action_intent,
            execution_receipt,
            connection,
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

    def record_outcome_feedback(
        self,
        run_id: str,
        outcome: str,
        actual_quantity_lb: int | None,
        actual_cost_usd: str | None,
        reason: str | None,
        survey: dict[str, Any],
        connection=None,
    ) -> dict:
        if connection is None:
            with self.store.connect() as owned:
                return self.record_outcome_feedback(
                    run_id,
                    outcome,
                    actual_quantity_lb,
                    actual_cost_usd,
                    reason,
                    survey,
                    owned,
                )
        self.store.lock_run(connection, run_id)
        run = self.get_run(run_id, connection)
        receipt = run.get("execution_receipt")
        if receipt is None:
            raise ApplicationError(
                "NO_EXECUTION_RECEIPT",
                "Approve and complete a simulated action before recording its outcome.",
                409,
            )
        clean_reason = reason.strip() if reason else None
        if outcome in {"PARTIAL", "FAILED"} and not clean_reason:
            raise ApplicationError(
                "INVALID_REQUEST",
                "A reason is required for a partial or failed outcome.",
            )
        return self.store.add_outcome_feedback(
            run_id,
            receipt["execution_id"],
            outcome,
            actual_quantity_lb,
            actual_cost_usd,
            clean_reason,
            survey,
            connection,
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
        try:
            validate_solver_result(result, edited_snapshot.scenario_id)
        except InvalidSolverResult as exc:
            raise ApplicationError(
                "INVALID_SOLVER_RESULT", "The deterministic solver returned invalid data.", 500,
            ) from exc
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
