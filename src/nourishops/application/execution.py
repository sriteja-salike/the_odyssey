"""Typed, approval-gated action intent and simulated execution contracts."""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class ActionIntent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["action-intent/1.0.0"] = "action-intent/1.0.0"
    action_intent_id: str = Field(pattern=r"^INT-[A-Z0-9]+$")
    run_id: str
    decision_id: str = Field(pattern=r"^DEC-[A-Z0-9]+$")
    recommendation_id: str = Field(pattern=r"^REC-[A-Z0-9_-]+$")
    action_id: str
    action_type: str
    execution_type: str
    adapter_id: Literal["simulated-operations-v1"] = "simulated-operations-v1"
    mode: Literal["SIMULATED"] = "SIMULATED"
    quantity_lb: int = Field(ge=0)
    cost_usd: str
    arrival_week_start: str | None = None
    requires_human_approval: Literal[True] = True
    approved_by: Literal["MANAGER_UI"] = "MANAGER_UI"
    external_write_allowed: Literal[False] = False
    authority_input_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    created_at_utc: str


class ExecutionReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["execution-receipt/1.0.0"] = "execution-receipt/1.0.0"
    execution_id: str = Field(pattern=r"^SIM-[A-Z0-9]+$")
    action_intent_id: str = Field(pattern=r"^INT-[A-Z0-9]+$")
    run_id: str
    action_id: str
    execution_type: str
    adapter_id: Literal["simulated-operations-v1"] = "simulated-operations-v1"
    mode: Literal["SIMULATED"] = "SIMULATED"
    status: Literal["SIMULATED_COMPLETED"] = "SIMULATED_COMPLETED"
    target_system: Literal["Synthetic operations gateway"] = (
        "Synthetic operations gateway"
    )
    quantity_lb: int = Field(ge=0)
    cost_usd: str
    arrival_week_start: str | None = None
    request_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    external_write_performed: Literal[False] = False
    completed_at_utc: str


def execution_type_for(action_type: str) -> str:
    return {
        "PURCHASE": "PURCHASE_ORDER_REQUEST",
        "REQUEST_TRANSFER": "PEER_TRANSFER_REQUEST",
        "TARGETED_DONOR_REQUEST": "DONOR_OUTREACH_REQUEST",
        "ACCEPT_DONATION": "DONATION_ACCEPTANCE_REQUEST",
        "PARTIAL_ACCEPT": "PARTIAL_DONATION_ACCEPTANCE_REQUEST",
        "REDIRECT_DONATION": "DONATION_REDIRECT_REQUEST",
        "ACCELERATE_DISTRIBUTION": "DISTRIBUTION_TASK_REQUEST",
    }.get(action_type, "OPERATIONS_TASK_REQUEST")


def build_action_intent(
    *,
    run_id: str,
    decision_id: str,
    recommendation_id: str,
    action: dict,
    evaluation: dict,
    authority_input_sha256: str,
) -> ActionIntent:
    return ActionIntent(
        action_intent_id=f"INT-{uuid4().hex[:10].upper()}",
        run_id=run_id,
        decision_id=decision_id,
        recommendation_id=recommendation_id,
        action_id=action["action_id"],
        action_type=action["action_type"],
        execution_type=execution_type_for(action["action_type"]),
        quantity_lb=int(action["requested_lb"]),
        cost_usd=evaluation["cost_usd"],
        arrival_week_start=action.get("arrival_week_start"),
        authority_input_sha256=authority_input_sha256,
        created_at_utc=_utc_now(),
    )


class SimulatedExecutionAdapter:
    """The only demo execution adapter; it performs no external write."""

    def execute(self, intent: ActionIntent) -> ExecutionReceipt:
        return ExecutionReceipt(
            execution_id=f"SIM-{uuid4().hex[:10].upper()}",
            action_intent_id=intent.action_intent_id,
            run_id=intent.run_id,
            action_id=intent.action_id,
            execution_type=intent.execution_type,
            quantity_lb=intent.quantity_lb,
            cost_usd=intent.cost_usd,
            arrival_week_start=intent.arrival_week_start,
            request_sha256=intent.authority_input_sha256,
            completed_at_utc=_utc_now(),
        )
