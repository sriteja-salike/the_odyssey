from __future__ import annotations

import os
import hashlib
import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from nourishops.agents.contracts import AgentMetadata
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.application.service import NourishOpsService
from nourishops.persistence.postgres import PostgresStore

DATABASE_URL = os.environ.get("NOURISHOPS_TEST_DATABASE_URL")


class MockVerifiedLiveAgent:
    def describe(self) -> AgentMetadata:
        return AgentMetadata(
            requested_mode="live",
            effective_mode="live",
            status="live_configured",
            provider="anthropic",
            model="mock-claude",
        )

    def explain(self, package):
        metadata = self.describe().model_copy(update={"status": "live_verified"})
        return OfflineDecisionAgent(metadata).explain(package)


class AgentMustNotRun(MockVerifiedLiveAgent):
    def explain(self, _package):
        raise AssertionError("The agent must not run for an abstaining scenario")


@pytest.mark.skipif(not DATABASE_URL, reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration")
def test_scenario_a_lifecycle_from_seeded_sources() -> None:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    service = NourishOpsService(store)

    run = service.create_run("scenario_a")
    assert run["state"] == "DRAFT"
    assert len(run["knowledge"]["current"]) == 4
    assert len(run["knowledge"]["organizational"]) == 3

    run = service.evaluate(run["run_id"])
    recommendation = run["analysis"]["recommended_action"]
    assert run["state"] == "READY_FOR_REVIEW"
    assert recommendation["action_id"] == "ACT-A-PURCHASE-PROTEIN-15000"
    assert recommendation["requested_quantity_lb"] == 15000
    assert recommendation["cost_usd"] == "12750.00"

    run = service.decide(
        run["run_id"], "approve", recommendation["action_id"],
        recommendation["requested_quantity_lb"], None,
    )
    assert run["state"] == "APPROVED"
    assert run["execution"]["status"] == "SIMULATED_SUBMITTED"
    assert run["execution"]["external_write_performed"] is False

    feedback = service.record_feedback(run["run_id"], "HELPFUL", "Clear next step", {})
    assert feedback["rating"] == "HELPFUL"
    assert [event["event_type"] for event in store.get_events(run["run_id"])] == [
        "RUN_CREATED", "SCENARIO_VALIDATED", "RECOMMENDATION_PREPARED", "MANAGER_APPROVED",
        "SIMULATED_ACTION_APPLIED", "RECOMMENDATION_FEEDBACK",
    ]


@pytest.mark.skipif(not DATABASE_URL, reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration")
def test_scenario_b_short_life_offer_lifecycle() -> None:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    service = NourishOpsService(store)

    listed = {scenario["key"]: scenario for scenario in store.list_scenarios()}
    assert listed["scenario_b"]["backend_status"] == "READY"
    assert listed["scenario_b"]["primary_risk_type"] == "SHORT_LIFE_CAPACITY"

    run = service.create_run("scenario_b")
    assert run["contract_snapshot_hash"]
    assert len(run["input_manifest"]) == 8
    context = run["context"]
    assert context["schema_version"] == "scenario-context/1.0.0"
    assert context["incidents"][0]["record_id"] == "OFFER-B-PRODUCE-20000"
    assert context["incidents"][0]["response_deadline"] == "2026-08-03T20:00:00Z"
    assert context["current_knowledge"]["inventory"] == [
        {"category_id": "PRODUCE", "on_hand_lb": 15000, "record_version": 1},
    ]
    assert context["current_knowledge"]["recent_distributions"][0][
        "last_four_weeks_lb"
    ] == [13000, 14000, 15000, 14000]
    assert "INB-DONATION-PRODUCE-201" not in {
        item["inbound_id"] for item in context["current_knowledge"]["planned_inbounds"]
    }
    assert context["organizational_knowledge"]["warehouse_constraints"][
        "capacity_lb"
    ]["REFRIGERATED"] == 40000
    assert len(context["organizational_knowledge"]["action_catalog"]) == 5

    run = service.evaluate(run["run_id"])
    risk = run["analysis"]["risks"][0]
    recommendation = run["analysis"]["recommended_action"]
    assert risk["overflow_lb"] == "10000"
    assert risk["full_accept_spoilage_lb"] == "6000.0"
    assert recommendation["action_id"] == "ACT-B-PARTIAL-PRODUCE-10000"
    assert recommendation["requested_quantity_lb"] == 10000
    assert run["decision_brief"]["schema_version"] == "decision-brief/1.0.0"
    assert run["decision_brief"]["recommendation"]["action"]["action_id"] == (
        "ACT-B-PARTIAL-PRODUCE-10000"
    )
    assert run["decision_brief"]["solver"]["method"] == "CATALOG_ENUMERATION"
    assert run["decision_brief"]["agent"]["effective_mode"] == "offline"

    unsafe_preview = service.preview_action(
        run["run_id"], "ACT-B-PARTIAL-PRODUCE-10000", 11000,
    )
    assert unsafe_preview["feasible"] is False
    assert "STORAGE_CAPACITY" in unsafe_preview["evaluation"]["failed_codes"]

    run = service.decide(
        run["run_id"], "approve", recommendation["action_id"],
        recommendation["requested_quantity_lb"], None,
    )
    assert run["state"] == "APPROVED"
    assert run["execution"]["execution_type"] == "PARTIAL_DONATION_ACCEPTANCE_REQUEST"
    assert run["execution"]["status"] == "SIMULATED_SUBMITTED"
    assert run["execution"]["external_write_performed"] is False

    feedback = service.record_feedback(
        run["run_id"], "HELPFUL", "Balanced shortage and usable life", {"clarity": 5},
    )
    assert feedback["survey"] == {"clarity": 5}
    events = store.get_events(run["run_id"])
    assert [event["sequence_no"] for event in events] == list(range(1, len(events) + 1))
    assert all(event["payload_sha256"] for event in events)


@pytest.mark.skipif(not DATABASE_URL, reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration")
def test_run_inputs_remain_frozen_after_connector_refresh() -> None:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    service = NourishOpsService(store)

    original = service.create_run("scenario_b")
    assert original["context"]["organizational_knowledge"]["warehouse_constraints"][
        "capacity_lb"
    ]["REFRIGERATED"] == 40000

    version = f"synthetic-refresh/{uuid4().hex}"
    with store.connect() as connection:
        row = connection.execute(
            """SELECT payload_text FROM integration.snapshots
               WHERE document_id = 'warehouse.json'
               ORDER BY observed_at_utc DESC LIMIT 1"""
        ).fetchone()
        refreshed = json.loads(row["payload_text"])
        refreshed["record"]["capacity_lb"]["REFRIGERATED"] = 41000
        payload = json.dumps(refreshed, separators=(",", ":"))
        connection.execute(
            """INSERT INTO integration.snapshots
               (source_id, document_id, payload_text, source_version,
                observed_at_utc, payload_sha256)
               VALUES ('warehouse-wms', 'warehouse.json', %s, %s, %s, %s)""",
            (
                payload,
                version,
                datetime(2030, 1, 1, tzinfo=UTC),
                hashlib.sha256(payload.encode()).hexdigest(),
            ),
        )
    try:
        assert store.run_context(original["run_id"])["organizational_knowledge"][
            "warehouse_constraints"
        ]["capacity_lb"]["REFRIGERATED"] == 40000
        refreshed_run = service.create_run("scenario_b")
        assert refreshed_run["context"]["organizational_knowledge"][
            "warehouse_constraints"
        ]["capacity_lb"]["REFRIGERATED"] == 41000
        assert refreshed_run["contract_snapshot_hash"] != original["contract_snapshot_hash"]
    finally:
        with store.connect() as connection:
            connection.execute(
                "DELETE FROM integration.snapshots WHERE source_version = %s", (version,),
            )


@pytest.mark.skipif(not DATABASE_URL, reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration")
def test_live_wording_cannot_change_the_deterministic_decision() -> None:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    offline = NourishOpsService(store)
    live = NourishOpsService(store, agent=MockVerifiedLiveAgent())

    offline_run = offline.evaluate(offline.create_run("scenario_b")["run_id"])
    live_run = live.evaluate(live.create_run("scenario_b")["run_id"])

    assert live_run["analysis"] == offline_run["analysis"]
    assert live_run["decision_brief"]["analysis_output_hash"] == (
        offline_run["decision_brief"]["analysis_output_hash"]
    )
    assert live_run["decision_brief"]["recommendation"] == (
        offline_run["decision_brief"]["recommendation"]
    )
    assert live_run["agent"]["status"] == "live_verified"


@pytest.mark.skipif(not DATABASE_URL, reason="set NOURISHOPS_TEST_DATABASE_URL for PostgreSQL integration")
def test_abstention_never_invokes_the_agent() -> None:
    store = PostgresStore(DATABASE_URL)
    store.migrate()
    store.seed_integrations()
    service = NourishOpsService(store, agent=AgentMustNotRun())

    run = service.evaluate(service.create_run("scenario_e")["run_id"])
    assert run["state"] == "ABSTAINED"
    assert run["decision_brief"]["recommendation"] is None
    assert run["decision_brief"]["rationale"] is None
    assert run["decision_brief"]["approval"]["required"] is False
