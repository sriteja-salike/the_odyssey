"""Stable frontend decision contract built from authoritative engine output."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from nourishops.agents.contracts import AgentExplanation, AgentMetadata, AgentOutcome
from nourishops.application.decisioning import SolverDescriptor


class SolverView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    solver_id: str
    method: str
    version: str
    deterministic: bool
    problem_types: list[str]
    capabilities: list[str]
    limitations: list[str]


class RiskView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    risk_id: str
    risk_type: str
    category_id: str | None = None
    priority_score: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class ActionView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evaluated_action_id: str
    action_id: str
    display_name: str
    action_type: str
    category_id: str | None
    requested_quantity_lb: int
    cost_usd: str
    feasible: bool
    rank: int | None
    score: str | None
    failed_constraints: list[str]
    failed_detail: list[dict[str, Any]]
    evidence_ids: list[str]


class RecommendationView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recommendation_id: str
    risk_id: str
    action: ActionView
    confidence_label: str
    confidence_value: str
    requires_human_approval: Literal[True]


class EvidenceView(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_id: str
    source_kind: str
    trust_level: str
    title: str
    summary: str
    structured_facts: list[dict[str, Any]]
    record_version: int


class ApprovalContract(BaseModel):
    model_config = ConfigDict(extra="forbid")

    required: bool
    allowed_commands: list[str]
    editable: bool
    minimum_quantity_lb: int | None = None
    maximum_quantity_lb: int | None = None
    quantity_increment_lb: int | None = None
    external_writes_allowed: Literal[False]


class DecisionBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["decision-brief/1.0.0"]
    run_id: str
    scenario_id: str
    scenario_name: str
    decision_status: str
    status_message: str
    analysis_output_hash: str
    solver: SolverView
    primary_risk: RiskView | None
    recommendation: RecommendationView | None
    rationale: AgentExplanation | None
    alternatives: list[ActionView]
    rejected_options: list[ActionView]
    blocking_issues: list[dict[str, Any]]
    evidence: list[EvidenceView]
    approval: ApprovalContract
    agent: AgentMetadata
    synthetic: Literal[True]


def _integer(value: Any) -> int:
    return int(Decimal(str(value)))


def _risk_view(risk: dict[str, Any] | None) -> RiskView | None:
    if risk is None:
        return None
    common = {"risk_id", "risk_type", "category_id", "priority_score", "is_primary"}
    return RiskView(
        risk_id=risk["risk_id"],
        risk_type=risk["risk_type"],
        category_id=risk.get("category_id"),
        priority_score=risk.get("priority_score"),
        details={key: value for key, value in risk.items() if key not in common},
    )


def _action_view(
    evaluation: dict[str, Any], catalog_by_id: dict[str, dict[str, Any]],
) -> ActionView:
    action = evaluation["action"]
    catalog = catalog_by_id.get(action["action_id"], {})
    return ActionView(
        evaluated_action_id=evaluation["evaluated_action_id"],
        action_id=action["action_id"],
        display_name=catalog.get("display_name", action["action_id"]),
        action_type=action["action_type"],
        category_id=action.get("category_id"),
        requested_quantity_lb=_integer(action["requested_lb"]),
        cost_usd=evaluation["cost_usd"],
        feasible=evaluation["feasible"],
        rank=evaluation.get("rank"),
        score=evaluation.get("score"),
        failed_constraints=evaluation.get("failed_codes") or [],
        failed_detail=evaluation.get("failed_detail") or [],
        evidence_ids=list(action.get("evidence_ids") or []),
    )


def build_recommendation_package(
    analysis: dict[str, Any], context: dict[str, Any], solver: SolverDescriptor,
) -> dict[str, Any] | None:
    recommendation = analysis.get("recommended_action")
    if recommendation is None:
        return None

    catalog = context["organizational_knowledge"]["action_catalog"]
    catalog_by_id = {item["action_id"]: item for item in catalog}
    evaluations = analysis.get("action_evaluations") or []
    selected_evaluation = next(
        item for item in evaluations
        if item["evaluated_action_id"] == recommendation["evaluated_action_id"]
    )
    selected = _action_view(selected_evaluation, catalog_by_id)
    alternatives = sorted(
        (
            _action_view(item, catalog_by_id)
            for item in evaluations
            if item["feasible"] and item["evaluated_action_id"] != selected.evaluated_action_id
        ),
        key=lambda item: item.rank or 10_000,
    )
    rejected = [
        _action_view(item, catalog_by_id)
        for item in evaluations if not item["feasible"]
    ]
    risks = analysis.get("risks") or []
    primary_risk = next((item for item in risks if item.get("is_primary")), risks[0] if risks else None)
    evidence = [
        EvidenceView(
            evidence_id=item["evidence_id"],
            source_kind=item["source_kind"],
            trust_level=item["trust_level"],
            title=item["title"],
            summary=item["body"],
            structured_facts=item.get("structured_facts") or [],
            record_version=item["record_version"],
        )
        for item in context["organizational_knowledge"]["active_evidence"]
    ]
    return {
        "schema_version": "recommendation-package/1.0.0",
        "scenario": context["scenario"],
        "primary_risk": primary_risk,
        "recommendation": {
            "recommendation_id": recommendation["recommendation_id"],
            "risk_id": recommendation["risk_id"],
            "confidence": {
                "label": recommendation["confidence"],
                "value": recommendation["confidence_value"],
                "inputs": recommendation["inputs"],
            },
        },
        "selected_action": selected.model_dump(mode="json"),
        "alternatives": [item.model_dump(mode="json") for item in alternatives],
        "rejected_options": [item.model_dump(mode="json") for item in rejected],
        "evidence": [item.model_dump(mode="json") for item in evidence],
        "solver": solver.as_dict(),
        "requires_human_approval": True,
        "simulation_only": True,
    }


def build_decision_brief(
    run_id: str,
    analysis: dict[str, Any],
    context: dict[str, Any],
    solver: SolverDescriptor,
    analysis_output_hash: str,
    agent_metadata: AgentMetadata,
    agent_outcome: AgentOutcome | None,
) -> DecisionBrief:
    package = build_recommendation_package(analysis, context, solver)
    catalog_by_id = {
        item["action_id"]: item
        for item in context["organizational_knowledge"]["action_catalog"]
    }
    evaluations = analysis.get("action_evaluations") or []
    actions = [_action_view(item, catalog_by_id) for item in evaluations]
    alternatives = sorted(
        (item for item in actions if item.feasible and item.rank != 1),
        key=lambda item: item.rank or 10_000,
    )
    rejected = [item for item in actions if not item.feasible]
    risks = analysis.get("risks") or []
    primary_risk = next((item for item in risks if item.get("is_primary")), risks[0] if risks else None)
    evidence = [
        EvidenceView(
            evidence_id=item["evidence_id"],
            source_kind=item["source_kind"],
            trust_level=item["trust_level"],
            title=item["title"],
            summary=item["body"],
            structured_facts=item.get("structured_facts") or [],
            record_version=item["record_version"],
        )
        for item in context["organizational_knowledge"]["active_evidence"]
    ]

    recommendation_view = None
    approval = ApprovalContract(
        required=False,
        allowed_commands=[],
        editable=False,
        external_writes_allowed=False,
    )
    if package is not None:
        recommendation = analysis["recommended_action"]
        selected = ActionView.model_validate(package["selected_action"])
        recommendation_view = RecommendationView(
            recommendation_id=recommendation["recommendation_id"],
            risk_id=recommendation["risk_id"],
            action=selected,
            confidence_label=recommendation["confidence"],
            confidence_value=recommendation["confidence_value"],
            requires_human_approval=True,
        )
        catalog = catalog_by_id[selected.action_id]
        approval = ApprovalContract(
            required=True,
            allowed_commands=["APPROVE", "EDIT_AND_APPROVE", "REJECT", "DEFER"],
            editable=(
                _integer(catalog["minimum_quantity_lb"])
                != _integer(catalog["maximum_quantity_lb"])
            ),
            minimum_quantity_lb=_integer(catalog["minimum_quantity_lb"]),
            maximum_quantity_lb=_integer(catalog["maximum_quantity_lb"]),
            quantity_increment_lb=_integer(catalog["quantity_increment_lb"]),
            external_writes_allowed=False,
        )

    status = analysis["decision_status"]
    status_message = {
        "READY_FOR_REVIEW": "A verified recommendation is ready for manager review.",
        "ABSTAINED": "No recommendation was produced because decision-critical facts are unresolved.",
        "NO_ACTION_REQUIRED": "No actionable risk requires a recommendation.",
    }.get(status, "The decision analysis completed without an actionable recommendation.")

    return DecisionBrief(
        schema_version="decision-brief/1.0.0",
        run_id=run_id,
        scenario_id=context["scenario"]["scenario_id"],
        scenario_name=context["scenario"]["display_name"],
        decision_status=status,
        status_message=status_message,
        analysis_output_hash=analysis_output_hash,
        solver=SolverView.model_validate(solver.as_dict()),
        primary_risk=_risk_view(primary_risk),
        recommendation=recommendation_view,
        rationale=agent_outcome.explanation if agent_outcome else None,
        alternatives=alternatives,
        rejected_options=rejected,
        blocking_issues=analysis.get("blocking_issues") or [],
        evidence=evidence,
        approval=approval,
        agent=agent_outcome.metadata if agent_outcome else agent_metadata,
        synthetic=True,
    )
