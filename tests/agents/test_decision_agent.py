from __future__ import annotations

from typing import Any

import pytest
from pydantic import ValidationError
from pydantic_ai import (
    ModelHTTPError,
    ModelResponse,
    ToolCallPart,
    UnexpectedModelBehavior,
    models,
)
from pydantic_ai.models.function import AgentInfo, FunctionModel

from nourishops.agents.contracts import (
    AgentAuthorityError,
    AgentExplanation,
    AgentMetadata,
)
from nourishops.agents.live import PydanticAIDecisionAgent, validate_explanation
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.agents.runtime import ResilientDecisionAgent
from nourishops.agents.reviewer import (
    REVIEW_REASON_CODES,
    OfflineDecisionReviewer,
    PydanticAIDecisionReviewer,
)
from nourishops.application.context import build_scenario_context
from nourishops.application.decision_package import build_recommendation_package
from nourishops.application.decisioning import CatalogEnumerationSolver
from nourishops.application.loader import FIXTURES, load_scenario
from nourishops.persistence.postgres import SOURCE_MAP, jsonable, sha256

models.ALLOW_MODEL_REQUESTS = False


def scenario_b_package() -> dict[str, Any]:
    scenario_key = "scenario_b"
    names = [*SOURCE_MAP, f"scenarios/{scenario_key}.json"]
    documents = {name: (FIXTURES / name).read_text() for name in names}
    context = jsonable(build_scenario_context(documents, scenario_key))
    snapshot = load_scenario(scenario_key)
    solver = CatalogEnumerationSolver()
    analysis = jsonable(solver.solve(snapshot))
    package = build_recommendation_package(analysis, context, solver.descriptor)
    assert package is not None
    return package


def valid_live_output(package: dict[str, Any]) -> dict[str, Any]:
    return {
        "recommendation_id": package["recommendation"]["recommendation_id"],
        "headline": package["selected_action"]["display_name"],
        "why_now": "The verified short life capacity risk is active.",
        "why_this_action": "This is the selected feasible catalog action.",
        "uncertainty": "The outcome is simulated and requires manager approval.",
        "why_not": [],
        "evidence_ids": package["selected_action"]["evidence_ids"],
        "requires_human_approval": True,
        "simulation_only": True,
    }


def function_model(package: dict[str, Any], output: dict[str, Any]) -> FunctionModel:
    def respond(messages, info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart(
                info.function_tools[0].name,
                {"recommendation_id": package["recommendation"]["recommendation_id"]},
            )])
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output)])

    return FunctionModel(respond)


def test_offline_agent_builds_grounded_scenario_b_explanation() -> None:
    package = scenario_b_package()
    before = sha256(package)
    outcome = OfflineDecisionAgent().explain(package)

    assert outcome.explanation.recommendation_id == "REC-B-001"
    assert outcome.explanation.evidence_ids == ["EVD-B-PRODUCE-OFFER"]
    assert outcome.metadata.effective_mode == "offline"
    assert sha256(package) == before


def test_anthropic_and_openai_share_the_same_typed_agent_path() -> None:
    package = scenario_b_package()
    output = valid_live_output(package)

    for provider in ("anthropic", "openai"):
        agent = PydanticAIDecisionAgent(
            model_name=f"{provider}:test-model",
            provider=provider,
            request_timeout_seconds=1,
            deadline_seconds=2,
            max_retries=0,
            model=function_model(package, output),
        )
        outcome = agent.explain(package)
        assert outcome.explanation.recommendation_id == "REC-B-001"
        assert outcome.metadata.provider == provider
        assert outcome.metadata.tool_calls == ["get_recommendation_package"]


def test_independent_reviewer_has_a_separate_read_only_tool_path() -> None:
    package = scenario_b_package()
    explanation = OfflineDecisionAgent().explain(package).explanation
    review_output = {
        "recommendation_id": package["recommendation"]["recommendation_id"],
        "verdict": "PASS",
        "reason_codes": REVIEW_REASON_CODES,
        "requires_human_approval": True,
        "simulation_only": True,
    }

    def respond(messages, info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart(
                info.function_tools[0].name,
                {"recommendation_id": package["recommendation"]["recommendation_id"]},
            )])
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, review_output)])

    reviewer = PydanticAIDecisionReviewer(
        model_name="anthropic:test-model",
        provider="anthropic",
        request_timeout_seconds=1,
        deadline_seconds=2,
        model=FunctionModel(respond),
    )
    outcome = reviewer.review(package, explanation)

    assert outcome.verdict.verdict == "PASS"
    assert outcome.verdict.reason_codes == REVIEW_REASON_CODES
    assert outcome.metadata.role == "INDEPENDENT_REVIEWER"
    assert outcome.metadata.tool_calls == ["get_review_material"]


def test_offline_reviewer_revalidates_the_explanation() -> None:
    package = scenario_b_package()
    explanation = OfflineDecisionAgent().explain(package).explanation
    outcome = OfflineDecisionReviewer().review(package, explanation)

    assert outcome.verdict.recommendation_id == "REC-B-001"
    assert outcome.metadata.effective_mode == "offline"


def test_agent_output_with_invented_number_is_rejected() -> None:
    package = scenario_b_package()
    with pytest.raises((ValidationError, AgentAuthorityError)):
        explanation = AgentExplanation.model_validate({
            **valid_live_output(package),
            "why_this_action": "Invented claim: 999999 lb.",
        })
        validate_explanation(explanation, package, ["get_recommendation_package"])


@pytest.mark.parametrize("claim", [
    "Invented scientific claim: 1e99 lb.",
    "Invented word-form claim: ninety million lb.",
    "Invented attribution: cost one dollar.",
    "The modeled cost is 1 dollars.",
    "Choose ACTION-FAKE instead.",
    "We already contacted the donor and submitted the request.",
    "The supplier was emailed about the plan.",
    "There are ninety new suppliers.",
    "Children will receive fresh food.",
])
def test_agent_output_cannot_add_numbers_ids_or_execution_claims(claim: str) -> None:
    package = scenario_b_package()
    with pytest.raises((ValidationError, AgentAuthorityError)):
        explanation = AgentExplanation.model_validate({
            **valid_live_output(package),
            "why_this_action": claim,
        })
        validate_explanation(explanation, package, ["get_recommendation_package"])


def test_agent_output_requires_exact_headline_and_selected_evidence() -> None:
    package = scenario_b_package()
    for update in (
        {"headline": "A different action"},
        {"evidence_ids": ["EVD-B-CAPACITY-NOTE"]},
    ):
        explanation = AgentExplanation.model_validate({
            **valid_live_output(package),
            **update,
        })
        with pytest.raises(AgentAuthorityError):
            validate_explanation(explanation, package, ["get_recommendation_package"])


def test_even_true_freeform_fact_is_rejected_outside_grounded_templates() -> None:
    package = scenario_b_package()
    explanation = AgentExplanation.model_validate({
        **valid_live_output(package),
        "why_now": "The verified offer has five days of usable life.",
    })
    with pytest.raises(AgentAuthorityError, match="unverified narrative"):
        validate_explanation(explanation, package, ["get_recommendation_package"])


def test_agent_output_rejects_blank_fields_and_more_than_120_words() -> None:
    package = scenario_b_package()
    with pytest.raises(ValidationError):
        AgentExplanation.model_validate({**valid_live_output(package), "why_now": "   "})
    with pytest.raises(ValidationError):
        AgentExplanation.model_validate({
            **valid_live_output(package),
            "why_now": "word " * 121,
        })


def test_one_shared_retry_repairs_invalid_structured_output() -> None:
    package = scenario_b_package()
    valid = valid_live_output(package)
    output_calls = 0

    def respond(messages, info: AgentInfo) -> ModelResponse:
        nonlocal output_calls
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart(
                info.function_tools[0].name,
                {"recommendation_id": package["recommendation"]["recommendation_id"]},
            )])
        output_calls += 1
        output = valid if output_calls == 2 else {**valid, "simulation_only": False}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output)])

    agent = PydanticAIDecisionAgent(
        model_name="anthropic:test-model",
        provider="anthropic",
        request_timeout_seconds=1,
        deadline_seconds=2,
        max_retries=1,
        model=FunctionModel(respond),
    )
    outcome = agent.explain(package)
    assert output_calls == 2
    assert outcome.metadata.status == "live_verified"


class RaisingAgent:
    def __init__(self, exc: Exception):
        self.exc = exc

    def describe(self) -> AgentMetadata:
        return AgentMetadata(
            requested_mode="live",
            effective_mode="live",
            status="live_configured",
            provider="anthropic",
            model="test-model",
        )

    def explain(self, _package):
        raise self.exc


@pytest.mark.parametrize(("exc", "expected_code"), [
    (TimeoutError(), "AGENT_TIMEOUT_FALLBACK"),
    (AgentAuthorityError(), "AGENT_AUTHORITY_VIOLATION_FALLBACK"),
    (UnexpectedModelBehavior("bad output"), "AGENT_OUTPUT_INVALID_FALLBACK"),
    (
        ModelHTTPError(503, "test-model", None),
        "AGENT_PROVIDER_UNAVAILABLE_FALLBACK",
    ),
    (RuntimeError("adapter defect"), "AGENT_INTERNAL_ERROR_FALLBACK"),
])
def test_live_failures_fall_back_with_specific_status(
    exc: Exception, expected_code: str,
) -> None:
    agent = ResilientDecisionAgent(
        requested_mode="live",
        primary=RaisingAgent(exc),
        fallback=OfflineDecisionAgent(),
    )
    outcome = agent.explain(scenario_b_package())
    assert outcome.metadata.effective_mode == "offline_fallback"
    assert outcome.metadata.fallback_code == expected_code
