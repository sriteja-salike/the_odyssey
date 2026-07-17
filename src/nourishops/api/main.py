"""FastAPI transport for the local synthetic NourishOps simulation."""
from __future__ import annotations

from collections.abc import Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from nourishops.api.models import (
    ActionPreviewRequest,
    CreateRunRequest,
    DecisionBriefEnvelope,
    DecisionRequest,
    FeedbackRequest,
    OutcomeFeedbackRequest,
)
from nourishops.agents import build_decision_agent, build_decision_reviewer
from nourishops.application.service import ApplicationError, NourishOpsService
from nourishops.persistence.postgres import IdempotencyKeyReused, PostgresStore
from nourishops.settings import get_settings

settings = get_settings()
store = PostgresStore(settings.database_url)
service = NourishOpsService(
    store,
    agent=build_decision_agent(settings),
    reviewer=build_decision_reviewer(settings),
)
IdempotencyKey = Annotated[
    str,
    Header(alias="Idempotency-Key", min_length=8, max_length=128),
]


def meta(agent_result: dict[str, Any] | None = None) -> dict:
    configured = service.agent.describe()
    return {
        "request_id": f"REQ-{uuid4().hex[:10].upper()}",
        "generated_at_utc": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "synthetic": True,
        "agent_mode": agent_result.get("effective_mode", configured.effective_mode)
        if agent_result else configured.effective_mode,
        "agent_status": agent_result.get("status", configured.status)
        if agent_result else configured.status,
        "agent_provider": agent_result.get("provider", configured.provider)
        if agent_result else configured.provider,
        "agent_model": agent_result.get("model", configured.model)
        if agent_result else configured.model,
        "build_id": settings.build_id,
        "source_mode": "postgres_connector_snapshots",
    }


def envelope(data):
    agent_result = data.get("agent") if isinstance(data, dict) else None
    return {"data": data, "meta": meta(agent_result)}


def idempotent(
    route: str,
    idempotency_key: str,
    request_payload: Any,
    operation: Callable[[Any], dict],
) -> dict:
    try:
        return store.execute_idempotent(
            route, idempotency_key, request_payload, operation,
        )
    except IdempotencyKeyReused as exc:
        raise ApplicationError(
            "IDEMPOTENCY_KEY_REUSED",
            "That request key was already used with different information.",
            409,
        ) from exc


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.migrate()
    store.seed_integrations()
    yield


app = FastAPI(title="NourishOps API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin, "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApplicationError)
async def application_error(_, exc: ApplicationError):
    request_id = f"REQ-{uuid4().hex[:10].upper()}"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {
            "code": exc.code, "message": exc.message,
            "request_id": request_id, "retryable": False,
        }},
    )


@app.get("/api/v1/health/live")
def live():
    return envelope({"status": "live"})


@app.get("/api/v1/health/ready")
def ready():
    is_ready = store.ready()
    if not is_ready:
        raise HTTPException(status_code=503, detail="PostgreSQL integration snapshots are not ready")
    return envelope({
        "status": "ready",
        "database": "postgresql",
        "seeded_sources": True,
        "agent": service.agent.describe().model_dump(mode="json"),
    })


@app.get("/api/v1/meta")
def application_meta():
    return envelope({
        "mode": settings.environment,
        "synthetic": True,
        "persistence": "postgresql",
        "execution_gateway": "simulated",
        "feedback_capture": "append_only",
        "capabilities": service.capabilities(),
    })


@app.get("/api/v1/capabilities")
def capabilities():
    return envelope(service.capabilities())


@app.get("/api/v1/scenarios")
def scenarios():
    return envelope(store.list_scenarios())


@app.post("/api/v1/runs", status_code=201)
def create_run(request: CreateRunRequest, idempotency_key: IdempotencyKey):
    return idempotent(
        "POST /api/v1/runs",
        idempotency_key,
        request.model_dump(mode="json"),
        lambda connection: envelope(service.create_run(
            request.scenario_key, request.parent_run_id, connection,
        )),
    )


@app.get("/api/v1/runs/{run_id}")
def get_run(run_id: str):
    return envelope(service.get_run(run_id))


@app.get("/api/v1/runs/{run_id}/context-bundle")
def context_bundle(run_id: str):
    return envelope(service.get_context_bundle(run_id))


@app.post("/api/v1/runs/{run_id}/evaluate")
def evaluate(run_id: str, idempotency_key: IdempotencyKey):
    return idempotent(
        f"POST /api/v1/runs/{run_id}/evaluate",
        idempotency_key,
        {},
        lambda connection: envelope(service.evaluate(run_id, connection)),
    )


@app.get(
    "/api/v1/runs/{run_id}/decision-brief",
    response_model=DecisionBriefEnvelope,
)
def decision_brief(run_id: str):
    return envelope(service.get_decision_brief(run_id))


@app.get("/api/v1/runs/{run_id}/decision-trace")
def decision_trace(run_id: str):
    return envelope(service.get_decision_trace(run_id))


@app.post("/api/v1/runs/{run_id}/action-previews")
def preview_action(run_id: str, request: ActionPreviewRequest):
    return envelope(service.preview_action(
        run_id,
        request.action_id,
        request.quantity_lb,
        request.expected_revision,
        request.recommendation_id,
    ))


@app.post("/api/v1/runs/{run_id}/decisions")
def decide(run_id: str, request: DecisionRequest, idempotency_key: IdempotencyKey):
    return idempotent(
        f"POST /api/v1/runs/{run_id}/decisions",
        idempotency_key,
        request.model_dump(mode="json"),
        lambda connection: envelope(service.decide(
            run_id,
            request.kind,
            request.action_id,
            request.quantity_lb,
            request.reason,
            request.expected_revision,
            request.recommendation_id,
            connection,
        )),
    )


@app.post("/api/v1/runs/{run_id}/feedback", status_code=201)
def feedback(run_id: str, request: FeedbackRequest, idempotency_key: IdempotencyKey):
    return idempotent(
        f"POST /api/v1/runs/{run_id}/feedback",
        idempotency_key,
        request.model_dump(mode="json"),
        lambda connection: envelope(service.record_feedback(
            run_id, request.rating, request.reason, request.survey, connection,
        )),
    )


@app.post("/api/v1/runs/{run_id}/outcome-feedback", status_code=201)
def outcome_feedback(
    run_id: str,
    request: OutcomeFeedbackRequest,
    idempotency_key: IdempotencyKey,
):
    return idempotent(
        f"POST /api/v1/runs/{run_id}/outcome-feedback",
        idempotency_key,
        request.model_dump(mode="json"),
        lambda connection: envelope(service.record_outcome_feedback(
            run_id,
            request.outcome,
            request.actual_quantity_lb,
            str(request.actual_cost_usd) if request.actual_cost_usd is not None else None,
            request.reason,
            request.survey,
            connection,
        )),
    )


@app.get("/api/v1/runs/{run_id}/events")
def events(run_id: str):
    service.get_run(run_id)
    return envelope(store.get_events(run_id))
