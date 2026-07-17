from __future__ import annotations

import json

import pytest

from nourishops.application.decisioning import (
    CatalogEnumerationSolver,
    SolverDescriptor,
    SolverRegistry,
    UnsupportedDecisionProblem,
)
from nourishops.application.loader import FIXTURES, load_scenario, load_scenario_from_documents
from nourishops.application.scenario_registry import ScenarioRegistry


def test_versioned_package_declares_all_frozen_scenarios_and_inputs() -> None:
    registry = ScenarioRegistry.load()
    package = registry.get("scenario_b")

    assert package.package_id == "frozen-a-e"
    assert package.problem_type == "SINGLE_ACTION_CATALOG"
    assert package.solver_id == "catalog-enumeration"
    assert package.normalizer_id == "nourishops-snapshot-v1"
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


def test_runtime_rejects_unknown_overlay_references() -> None:
    documents = scenario_b_documents()
    overlay = json.loads(documents["scenarios/scenario_b.json"])
    overlay["active_evidence_ids"].append("EVD-B-UNKNOWN")
    documents["scenarios/scenario_b.json"] = json.dumps(overlay)

    with pytest.raises(ValueError, match="active_evidence_ids contains unknown IDs"):
        load_scenario_from_documents(documents, "scenario_b")
