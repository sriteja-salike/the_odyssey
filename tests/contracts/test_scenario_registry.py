from __future__ import annotations

import json

import pytest

from nourishops.application.context import ContextBuilderRegistry
from nourishops.application.decisioning import (
    CatalogEnumerationSolver,
    SolverDescriptor,
    SolverRegistry,
    UnsupportedDecisionProblem,
    InvalidSolverResult,
    validate_solver_result,
)
from nourishops.application.loader import (
    FIXTURES,
    load_scenario,
    load_scenario_from_documents,
    snapshot_schema_documents,
)
from nourishops.application.scenario_registry import ScenarioRegistry
from nourishops.application.service import ApplicationError, NourishOpsService


def test_versioned_package_declares_all_frozen_scenarios_and_inputs() -> None:
    registry = ScenarioRegistry.load()
    package = registry.get("scenario_b")

    assert package.package_id == "frozen-a-e"
    assert package.problem_type == "SINGLE_ACTION_CATALOG"
    assert package.solver_id == "catalog-enumeration"
    assert package.normalizer_id == "nourishops-snapshot-v1"
    assert package.context_builder_id == "nourishops-decision-context-v1"
    assert package.document_ids("scenario_b")[-1] == "scenarios/scenario_b.json"
    assert set(package.scenario_keys) == {
        "scenario_a", "scenario_b", "scenario_c", "scenario_d", "scenario_e",
    }
    assert {item.document_id for item in package.source_inputs} == {
        "category_policies.json",
        "warehouse.json",
        "historical_weekly_category_flow.json",
        "planned_inbound.json",
        "candidate_actions.json",
        "pending_donation_offers.json",
        "evidence_records.json",
    }


def test_duplicate_scenario_ownership_fails_closed() -> None:
    package = ScenarioRegistry.load().get("scenario_a")
    duplicate = package.model_copy(update={"package_id": "duplicate-package"})
    with pytest.raises(ValueError, match="multiple packages"):
        ScenarioRegistry([package, duplicate])


def test_context_builder_is_an_explicit_closed_extension_seam() -> None:
    registry = ContextBuilderRegistry({
        "test-context-v1": lambda _documents, scenario_key: {"scenario": scenario_key},
    })

    assert registry.build("test-context-v1", {}, "scenario_test") == {
        "scenario": "scenario_test",
    }
    with pytest.raises(RuntimeError, match="Unsupported context builder"):
        registry.build("unknown-context", {}, "scenario_test")


class PortfolioTestSolver:
    descriptor = SolverDescriptor(
        solver_id="portfolio-test",
        method="TEST_ONLY",
        version="test/1",
        deterministic=True,
        problem_types=("PORTFOLIO_ALLOCATION",),
        capabilities=("MULTI_ACTION_PLAN",),
        limitations=(),
    )

    def supports(self, problem_type, _snapshot) -> bool:
        return problem_type == "PORTFOLIO_ALLOCATION"

    def solve(self, _snapshot):
        return {"decision_status": "NO_ACTION_REQUIRED"}


def test_solver_selection_uses_explicit_problem_type_and_solver_id() -> None:
    snapshot = load_scenario("scenario_a")
    registry = SolverRegistry([CatalogEnumerationSolver(), PortfolioTestSolver()])

    selected = registry.select(snapshot, "PORTFOLIO_ALLOCATION", "portfolio-test")
    assert selected.descriptor.solver_id == "portfolio-test"
    with pytest.raises(UnsupportedDecisionProblem):
        registry.select(snapshot, "ROUTE_OPTIMIZATION", "missing-solver")


def test_solver_ids_are_unique_and_results_are_typed() -> None:
    with pytest.raises(ValueError, match="unique"):
        SolverRegistry([CatalogEnumerationSolver(), CatalogEnumerationSolver()])
    with pytest.raises(InvalidSolverResult):
        validate_solver_result({"decision_status": "READY_FOR_REVIEW"}, "SCN-A")


def scenario_b_documents() -> dict[str, str]:
    package = ScenarioRegistry.load().get("scenario_b")
    return {
        document_id: (FIXTURES / document_id).read_text()
        for document_id in package.document_ids("scenario_b")
    }


def test_runtime_validates_supporting_documents() -> None:
    documents = scenario_b_documents()
    evidence = json.loads(documents["evidence_records.json"])
    del evidence["records"][0]["body"]
    documents["evidence_records.json"] = json.dumps(evidence)

    with pytest.raises(ValueError, match="evidence_records.schema.json"):
        load_scenario_from_documents(documents, "scenario_b")


def test_runtime_uses_package_declared_source_schemas() -> None:
    documents = scenario_b_documents()
    package = ScenarioRegistry.load().get("scenario_b")
    source_schema_map = {
        item.document_id: (
            "scenario_overlay.schema.json"
            if item.document_id == "warehouse.json"
            else item.schema_name
        )
        for item in package.source_inputs
    }
    schema_documents = snapshot_schema_documents({
        *source_schema_map.values(), package.overlay.schema_name,
    })

    with pytest.raises(ValueError, match="scenario_overlay.schema.json"):
        load_scenario_from_documents(
            documents,
            "scenario_b",
            source_schema_map=source_schema_map,
            schema_documents=schema_documents,
        )


def test_runtime_rejects_unknown_overlay_references() -> None:
    documents = scenario_b_documents()
    overlay = json.loads(documents["scenarios/scenario_b.json"])
    overlay["active_evidence_ids"].append("EVD-B-UNKNOWN")
    documents["scenarios/scenario_b.json"] = json.dumps(overlay)

    with pytest.raises(ValueError, match="active_evidence_ids contains unknown IDs"):
        load_scenario_from_documents(documents, "scenario_b")


def test_invalid_known_scenario_is_not_reported_as_missing() -> None:
    class BrokenStore:
        scenario_registry = ScenarioRegistry.load()

        def create_run(self, *_args, **_kwargs):
            raise ValueError("invalid source contract")

    service = NourishOpsService(BrokenStore())  # type: ignore[arg-type]
    with pytest.raises(ApplicationError) as raised:
        service.create_run("scenario_a", connection=object())
    assert raised.value.code == "SCENARIO_CONTRACT_INVALID"
    assert raised.value.status_code == 500
