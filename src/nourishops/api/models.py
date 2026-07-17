from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from nourishops.application.decision_package import DecisionBrief


class CreateRunRequest(BaseModel):
    scenario_key: str = Field(
        default="scenario_a",
        min_length=10,
        max_length=72,
        pattern=r"^scenario_[a-z0-9][a-z0-9_-]*$",
    )
    parent_run_id: str | None = None


class DecisionRequest(BaseModel):
    kind: Literal["approve", "edit-approve", "reject", "defer"]
    recommendation_id: str = Field(pattern=r"^REC-[A-Z0-9_-]+$")
    expected_revision: int = Field(ge=0)
    action_id: str
    quantity_lb: int = Field(ge=0)
    reason: str | None = Field(default=None, max_length=500)


class ActionPreviewRequest(BaseModel):
    recommendation_id: str = Field(pattern=r"^REC-[A-Z0-9_-]+$")
    expected_revision: int = Field(ge=0)
    action_id: str
    quantity_lb: int = Field(ge=0)


class FeedbackRequest(BaseModel):
    rating: Literal["HELPFUL", "NOT_HELPFUL"]
    reason: str | None = Field(default=None, max_length=500)
    survey: dict[str, Any] = Field(default_factory=dict)


class ResponseMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_id: str
    generated_at_utc: str
    synthetic: Literal[True]
    agent_mode: str
    agent_status: str
    agent_provider: str | None
    agent_model: str | None
    build_id: str
    source_mode: str


class DecisionBriefEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: DecisionBrief
    meta: ResponseMeta
