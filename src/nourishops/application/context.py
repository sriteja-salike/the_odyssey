"""Build the scenario-specific knowledge packet consumed by decision clients."""
from __future__ import annotations

import json
from copy import deepcopy
from decimal import Decimal
from typing import Any, Mapping


def _documents(raw_documents: Mapping[str, str], scenario_key: str) -> dict[str, dict]:
    names = (
        "category_policies.json",
        "warehouse.json",
        "historical_weekly_category_flow.json",
        "planned_inbound.json",
        "candidate_actions.json",
        "pending_donation_offers.json",
        "evidence_records.json",
        f"scenarios/{scenario_key}.json",
    )
    return {
        name: json.loads(raw_documents[name], parse_float=Decimal)
        for name in names
    }


def _effective_inbounds(records: list[dict], overlay: dict) -> tuple[list[dict], list[dict]]:
    removed_ids = set(overlay.get("remove_inbound_ids", []))
    mutations = {item["inbound_id"]: item["set"] for item in overlay.get("inbound_mutations", [])}
    effective: list[dict] = []
    removed: list[dict] = []
    for record in records:
        if record["inbound_id"] in removed_ids:
            removed.append(record)
            continue
        effective.append({**record, **mutations.get(record["inbound_id"], {})})
    return effective, removed


def _incident_from_offer(offer: dict, evidence_by_id: dict[str, dict]) -> dict:
    evidence = [
        evidence_by_id[evidence_id]
        for evidence_id in offer.get("evidence_ids", [])
        if evidence_id in evidence_by_id
    ]
    primary = evidence[0] if evidence else {}
    return {
        "incident_type": "DONATION_OFFER",
        "record_id": offer["offer_id"],
        "source_kind": primary.get("source_kind", "STRUCTURED_OFFER"),
        "title": primary.get("title", "Donation offer"),
        "summary": primary.get("body"),
        "response_deadline": offer.get("response_deadline"),
        "verified_facts": offer,
        "evidence_ids": offer.get("evidence_ids", []),
        "record_version": offer.get("record_version"),
        "synthetic": True,
    }


def _incident_from_evidence(evidence: dict, verified_facts: dict | None = None) -> dict:
    return {
        "incident_type": "INBOUND_CHANGE_NOTICE"
        if evidence.get("source_kind") == "SYNTHETIC_NOTICE"
        else "SCENARIO_SIGNAL",
        "record_id": evidence["evidence_id"],
        "source_kind": evidence.get("source_kind"),
        "title": evidence.get("title"),
        "summary": evidence.get("body"),
        "response_deadline": None,
        "verified_facts": verified_facts or {
            fact["field"]: {"value": fact.get("value"), "unit": fact.get("unit")}
            for fact in evidence.get("structured_facts", [])
        },
        "evidence_ids": [evidence["evidence_id"]],
        "record_version": evidence.get("record_version"),
        "synthetic": True,
    }


def build_scenario_context(raw_documents: Mapping[str, str], scenario_key: str) -> dict[str, Any]:
    """Join source snapshots into one stable, scenario-focused decision packet.

    The packet separates operational facts from organizational rules and keeps
    the incident envelope independent of any one risk type or UI layout.
    """
    docs = _documents(raw_documents, scenario_key)
    scenario = docs[f"scenarios/{scenario_key}.json"]
    overlay = scenario["overlay"]

    enabled_action_ids = set(scenario.get("enabled_action_ids", []))
    actions = [
        record for record in docs["candidate_actions.json"]["records"]
        if record["action_id"] in enabled_action_ids
    ]
    active_offer_ids = set(scenario.get("active_offer_ids", []))
    offers = [
        record for record in docs["pending_donation_offers.json"]["records"]
        if record["offer_id"] in active_offer_ids
    ]
    active_evidence_ids = set(scenario.get("active_evidence_ids", []))
    evidence = [
        record for record in docs["evidence_records.json"]["records"]
        if record["evidence_id"] in active_evidence_ids
    ]
    evidence_by_id = {record["evidence_id"]: record for record in evidence}

    effective_inbounds, removed_inbounds = _effective_inbounds(
        docs["planned_inbound.json"]["records"], overlay,
    )
    affected_inbound_ids = {
        *overlay.get("remove_inbound_ids", []),
        *(item["inbound_id"] for item in overlay.get("inbound_mutations", [])),
    }
    affected_inbounds = [
        record for record in docs["planned_inbound.json"]["records"]
        if record["inbound_id"] in affected_inbound_ids
    ]

    focus_categories = {
        *(record["category_id"] for record in actions if record.get("category_id")),
        *(record["category_id"] for record in offers),
        *(record["category_id"] for record in affected_inbounds),
    }
    history = [
        record for record in docs["historical_weekly_category_flow.json"]["series"]
        if record["category_id"] in focus_categories
    ]
    policies = [
        record for record in docs["category_policies.json"]["records"]
        if record["category_id"] in focus_categories
    ]

    warehouse = deepcopy(docs["warehouse.json"]["record"])
    warehouse_overrides = overlay.get("warehouse_overrides", {})
    if "planning_budget_usd" in warehouse_overrides:
        warehouse["planning_budget_usd"] = warehouse_overrides["planning_budget_usd"]
    warehouse["capacity_lb"].update(warehouse_overrides.get("capacity_lb", {}))

    incidents = [_incident_from_offer(offer, evidence_by_id) for offer in offers]
    if not incidents:
        derived_ids = set(scenario.get("provenance", {}).get("derived_from_ids", []))
        derived_evidence = [
            record for record in evidence
            if record["evidence_id"] in derived_ids
        ]
        cached_facts = scenario.get("cached_notice_extraction")
        incidents = [
            _incident_from_evidence(record, cached_facts if index == 0 else None)
            for index, record in enumerate(derived_evidence)
        ]

    return {
        "schema_version": "scenario-context/1.0.0",
        "scenario": {
            "key": scenario_key,
            "scenario_id": scenario["scenario_id"],
            "scenario_version": scenario["scenario_version"],
            "display_name": scenario["display_name"],
            "planning_date": scenario["planning_date"],
            "forecast_week_starts": scenario["forecast_week_starts"],
            "primary_risk_type": scenario["primary_risk_type"],
            "provenance": scenario["provenance"],
        },
        "incidents": incidents,
        "current_knowledge": {
            "inventory": [
                {
                    "category_id": record["category_id"],
                    "on_hand_lb": record["ending_inventory_lb"][-1],
                    "record_version": record["record_version"],
                }
                for record in history
            ],
            "recent_distributions": [
                {
                    "category_id": record["category_id"],
                    "last_four_weeks_lb": record["distributed_lb"][-4:],
                    "record_version": record["record_version"],
                }
                for record in history
            ],
            "planned_inbounds": [
                record for record in effective_inbounds
                if record["category_id"] in focus_categories
            ],
            "active_offers": offers,
        },
        "organizational_knowledge": {
            "category_policies": policies,
            "warehouse_constraints": warehouse,
            "action_catalog": actions,
            "active_evidence": evidence,
        },
        "scenario_changes": {
            "removed_inbounds": removed_inbounds,
            "inbound_mutations": overlay.get("inbound_mutations", []),
            "warehouse_overrides": warehouse_overrides,
        },
        "decision_contract": {
            "enabled_action_ids": [record["action_id"] for record in actions],
            "requires_human_approval": any(
                record.get("requires_human_approval", False) for record in actions
            ),
            "execution_mode": "SIMULATED",
            "external_writes_allowed": False,
        },
    }
