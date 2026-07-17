from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from nourishops.application.decision_package import DecisionBrief


class CreateRunRequest(BaseModel):
    scenario_key: str = Field(
        default="scenario_a",
        min_length=10,
        max_length=72,
        pattern=r"^scenario_[a-z0-9][a-z0-9_-]*$",
    )
    parent_run_id: str | None = None


class OperationsAssistantMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class OperationsAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str | None = Field(default=None, min_length=1, max_length=1000)
    messages: list[OperationsAssistantMessage] = Field(default_factory=list, max_length=12)
    current_work_item_id: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def require_conversation(self) -> OperationsAssistantRequest:
        if not self.messages and not (self.message and self.message.strip()):
            raise ValueError("A user message is required")
        return self

    def conversation(self) -> list[dict[str, str]]:
        if self.messages:
            return [item.model_dump(mode="json") for item in self.messages]
        return [{"role": "user", "content": self.message.strip()}]  # type: ignore[union-attr]


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


class BlockerResolutionRequest(BaseModel):
    authoritative_source: Literal[
        "INBOUND_LEDGER",
        "USDA_NOTICE",
        "RECEIVING_NOTE",
    ]


class FeedbackRequest(BaseModel):
    rating: Literal["HELPFUL", "NOT_HELPFUL"]
    reason: str | None = Field(default=None, max_length=500)
    survey: dict[str, Any] = Field(default_factory=dict)


class OutcomeFeedbackRequest(BaseModel):
    outcome: Literal["SUCCESSFUL", "PARTIAL", "FAILED", "UNKNOWN"]
    actual_quantity_lb: int | None = Field(default=None, ge=0)
    actual_cost_usd: Decimal | None = Field(default=None, ge=0)
    reason: str | None = Field(default=None, max_length=500)
    survey: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def require_failure_reason(self) -> OutcomeFeedbackRequest:
        if self.outcome in {"PARTIAL", "FAILED"} and not (
            self.reason and self.reason.strip()
        ):
            raise ValueError("A reason is required for a partial or failed outcome")
        return self


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
