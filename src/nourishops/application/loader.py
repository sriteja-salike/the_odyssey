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

from jsonschema import Draft202012Validator
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


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(), parse_float=Decimal)


def _registry() -> Registry:
    res = []
    for sp in SCHEMAS.glob("*.json"):
        doc = json.loads(sp.read_text())
        res.append((sp.name, Resource.from_contents(doc)))
        if "$id" in doc:
            res.append((doc["$id"], Resource.from_contents(doc)))
    return Registry().with_resources(res)


def _validate(instance: dict, schema_name: str, registry: Registry) -> None:
    schema = json.loads((SCHEMAS / schema_name).read_text())
    errors = sorted(Draft202012Validator(schema, registry=registry).iter_errors(instance),
                    key=lambda e: list(e.path))
    if errors:
        loc = "/".join(str(p) for p in errors[0].path) or "<root>"
        raise ValueError(f"{schema_name} @{loc}: {errors[0].message}")


def _D(x) -> Decimal:
    return x if isinstance(x, Decimal) else Decimal(str(x))


def load_scenario(scenario_id: str, validate: bool = True) -> Snapshot:
    """Build a normalized Snapshot for a scenario id (e.g. 'scenario_a')."""
    docs = {name: _load_json(FIXTURES / name) for name in _SCHEMA_OF}
    overlay_doc = _load_json(FIXTURES / "scenarios" / f"{scenario_id}.json")
    if validate:
        # jsonschema's multipleOf needs native floats, so validate plain-parsed
        # copies; the engine still consumes the Decimal-parsed docs above.
        registry = _registry()
        for name, schema in _SCHEMA_OF.items():
            _validate(json.loads((FIXTURES / name).read_text()), schema, registry)
        _validate(json.loads((FIXTURES / "scenarios" / f"{scenario_id}.json").read_text()),
                  "scenario_overlay.schema.json", registry)

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

    enabled = set(overlay_doc.get("enabled_action_ids", []))
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
    active_offers = set(overlay_doc.get("active_offer_ids", []))
    offers = [Offer(
        offer_id=o["offer_id"], category_id=o["category_id"], gross_lb=_D(o["gross_quantity_lb"]),
        arrival_week_start=o["arrival_week_start"], yield_ratio=_D(o["expected_usable_yield_ratio"]),
        usable_life_days=int(o["usable_life_days"]), storage=o["storage_type"],
    ) for o in _load_json(FIXTURES / "pending_donation_offers.json")["records"]
        if o["offer_id"] in active_offers]

    # Active evidence (minimal projection) for data-quality validation.
    active_ev = set(overlay_doc.get("active_evidence_ids", []))
    evidence = [{
        "evidence_id": e["evidence_id"], "trust_level": e["trust_level"],
        "related_record_ids": e.get("related_record_ids", []),
        "structured_facts": e.get("structured_facts", []),
        "contains_instruction_like_text": e.get("contains_instruction_like_text", False),
    } for e in _load_json(FIXTURES / "evidence_records.json")["records"]
        if e["evidence_id"] in active_ev]

    return Snapshot(
        scenario_id=overlay_doc["scenario_id"], weeks=overlay_doc["forecast_week_starts"],
        policies=policies, warehouse=warehouse, starting_inventory_lb=starting,
        last_four_distributed_lb=last_four, inbounds=inbounds, actions=actions,
        primary_risk_type=overlay_doc.get("primary_risk_type", "SHORTAGE"),
        offers=offers, raw_inbound_records=raw_inbounds, evidence=evidence,
    )
