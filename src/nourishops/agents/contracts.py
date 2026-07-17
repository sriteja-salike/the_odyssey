"""Closed provider-neutral contracts for recommendation explanations."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, Any, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Headline = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
Narrative = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=700,
        pattern=r"^[^0-9]*$",
    ),
]
ShortNarrative = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=700,
        pattern=r"^[^0-9]*$",
    ),
]
RecommendationId = Annotated[str, Field(pattern=r"^REC-[A-Z0-9_-]+$")]
EvaluationId = Annotated[str, Field(pattern=r"^EVAL-[A-Z0-9_-]+$")]
EvidenceId = Annotated[str, Field(pattern=r"^EVD-[A-Z0-9_-]+$")]


class WhyNotExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evaluated_action_id: EvaluationId
    explanation: ShortNarrative


class AgentExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recommendation_id: RecommendationId
    headline: Headline
    why_now: Narrative
    why_this_action: Narrative
    uncertainty: ShortNarrative
    why_not: list[WhyNotExplanation] = Field(default_factory=list, max_length=6)
    evidence_ids: list[EvidenceId] = Field(min_length=1, max_length=20)
    requires_human_approval: Literal[True]
    simulation_only: Literal[True]

    @model_validator(mode="after")
    def primary_view_word_limit(self) -> AgentExplanation:
        prose = " ".join([
            self.headline,
            self.why_now,
            self.why_this_action,
            self.uncertainty,
            *(item.explanation for item in self.why_not),
        ])
        if len(prose.split()) > 120:
            raise ValueError("Agent explanation exceeds the 120-word primary-view limit")
        return self


class AgentMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requested_mode: Literal["offline", "live"]
    effective_mode: Literal["offline", "live", "offline_fallback"]
    status: Literal["verified", "live_configured", "live_verified", "fallback"]
    role: Literal["DECISION_ORCHESTRATOR", "INDEPENDENT_REVIEWER"] = (
        "DECISION_ORCHESTRATOR"
    )
    provider: str | None = None
    model: str | None = None
    prompt_version: str = "agent-system/1.0.0"
    output_schema_version: str = "agent-output/1.0.0"
    tool_contract_version: str = "agent-tools/1.0.0"
    tool_calls: list[str] = Field(default_factory=list)
    fallback_code: str | None = None


@dataclass(frozen=True)
class AgentOutcome:
    explanation: AgentExplanation
    metadata: AgentMetadata


class DecisionAgent(Protocol):
    def explain(self, package: dict[str, Any]) -> AgentOutcome: ...

    def describe(self) -> AgentMetadata: ...


ReviewReason = Literal[
    "DETERMINISTIC_RECOMMENDATION_UNCHANGED",
    "EVIDENCE_IDS_VALID",
    "NO_EXECUTION_CLAIM",
    "HUMAN_APPROVAL_REQUIRED",
    "SIMULATION_ONLY",
]


class ReviewVerdict(BaseModel):
    """Closed reviewer output; it records checks and never changes the decision."""

    model_config = ConfigDict(extra="forbid")

    recommendation_id: RecommendationId
    verdict: Literal["PASS"]
    reason_codes: list[ReviewReason] = Field(min_length=5, max_length=5)
    requires_human_approval: Literal[True]
    simulation_only: Literal[True]


@dataclass(frozen=True)
class ReviewerOutcome:
    verdict: ReviewVerdict
    metadata: AgentMetadata


class DecisionReviewer(Protocol):
    def review(
        self, package: dict[str, Any], explanation: AgentExplanation,
    ) -> ReviewerOutcome: ...

    def describe(self) -> AgentMetadata: ...


class AgentAuthorityError(RuntimeError):
    pass


def grounded_primary_narrative(package: dict[str, Any]) -> dict[str, str]:
    """Backend-authored prose choices; live models may copy but never invent them."""
    risk_type = package["primary_risk"]["risk_type"].replace("_", " ").lower()
    return {
        "why_now": f"The verified {risk_type} risk is active.",
        "why_this_action": "This is the selected feasible catalog action.",
        "uncertainty": "The outcome is simulated and requires manager approval.",
    }


def grounded_why_not_narrative(package: dict[str, Any]) -> dict[str, str]:
    grounded = {
        item["evaluated_action_id"]: (
            "This option is feasible but ranks below the selected catalog action "
            "under the verified scoring rules."
        )
        for item in package["alternatives"]
    }
    for item in package["rejected_options"]:
        failures = ", ".join(item["failed_constraints"]) or "a hard constraint"
        grounded[item["evaluated_action_id"]] = (
            f"This option is not feasible because it fails {failures}."
        )
    return grounded
