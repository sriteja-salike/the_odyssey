"""Scenario loader / repository adapter (04 §3, 03 §9).

IO lives here, not in domain/. Fixtures are parsed with parse_float=Decimal so a
value like 0.65 never becomes a binary float. The loader validates every document
against its JSON Schema, expands the historical matrix, applies exactly one overlay
as field replacement (never additive), and emits a normalized Snapshot.
"""
from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any, Mapping

from jsonschema import Draft202012Validator  # type: ignore[import-untyped]
from referencing import Registry, Resource

from nourishops.domain.model import (Action, CATEGORY_ORDER, Inbound, Offer, Policy,
                                     Snapshot, Warehouse)

ROOT = Path(__file__).resolve().parents[3]
BC = ROOT / "BUILD_CONTEXT"
SCHEMAS = BC / "schemas"
FIXTURES = BC / "fixtures"

_SCHEMA_OF = {
    "category_policies.json": "category_policies.schema.json",
    "warehouse.json": "warehouse_constraints.schema.json",
    "historical_weekly_category_flow.json": "historical_weekly_category_flow.schema.json",
    "planned_inbound.json": "planned_inbound.schema.json",
    "candidate_actions.json": "candidate_actions.schema.json",
}

_SUPPORTING_DOCS = {
    "pending_donation_offers.json": "pending_donation_offers.schema.json",
    "evidence_records.json": "evidence_records.schema.json",
}


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(), parse_float=Decimal)


def _registry(schema_documents: Mapping[str, dict[str, Any]] | None = None) -> Registry:
    res = []
    documents = schema_documents or {
        sp.name: json.loads(sp.read_text()) for sp in SCHEMAS.glob("*.json")
    }
    for name, doc in documents.items():
        res.append((name, Resource.from_contents(doc)))
        if "$id" in doc:
            res.append((doc["$id"], Resource.from_contents(doc)))
    return Registry().with_resources(res)


def _validate(
    instance: dict,
    schema_name: str,
    registry: Registry,
    schema_documents: Mapping[str, dict[str, Any]] | None = None,
) -> None:
    schema = (
        schema_documents[schema_name]
        if schema_documents is not None
        else json.loads((SCHEMAS / schema_name).read_text())
    )
    errors = sorted(Draft202012Validator(schema, registry=registry).iter_errors(instance),
                    key=lambda e: list(e.path))
    if errors:
        loc = "/".join(str(p) for p in errors[0].path) or "<root>"
        raise ValueError(f"{schema_name} @{loc}: {errors[0].message}")


def snapshot_schema_documents(schema_names: set[str]) -> dict[str, dict[str, Any]]:
    """Load a closed local schema set so a run can replay without live schema files."""
    pending = list(schema_names)
    documents: dict[str, dict[str, Any]] = {}

    def references(value: Any) -> set[str]:
        if isinstance(value, dict):
            dict_found = {
                str(item).split("#", 1)[0]
                for key, item in value.items()
                if key == "$ref" and isinstance(item, str) and not item.startswith("#")
            }
            for item in value.values():
                dict_found.update(references(item))
            return {Path(item).name for item in dict_found if item}
        if isinstance(value, list):
            list_found: set[str] = set()
            for item in value:
                list_found.update(references(item))
            return list_found
        return set()

    while pending:
        name = pending.pop()
        if name in documents:
            continue
        path = SCHEMAS / name
        if not path.is_file():
            raise FileNotFoundError(f"Scenario schema is unavailable: {name}")
        document = json.loads(path.read_text())
        documents[name] = document
        pending.extend(references(document) - documents.keys())
    return documents


def _D(x) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(str(x))


def load_scenario_from_documents(
    documents: Mapping[str, str], scenario_id: str, validate: bool = True,
    overlay_schema_name: str = "scenario_overlay.schema.json",
    source_schema_map: Mapping[str, str] | None = None,
    schema_documents: Mapping[str, dict[str, Any]] | None = None,
) -> Snapshot:
    """Build a Snapshot from source-system JSON documents.

    ``documents`` is the application boundary used by database-backed source
    adapters. Keeping the conversion here means file fixtures and production-
    shaped integrations run through the exact same normalization code.
    """
    docs = {
        name: json.loads(documents[name], parse_float=Decimal)
        for name in (*_SCHEMA_OF, *_SUPPORTING_DOCS)
    }
    overlay_name = f"scenarios/{scenario_id}.json"
    overlay_doc = json.loads(documents[overlay_name], parse_float=Decimal)
    if validate:
        registry = _registry(schema_documents)
        declared_schemas = source_schema_map or {**_SCHEMA_OF, **_SUPPORTING_DOCS}
        for name, schema in declared_schemas.items():
            _validate(
                json.loads(documents[name]), schema, registry, schema_documents,
            )
        _validate(
            json.loads(documents[overlay_name]), overlay_schema_name,
            registry, schema_documents,
        )

    def require_references(field: str, document: str, identifier: str) -> set[str]:
        selected = set(overlay_doc.get(field, []))
        available = {item[identifier] for item in docs[document]["records"]}
        missing = sorted(selected - available)
        if missing:
            raise ValueError(f"{field} contains unknown IDs: {', '.join(missing)}")
        return selected

    enabled = require_references("enabled_action_ids", "candidate_actions.json", "action_id")
    active_offers = require_references(
        "active_offer_ids", "pending_donation_offers.json", "offer_id",
    )
    active_ev = require_references("active_evidence_ids", "evidence_records.json", "evidence_id")

    referenced_evidence: set[str] = set()
    for action in docs["candidate_actions.json"]["records"]:
        if action["action_id"] in enabled:
            referenced_evidence.update(action.get("evidence_ids", []))
    for offer in docs["pending_donation_offers.json"]["records"]:
        if offer["offer_id"] in active_offers:
            referenced_evidence.update(offer.get("evidence_ids", []))
    inactive_evidence = sorted(referenced_evidence - active_ev)
    if inactive_evidence:
        raise ValueError(
            "Enabled records reference inactive evidence: " + ", ".join(inactive_evidence)
        )

    policies = {p["category_id"]: Policy(
        category_id=p["category_id"], priority_weight=_D(p["priority_weight"]),
        essential=bool(p["essential_assortment"]), min_wos=_D(p["minimum_weeks_of_supply"]),
        target_wos=_D(p["target_weeks_of_supply"]), storage=p["primary_storage_type"],
    ) for p in docs["category_policies.json"]["records"]}

    wh = docs["warehouse.json"]["record"]
    overrides = overlay_doc["overlay"].get("warehouse_overrides", {})
    budget = _D(overrides.get("planning_budget_usd", wh["planning_budget_usd"]))
    caps = dict(wh["capacity_lb"])
    caps.update(overrides.get("capacity_lb", {}))
    warehouse = Warehouse(
        budget_usd=budget, capacity_lb={k: _D(v) for k, v in caps.items()},
        probable_probability=_D(wh["probable_status_probability"]),
        minimum_pickup_lb=_D(wh["minimum_pickup_lb"]),
    )

    # Historical matrix -> starting inventory + last-four distributions.
    series = {s["category_id"]: s for s in docs["historical_weekly_category_flow.json"]["series"]}
    starting = {c: _D(series[c]["ending_inventory_lb"][-1]) for c in CATEGORY_ORDER}
    last_four = {c: [_D(x) for x in series[c]["distributed_lb"][-4:]] for c in CATEGORY_ORDER}

    # Planned inbound with the overlay applied (field replacement, not merge).
    ov = overlay_doc["overlay"]
    removed = set(ov.get("remove_inbound_ids", []))
    mutations = {m["inbound_id"]: m["set"] for m in ov.get("inbound_mutations", [])}
    inbounds: list[Inbound] = []
    raw_inbounds: list[dict] = []
    for base in docs["planned_inbound.json"]["records"]:
        if base["inbound_id"] in removed:
            continue
        rec = {**base, **mutations.get(base["inbound_id"], {})}
        raw_inbounds.append(rec)  # kept (nulls included) for DATA_QUALITY validation
        if rec.get("expected_week_start") is None or rec.get("status") is None:
            continue  # can't be projected; surfaces as a blocking finding (Scenario E)
        inbounds.append(Inbound(
            inbound_id=rec["inbound_id"], category_id=rec["category_id"],
            week_start=rec["expected_week_start"], gross_lb=_D(rec["gross_quantity_lb"]),
            status=rec["status"], probability=_D(rec.get("arrival_probability") or 0),
            storage=rec["storage_type"], yield_ratio=_D(rec["expected_usable_yield_ratio"]),
            usable_life_days=int(rec["usable_life_days"]),
        ))

    actions: list[Action] = []
    for r in docs["candidate_actions.json"]["records"]:
        if r["action_id"] not in enabled:
            continue
        actions.append(Action(
            action_id=r["action_id"], action_type=r["action_type"],
            category_id=r.get("category_id"), requested_lb=_D(r["requested_quantity_lb"]),
            minimum_lb=_D(r["minimum_quantity_lb"]), maximum_lb=_D(r["maximum_quantity_lb"]),
            increment_lb=_D(r["quantity_increment_lb"]),
            unit_price=None if r["unit_price_usd_per_lb"] is None else _D(r["unit_price_usd_per_lb"]),
            fixed_cost=_D(r["fixed_cost_usd"]), computed_cost=_D(r["computed_cost_usd"]),
            arrival_week_start=r.get("arrival_week_start"), lead_time_days=int(r["lead_time_days"]),
            success_probability=_D(r["success_probability"]),
            yield_ratio=_D(r["expected_usable_yield_ratio"]),
            usable_life_days=None if r["usable_life_days"] is None else int(r["usable_life_days"]),
            storage=r["storage_type"], burden=r["operational_burden"],
            evidence_ids=tuple(r.get("evidence_ids", [])),
        ))

    # Active pending donation offers (Scenarios B and C).
    offers = [Offer(
        offer_id=o["offer_id"], category_id=o["category_id"], gross_lb=_D(o["gross_quantity_lb"]),
        arrival_week_start=o["arrival_week_start"], yield_ratio=_D(o["expected_usable_yield_ratio"]),
        usable_life_days=int(o["usable_life_days"]), storage=o["storage_type"],
    ) for o in docs["pending_donation_offers.json"]["records"]
        if o["offer_id"] in active_offers]

    # Active evidence (minimal projection) for data-quality validation.
    evidence = [{
        "evidence_id": e["evidence_id"], "trust_level": e["trust_level"],
        "related_record_ids": e.get("related_record_ids", []),
        "structured_facts": e.get("structured_facts", []),
        "contains_instruction_like_text": e.get("contains_instruction_like_text", False),
    } for e in docs["evidence_records.json"]["records"]
        if e["evidence_id"] in active_ev]

    return Snapshot(
        scenario_id=overlay_doc["scenario_id"], weeks=overlay_doc["forecast_week_starts"],
        policies=policies, warehouse=warehouse, starting_inventory_lb=starting,
        last_four_distributed_lb=last_four, inbounds=inbounds, actions=actions,
        primary_risk_type=overlay_doc.get("primary_risk_type", "SHORTAGE"),
        offers=offers, raw_inbound_records=raw_inbounds, evidence=evidence,
    )


def load_scenario(scenario_id: str, validate: bool = True) -> Snapshot:
    """Build a normalized Snapshot from the committed local fixtures."""
    names = (*_SCHEMA_OF, *_SUPPORTING_DOCS)
    documents = {name: (FIXTURES / name).read_text() for name in names}
    overlay_name = f"scenarios/{scenario_id}.json"
    documents[overlay_name] = (FIXTURES / overlay_name).read_text()
    return load_scenario_from_documents(documents, scenario_id, validate)
