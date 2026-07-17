from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

DATABASE_URL = os.environ.get("NOURISHOPS_TEST_DATABASE_URL")
if DATABASE_URL:
    os.environ["NOURISHOPS_DATABASE_URL"] = DATABASE_URL

from nourishops.api.main import app  # noqa: E402

requires_postgres = pytest.mark.skipif(
    not DATABASE_URL,
    reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration",
)


@requires_postgres
def test_public_api_replay_and_typed_decision_brief() -> None:
    with TestClient(app) as client:
        key = f"test-{uuid4()}"
        request = {"scenario_key": "scenario_b"}
        first = client.post("/api/v1/runs", json=request, headers={"Idempotency-Key": key})
        replay = client.post("/api/v1/runs", json=request, headers={"Idempotency-Key": key})
        assert first.status_code == 201
        assert replay.json() == first.json()

        run_id = first.json()["data"]["run_id"]
        evaluated = client.post(
            f"/api/v1/runs/{run_id}/evaluate",
            headers={"Idempotency-Key": f"test-{uuid4()}"},
        )
        assert evaluated.status_code == 200
        brief = client.get(f"/api/v1/runs/{run_id}/decision-brief")
        assert brief.status_code == 200
        assert brief.json()["data"]["schema_version"] == "decision-brief/1.0.0"
        assert brief.json()["data"]["approval"]["external_writes_allowed"] is False

        evaluated_run = evaluated.json()["data"]
        recommendation = evaluated_run["analysis"]["recommended_action"]
        stale = client.post(
            f"/api/v1/runs/{run_id}/decisions",
            headers={"Idempotency-Key": f"test-{uuid4()}"},
            json={
                "kind": "approve",
                "recommendation_id": recommendation["recommendation_id"],
                "expected_revision": evaluated_run["revision"] - 1,
                "action_id": recommendation["action_id"],
                "quantity_lb": recommendation["requested_quantity_lb"],
                "reason": None,
            },
        )
        assert stale.status_code == 409
        assert stale.json()["error"]["code"] == "STALE_RECOMMENDATION"


@requires_postgres
def test_public_api_enforces_idempotency_and_conflict_errors() -> None:
    with TestClient(app) as client:
        missing = client.post("/api/v1/runs", json={"scenario_key": "scenario_b"})
        assert missing.status_code == 422

        key = f"test-{uuid4()}"
        first = client.post(
            "/api/v1/runs",
            json={"scenario_key": "scenario_b"},
            headers={"Idempotency-Key": key},
        )
        assert first.status_code == 201
        conflict = client.post(
            "/api/v1/runs",
            json={"scenario_key": "scenario_a"},
            headers={"Idempotency-Key": key},
        )
        assert conflict.status_code == 409
        assert conflict.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"


@requires_postgres
def test_public_api_completes_recommendation_to_outcome_loop() -> None:
    with TestClient(app) as client:
        created = client.post(
            "/api/v1/runs",
            json={"scenario_key": "scenario_b"},
            headers={"Idempotency-Key": f"test-{uuid4()}"},
        )
        run_id = created.json()["data"]["run_id"]

        context = client.get(f"/api/v1/runs/{run_id}/context-bundle")
        assert context.status_code == 200
        assert context.json()["data"]["frozen"] is True
        assert context.json()["data"]["quality"]["status"] == "COMPLETE"

        evaluated = client.post(
            f"/api/v1/runs/{run_id}/evaluate",
            headers={"Idempotency-Key": f"test-{uuid4()}"},
        )
        evaluated_run = evaluated.json()["data"]
        recommendation = evaluated_run["analysis"]["recommended_action"]

        trace = client.get(f"/api/v1/runs/{run_id}/decision-trace")
        assert trace.status_code == 200
        assert trace.json()["data"]["final_status"] == "PASSED"
        assert trace.json()["data"]["exposes_chain_of_thought"] is False

        decision_key = f"test-{uuid4()}"
        decision_request = {
            "kind": "approve",
            "recommendation_id": recommendation["recommendation_id"],
            "expected_revision": evaluated_run["revision"],
            "action_id": recommendation["action_id"],
            "quantity_lb": recommendation["requested_quantity_lb"],
            "reason": None,
        }
        approved = client.post(
            f"/api/v1/runs/{run_id}/decisions",
            headers={"Idempotency-Key": decision_key},
            json=decision_request,
        )
        replay = client.post(
            f"/api/v1/runs/{run_id}/decisions",
            headers={"Idempotency-Key": decision_key},
            json=decision_request,
        )
        assert approved.status_code == 200
        assert replay.json() == approved.json()
        approved_run = approved.json()["data"]
        assert approved_run["action_intent"]["mode"] == "SIMULATED"
        assert approved_run["execution_receipt"]["status"] == "SIMULATED_COMPLETED"
        assert approved_run["execution_receipt"]["external_write_performed"] is False

        outcome_key = f"test-{uuid4()}"
        outcome_request = {
            "outcome": "SUCCESSFUL",
            "actual_quantity_lb": recommendation["requested_quantity_lb"],
            "actual_cost_usd": recommendation["cost_usd"],
            "reason": None,
            "survey": {"on_time": True},
        }
        recorded = client.post(
            f"/api/v1/runs/{run_id}/outcome-feedback",
            headers={"Idempotency-Key": outcome_key},
            json=outcome_request,
        )
        outcome_replay = client.post(
            f"/api/v1/runs/{run_id}/outcome-feedback",
            headers={"Idempotency-Key": outcome_key},
            json=outcome_request,
        )
        assert recorded.status_code == 201
        assert outcome_replay.json() == recorded.json()
        assert recorded.json()["data"]["outcome"] == "SUCCESSFUL"

        events = client.get(f"/api/v1/runs/{run_id}/events").json()["data"]
        event_types = [event["event_type"] for event in events]
        assert "DECISION_TRACE_RECORDED" in event_types
        assert "SIMULATED_ACTION_COMPLETED" in event_types
        assert "OUTCOME_FEEDBACK_RECORDED" in event_types
