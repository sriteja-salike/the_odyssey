"""Transparent stage records for a decision run, without model chain-of-thought."""
from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class DecisionTraceStage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stage: Literal[
        "CONTEXT_FROZEN",
        "DETERMINISTIC_SOLVER",
        "DECISION_ORCHESTRATOR",
        "INDEPENDENT_REVIEWER",
        "AUTHORITY_VALIDATOR",
    ]
    actor: Literal["CONTEXT_LAYER", "SOLVER", "AI_AGENT", "POLICY_ENGINE"]
    status: Literal["PASSED", "FALLBACK", "SKIPPED"]
    duration_ms: int = Field(ge=0)
    input_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    output_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    summary: str = Field(min_length=1, max_length=240)
    details: dict[str, Any] = Field(default_factory=dict)


TraceFinalStatus = Literal["PASSED", "ABSTAINED", "NO_ACTION", "FAILED"]


class DecisionTrace(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["decision-trace/1.0.0"] = "decision-trace/1.0.0"
    trace_id: str = Field(pattern=r"^TRC-[A-Z0-9]+$")
    run_id: str
    exposes_chain_of_thought: Literal[False] = False
    stages: list[DecisionTraceStage] = Field(min_length=3, max_length=5)
    final_status: TraceFinalStatus


def new_trace(
    run_id: str,
    stages: list[DecisionTraceStage],
    final_status: TraceFinalStatus,
) -> dict:
    return DecisionTrace(
        trace_id=f"TRC-{uuid4().hex[:10].upper()}",
        run_id=run_id,
        stages=stages,
        final_status=final_status,
    ).model_dump(mode="json")
