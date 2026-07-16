"""Risk detection and priority scoring (04 §5).

Emits the four decision risk types (DATA_QUALITY lives in validation.py):
SHORTAGE, SHORT_LIFE_CAPACITY, DONATION_MISMATCH, BUDGET_TRADEOFF — then orders
them so the first is primary (04 §5.6).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from .model import CATEGORY_ORDER, Offer, Snapshot
from .numeric import CENT, ONE, ZERO, clamp01, div
from .projection import (ExtraLot, HORIZON, WeekRow, capacity_peaks, overflow_for,
                         project_all)

# 04 §5.6 risk-type tiebreak order (lower = sorts first).
_TYPE_RANK = {"DATA_QUALITY": 0, "SHORT_LIFE_CAPACITY": 1, "BUDGET_TRADEOFF": 2,
              "SHORTAGE": 3, "DONATION_MISMATCH": 4}


@dataclass
class Risk:  # SHORTAGE
    risk_id: str
    category_id: str
    is_primary: bool
    first_breach_week_index: int
    first_breach_week_start: str
    min_wos: Decimal
    target_wos: Decimal
    conservative_end_inventory_at_breach: Decimal
    conservative_end_wos_at_breach: Decimal
    target_end_inventory_lb: Decimal
    gap_to_target_lb: Decimal
    shortage_depth: Decimal
    priority_score: Decimal
    risk_type: str = "SHORTAGE"

    @property
    def order_week(self) -> int:
        return self.first_breach_week_index


@dataclass
class ShortLifeRisk:
    risk_id: str
    category_id: str
    offer_id: str
    is_primary: bool
    full_accept_peak_lb: Decimal
    capacity_lb: Decimal
    overflow_lb: Decimal
    full_accept_spoilage_lb: Decimal
    expected_usable_offer_lb: Decimal
    spoilage_rate: Decimal
    priority_score: Decimal
    risk_type: str = "SHORT_LIFE_CAPACITY"
    order_week: int = 1


@dataclass
class MismatchRisk:
    risk_id: str
    category_id: str
    offer_id: str
    is_primary: bool
    offered_gross_lb: Decimal
    offered_target_inventory_lb: Decimal
    mismatch_ratio: Decimal
    essential_below_target: list[dict]
    priority_score: Decimal
    risk_type: str = "DONATION_MISMATCH"
    order_week: int = 1


@dataclass
class BudgetTradeoffRisk:
    risk_id: str
    is_primary: bool
    component_risk_ids: list[str]
    cheapest_costs_usd: dict[str, Decimal]
    required_combined_cost_usd: Decimal
    remaining_budget_usd: Decimal
    budget_shortfall_usd: Decimal
    budget_shortfall_ratio: Decimal
    priority_score: Decimal
    category_id: None = None
    risk_type: str = "BUDGET_TRADEOFF"
    order_week: int = 1


def _shortage_for(snap: Snapshot, cat: str, forecast_c: Decimal,
                  cons_rows: list[WeekRow]) -> Risk | None:
    policy = snap.policies[cat]
    min_wos, target_wos = policy.min_wos, policy.target_wos
    breach_t = next((t for t in range(HORIZON)
                     if cons_rows[t].end_wos is not None and cons_rows[t].end_wos < min_wos), None)
    if breach_t is None:
        return None
    row = cons_rows[breach_t]
    wos = row.end_wos
    target_end = target_wos * forecast_c
    gap = max(ZERO, target_end - row.ending_lb + row.unmet_lb)
    depth = clamp01(div(min_wos - wos, max(min_wos, CENT)))
    essential = ONE if policy.essential else ZERO
    priority = (Decimal(50) + Decimal(5) * essential
                + Decimal(5) * div(policy.priority_weight, Decimal(5)) + Decimal(9) * depth)
    letter = _letter(snap)
    return Risk(
        risk_id=f"RISK-{letter}-{cat}-W{breach_t + 1}", category_id=cat, is_primary=False,
        first_breach_week_index=breach_t + 1, first_breach_week_start=snap.weeks[breach_t],
        min_wos=min_wos, target_wos=target_wos,
        conservative_end_inventory_at_breach=row.ending_lb, conservative_end_wos_at_breach=wos,
        target_end_inventory_lb=target_end, gap_to_target_lb=gap,
        shortage_depth=depth, priority_score=priority,
    )


def _letter(snap: Snapshot) -> str:
    return snap.scenario_id.split("-")[1] if "-" in snap.scenario_id else "X"


def offer_reference(snap: Snapshot, forecast: dict[str, Decimal], offer: Offer) -> dict:
    """Full-accept reference metrics for an offer (04 §5.2): overflow + expiry spoilage."""
    lot = ExtraLot(offer.category_id, offer.arrival_week_start, offer.gross_lb, "CONFIRMED",
                   ONE, offer.storage, offer.yield_ratio, offer.usable_life_days,
                   lot_id="REF-OFFER", track=True)
    stats: dict = {}
    project_all(snap, forecast, "conservative", [lot], stats)
    peaks = capacity_peaks(snap, forecast, [lot])
    cap = snap.warehouse.capacity_lb[offer.storage]
    expected_usable = offer.gross_lb * offer.yield_ratio
    spoiled = stats.get("REF-OFFER", {}).get("spoiled", ZERO)
    peak = max(peaks[offer.storage])
    return {"peak": peak, "capacity": cap, "overflow": overflow_for(peaks, offer.storage, cap),
            "spoilage": spoiled, "expected_usable": expected_usable,
            "spoilage_rate": div(spoiled, max(expected_usable, CENT))}


def _short_life_for(snap: Snapshot, offer: Offer, ref: dict) -> ShortLifeRisk | None:
    if not (ref["overflow"] > CENT or ref["spoilage_rate"] > Decimal("0.10")):
        return None
    factor = max(clamp01(div(ref["overflow"], max(ref["capacity"], CENT))),
                 clamp01(ref["spoilage_rate"]))
    priority = Decimal(80) + Decimal(9) * factor
    return ShortLifeRisk(
        risk_id=f"RISK-{_letter(snap)}-{_offer_slug(offer)}-OFFER",
        category_id=offer.category_id, offer_id=offer.offer_id, is_primary=False,
        full_accept_peak_lb=ref["peak"], capacity_lb=ref["capacity"], overflow_lb=ref["overflow"],
        full_accept_spoilage_lb=ref["spoilage"], expected_usable_offer_lb=ref["expected_usable"],
        spoilage_rate=ref["spoilage_rate"], priority_score=priority,
    )


def _offer_slug(offer: Offer) -> str:
    return "PRODUCE" if offer.category_id == "PRODUCE" else offer.category_id


def _mismatch_for(snap: Snapshot, offer: Offer, forecast: dict[str, Decimal],
                  cons: dict[str, list[WeekRow]], exp: dict[str, list[WeekRow]]) -> MismatchRisk | None:
    cat = offer.category_id
    policy = snap.policies[cat]
    arrival_t = snap.week_index(offer.arrival_week_start) or 1
    arrival_wos = exp[cat][arrival_t - 1].end_wos
    cond1 = (not policy.essential) or (arrival_wos is not None and arrival_wos >= policy.target_wos)
    below: list[dict] = []
    for c in CATEGORY_ORDER:
        p = snap.policies[c]
        if not p.essential:
            continue
        series = [cons[c][t].end_wos for t in range(HORIZON)]
        if any(w is not None and w < p.target_wos for w in series):
            below.append({"category_id": c, "conservative_end_wos_by_week": series,
                          "target_wos": p.target_wos})
    if not (cond1 and below and offer.gross_lb > ZERO):
        return None
    expected_usable = offer.gross_lb * offer.yield_ratio
    target_inv = policy.target_wos * forecast[cat]
    ratio = clamp01(div(expected_usable, max(target_inv, CENT)))
    priority = Decimal(70) + Decimal(9) * ratio
    return MismatchRisk(
        risk_id=f"RISK-{_letter(snap)}-SNACK-MISMATCH" if cat == "SNACKS_DISCRETIONARY"
                else f"RISK-{_letter(snap)}-{cat}-MISMATCH",
        category_id=cat, offer_id=offer.offer_id, is_primary=False,
        offered_gross_lb=offer.gross_lb, offered_target_inventory_lb=target_inv,
        mismatch_ratio=ratio, essential_below_target=below, priority_score=priority,
    )


def _budget_tradeoff(snap: Snapshot, forecast: dict[str, Decimal],
                     shortages: list[Risk]) -> BudgetTradeoffRisk | None:
    budget = snap.warehouse.budget_usd
    costs: dict[str, Decimal] = {}
    comp_ids: dict[str, str] = {}
    for s in shortages:
        c = _cheapest_qualifying_purchase(snap, forecast, s)
        if c is not None:
            costs[s.category_id] = c
            comp_ids[s.category_id] = s.risk_id
    if len(costs) < 2:
        return None
    combined = sum(costs.values(), ZERO)
    if combined <= budget:
        return None
    shortfall = combined - budget
    ratio = clamp01(div(shortfall, max(combined, CENT)))
    priority = Decimal(70) + Decimal(9) * ratio
    # Order competing categories the way the risks sort: earliest breach / highest
    # priority first (Scenario D: dairy W1 before protein W2).
    ordered = sorted((s for s in shortages if s.category_id in costs),
                     key=lambda s: (s.first_breach_week_index, -s.priority_score))
    ordered_cats = [s.category_id for s in ordered]
    return BudgetTradeoffRisk(
        risk_id=f"RISK-{_letter(snap)}-BUDGET", is_primary=False,
        component_risk_ids=[comp_ids[c] for c in ordered_cats],
        cheapest_costs_usd={c: costs[c] for c in ordered_cats},
        required_combined_cost_usd=combined, remaining_budget_usd=budget,
        budget_shortfall_usd=shortfall, budget_shortfall_ratio=ratio, priority_score=priority,
    )


def _cheapest_qualifying_purchase(snap: Snapshot, forecast: dict[str, Decimal],
                                  shortage: Risk) -> Decimal | None:
    best: Decimal | None = None
    budget = snap.warehouse.budget_usd
    for a in snap.actions:
        if a.action_type != "PURCHASE" or a.category_id != shortage.category_id:
            continue
        idx = snap.week_index(a.arrival_week_start) if a.arrival_week_start else None
        if idx is None or idx > shortage.first_breach_week_index:
            continue
        if not (a.minimum_lb <= a.requested_lb <= a.maximum_lb):
            continue
        if a.computed_cost > budget:  # individually affordable (04 §5.5)
            continue
        lot = ExtraLot(a.category_id, a.arrival_week_start, a.requested_lb, "CONFIRMED",
                       ONE, a.storage, a.yield_ratio, a.usable_life_days)
        peaks = capacity_peaks(snap, forecast, [lot])
        if overflow_for(peaks, a.storage, snap.warehouse.capacity_lb[a.storage]) > CENT:
            continue
        if best is None or a.computed_cost < best:
            best = a.computed_cost
    return best


def detect_risks(snap: Snapshot, forecast: dict[str, Decimal],
                 cons: dict[str, list[WeekRow]], exp: dict[str, list[WeekRow]]) -> list:
    risks: list = []
    shortages = [r for cat in CATEGORY_ORDER
                 if (r := _shortage_for(snap, cat, forecast[cat], cons[cat]))]
    risks += shortages
    for offer in snap.offers:
        ref = offer_reference(snap, forecast, offer)
        if (sl := _short_life_for(snap, offer, ref)):
            risks.append(sl)
        if (mm := _mismatch_for(snap, offer, forecast, cons, exp)):
            risks.append(mm)
    if (bt := _budget_tradeoff(snap, forecast, shortages)):
        risks.append(bt)

    risks.sort(key=lambda r: (-r.priority_score, r.order_week,
                              _TYPE_RANK[r.risk_type],
                              CATEGORY_ORDER.index(r.category_id) if r.category_id else -1,
                              r.risk_id))
    if risks:
        risks[0].is_primary = True
    return risks
