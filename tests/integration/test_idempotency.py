from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest

from nourishops.application.service import ApplicationError, NourishOpsService
from nourishops.persistence.postgres import IdempotencyKeyReused, PostgresStore

DATABASE_URL = os.environ.get("NOURISHOPS_TEST_DATABASE_URL")
requires_postgres = pytest.mark.skipif(
    not DATABASE_URL,
    reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration",
)


def ready_store() -> PostgresStore:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    return store


@requires_postgres
def test_same_key_replays_and_different_payload_conflicts() -> None:
    store = ready_store()
    service = NourishOpsService(store)
    key = f"test-{uuid4()}"
    route = "POST /api/v1/runs"
    request = {"scenario_key": "scenario_b", "parent_run_id": None}

    first = store.execute_idempotent(
        route,
        key,
        request,
        lambda connection: service.create_run("scenario_b", None, connection),
    )
    replay = store.execute_idempotent(
        route,
        key,
        request,
        lambda _connection: pytest.fail("a replay must not execute the operation"),
    )

    assert replay == first
    assert len(store.get_events(first["run_id"])) == 2
    with pytest.raises(IdempotencyKeyReused):
        store.execute_idempotent(
            route,
            key,
            {"scenario_key": "scenario_a", "parent_run_id": None},
            lambda _connection: pytest.fail("a key conflict must not execute the operation"),
        )


@requires_postgres
def test_mutation_and_replay_record_roll_back_together() -> None:
    store = ready_store()
    service = NourishOpsService(store)
    key = f"test-{uuid4()}"
    with store.connect() as connection:
        before = connection.execute(
            "SELECT count(*) AS count FROM nourishops_app.runs",
        ).fetchone()["count"]

    def fail_after_mutation(connection):
        service.create_run("scenario_b", None, connection)
        raise RuntimeError("simulate response-build failure")

    with pytest.raises(RuntimeError, match="response-build"):
        store.execute_idempotent(
            "POST /api/v1/runs",
            key,
            {"scenario_key": "scenario_b", "parent_run_id": None},
            fail_after_mutation,
        )

    with store.connect() as connection:
        after = connection.execute(
            "SELECT count(*) AS count FROM nourishops_app.runs",
        ).fetchone()["count"]
        records = connection.execute(
            """SELECT count(*) AS count FROM nourishops_app.idempotency_records
               WHERE route = 'POST /api/v1/runs' AND idempotency_key = %s""",
            (key,),
        ).fetchone()["count"]
    assert after == before
    assert records == 0


@requires_postgres
def test_concurrent_decisions_commit_exactly_once() -> None:
    store = ready_store()
    service = NourishOpsService(store)
    run = service.evaluate(service.create_run("scenario_b")["run_id"])
    recommendation = run["analysis"]["recommended_action"]
    route = f"POST /api/v1/runs/{run['run_id']}/decisions"
    request = {
        "kind": "approve",
        "recommendation_id": recommendation["recommendation_id"],
        "expected_revision": run["revision"],
        "action_id": recommendation["action_id"],
        "quantity_lb": recommendation["requested_quantity_lb"],
        "reason": None,
    }
    barrier = Barrier(2)

    def submit() -> str:
        key = f"test-{uuid4()}"
        barrier.wait()
        try:
            store.execute_idempotent(
                route,
                key,
                request,
                lambda connection: service.decide(
                    run["run_id"],
                    request["kind"],
                    request["action_id"],
                    request["quantity_lb"],
                    request["reason"],
                    request["expected_revision"],
                    request["recommendation_id"],
                    connection,
                ),
            )
            return "COMMITTED"
        except ApplicationError as exc:
            return exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: submit(), range(2)))

    assert sorted(outcomes) == ["COMMITTED", "DECISION_ALREADY_FINAL"]
    event_types = [item["event_type"] for item in store.get_events(run["run_id"])]
    assert event_types.count("MANAGER_APPROVED") == 1
    assert event_types.count("SIMULATED_ACTION_COMPLETED") == 1
    assert [item["sequence_no"] for item in store.get_events(run["run_id"])] == list(
        range(1, len(event_types) + 1)
    )
