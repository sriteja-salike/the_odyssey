"""Action effects, hard constraints, scoring, ranking (04 §6-10).

Four risk-type scoring branches share one score = 100·(0.45R+0.20M+0.10T+0.10P+
0.10E+0.05S) and one deterministic tie-break. Each candidate is simulated on an
isolated copy of the same starting state; a failed hard constraint drops it from
ranking but keeps it visible with reason codes.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from .model import Action, Offer, Snapshot
from .numeric import CENT, ONE, ZERO, cents, clamp01, div
from .projection import (ExtraLot, HORIZON, WeekRow, capacity_peaks, coverage,
                         overflow_for, project_all, project_category)

W = {"R": Decimal("0.45"), "M": Decimal("0.20"), "T": Decimal("0.10"),
     "P": Decimal("0.10"), "E": Decimal("0.10"), "S": Decimal("0.05")}
BURDEN = {"LOW": ONE, "MEDIUM": Decimal("0.5"), "HIGH": ZERO}
TYPE_ORDER = ["PURCHASE", "REQUEST_TRANSFER", "PARTIAL_ACCEPT", "REDIRECT_DONATION",
              "TARGETED_DONOR_REQUEST", "ACCELERATE_DISTRIBUTION", "DECLINE_DONATION",
              "ACCEPT_DONATION", "MONITOR"]
_ACCEPT = ("ACCEPT_DONATION", "PARTIAL_ACCEPT")
TENTH = Decimal("0.10")


@dataclass
class Context:
    risk_type: str
    primary_risk_id: str
    categories: list[str] = field(default_factory=list)          # supply burden set
    breach_week: dict[str, int] = field(default_factory=dict)
    shortage_risk_id: dict[str, str] = field(default_factory=dict)
    fs_categories: list[str] = field(default_factory=list)        # confidence stability
    offer: Offer | None = None
    offer_priority: Decimal = ZERO
    expected_usable_offer: Decimal = ZERO
    ref_overflow: Decimal = ZERO
    ref_spoilage: Decimal = ZERO


@dataclass
class Eval:
    action: Action
    evaluated_action_id: str
    cost_usd: Decimal
    feasible: bool
    failed_codes: list[str] = field(default_factory=list)
    failed_detail: list[dict] = field(default_factory=list)
    components: dict[str, Decimal] | None = None
    score: Decimal | None = None
    rank: int | None = None
    burden_reduction_cons: Decimal = ZERO
    gap_reduction_lb: Decimal | None = None
    coverage_gain: Decimal | None = None
    expected_usable_lb: Decimal | None = None
    expected_useful_disposition_lb: Decimal | None = None
    unresolved_risk_ids: list[str] | None = None
    mission_note: str | None = None


def _eval_id(a: Action) -> str:
    return f"EVAL-{a.action_id}-{int(a.requested_lb)}"


def _arrival_index(snap: Snapshot, a: Action) -> int | None:
    if a.arrival_week_start is not None:
        return snap.week_index(a.arrival_week_start)
    if a.action_type == "MONITOR":
        return None
    return 1 + int(a.lead_time_days) // 7


def _supply_lots(snap: Snapshot, a: Action) -> list[ExtraLot]:
    idx = _arrival_index(snap, a)
    if idx is None or a.category_id is None:
        return []
    if a.action_type == "TARGETED_DONOR_REQUEST":
        status, prob = "PROBABLE", a.success_probability
    else:
        status, prob = "CONFIRMED", ONE
    return [ExtraLot(a.category_id, snap.weeks[idx - 1], a.requested_lb, status, prob,
                     a.storage, a.yield_ratio, a.usable_life_days)]


def _accept_lot(snap: Snapshot, a: Action, offer: Offer) -> ExtraLot:
    return ExtraLot(offer.category_id, offer.arrival_week_start, a.requested_lb, "CONFIRMED",
                    ONE, a.storage, a.yield_ratio, a.usable_life_days,
                    lot_id="ACCEPT", track=True)


def _burden(snap: Snapshot, cat: str, forecast_c: Decimal, rows: list[WeekRow]) -> Decimal:
    target_inv = snap.policies[cat].target_wos * forecast_c
    wr = div(snap.policies[cat].priority_weight, Decimal(5))
    return sum((wr * div(ONE, Decimal(t + 1))
                * (max(ZERO, target_inv - rows[t].ending_lb) + rows[t].unmet_lb)
                for t in range(HORIZON)), ZERO)


def _burden_set(snap: Snapshot, cats: list[str], forecast: dict[str, Decimal],
                rows_by_cat: dict[str, list[WeekRow]]) -> Decimal:
    return sum((_burden(snap, c, forecast[c], rows_by_cat[c]) for c in cats), ZERO)


def _cost_headroom(cost: Decimal, budget: Decimal) -> Decimal:
    return ONE if cost == ZERO else clamp01(ONE - div(cost, max(budget, CENT)))


def _storage_eff(snap: Snapshot, storage: str, forecast: dict[str, Decimal],
                 lots: list[ExtraLot], base_peaks: dict[str, list[Decimal]]) -> Decimal:
    if not lots or storage == "NONE":
        return ONE
    peaks = capacity_peaks(snap, forecast, lots)
    incr = max((max(ZERO, peaks[storage][t] - base_peaks[storage][t]) for t in range(HORIZON)),
               default=ZERO)
    return clamp01(ONE - div(incr, max(snap.warehouse.capacity_lb[storage], CENT)))


# ---------------------------------------------------------------- constraints

def _constraints_supply(snap: Snapshot, a: Action, ctx: Context,
                        base_peaks: dict[str, list[Decimal]],
                        forecast: dict[str, Decimal]) -> tuple[list[str], list[dict]]:
    codes: list[str] = []
    detail: list[dict] = []
    budget = snap.warehouse.budget_usd
    idx = _arrival_index(snap, a)
    if not (a.minimum_lb <= a.requested_lb <= a.maximum_lb
            and (a.requested_lb - a.minimum_lb) % a.increment_lb == ZERO):
        codes.append("CATALOG_AVAILABLE")
    if a.category_id not in ctx.categories:
        codes.append("CATEGORY_MATCH")
    if cents(a.computed_cost) > budget:
        codes.append("BUDGET")
        detail.append({"code": "BUDGET", "observed": str(cents(a.computed_cost)),
                       "limit": str(cents(budget)), "unit": "USD"})
    if idx is not None and not (1 <= idx <= HORIZON):
        codes.append("ARRIVES_IN_HORIZON")
    breach = ctx.breach_week.get(a.category_id) if a.category_id is not None else None
    if idx is not None and breach is not None and idx > breach:
        codes.append("ARRIVES_BY_BREACH")
        detail.append({"code": "ARRIVES_BY_BREACH", "observed": a.arrival_week_start,
                       "limit": snap.weeks[breach - 1], "unit": "week_start"})
    lots = _supply_lots(snap, a)
    peaks = capacity_peaks(snap, forecast, lots) if lots else base_peaks
    _capacity_codes(snap, peaks, codes, detail)
    if lots and ZERO < a.requested_lb < snap.warehouse.minimum_pickup_lb:
        codes.append("MINIMUM_PICKUP")
    return codes, detail


def _capacity_codes(snap: Snapshot, peaks, codes, detail) -> None:
    worst_s, worst_over = None, ZERO
    for s, series in peaks.items():
        cap = snap.warehouse.capacity_lb[s]
        over = overflow_for(peaks, s, cap)
        if over > CENT and over > worst_over:
            worst_s, worst_over = s, over
    if worst_s is not None:
        t_peak = max(range(HORIZON), key=lambda t: peaks[worst_s][t])
        codes.append("STORAGE_CAPACITY")
        detail.append({"code": "STORAGE_CAPACITY", "observed": str(peaks[worst_s][t_peak].quantize(ONE)),
                       "limit": str(snap.warehouse.capacity_lb[worst_s].quantize(ONE)),
                       "unit": f"lb {worst_s.lower()} peak"})


def _constraints_offer(snap: Snapshot, a: Action, ctx: Context,
                       forecast: dict[str, Decimal]) -> tuple[list[str], list[dict]]:
    codes: list[str] = []
    detail: list[dict] = []
    offer = ctx.offer
    assert offer is not None
    if a.category_id != offer.category_id:
        codes.append("CATEGORY_MATCH")
    if cents(a.computed_cost) > snap.warehouse.budget_usd:
        codes.append("BUDGET")
    if a.action_type in _ACCEPT:
        if not (a.minimum_lb <= a.requested_lb <= a.maximum_lb
                and (a.requested_lb - a.minimum_lb) % a.increment_lb == ZERO):
            codes.append("MINIMUM_ORDER")
        stats: dict = {}
        project_category(snap, offer.category_id, forecast[offer.category_id],
                         "conservative", [_accept_lot(snap, a, offer)], stats)
        peaks = capacity_peaks(snap, forecast, [_accept_lot(snap, a, offer)])
        cap = snap.warehouse.capacity_lb[a.storage]
        if overflow_for(peaks, a.storage, cap) > CENT:
            peak = max(peaks[a.storage])
            codes.append("STORAGE_CAPACITY")
            detail.append({"code": "STORAGE_CAPACITY", "observed": str(peak.quantize(ONE)),
                           "limit": str(cap.quantize(ONE)), "unit": f"lb {a.storage.lower()} peak"})
        accepted_usable = a.requested_lb * a.yield_ratio
        spoiled = stats.get("ACCEPT", {}).get("spoiled", ZERO)
        if spoiled > accepted_usable * TENTH + CENT:
            codes.append("USABLE_LIFE")
            detail.append({"code": "USABLE_LIFE", "observed": str(spoiled.quantize(ONE)),
                           "limit": str((accepted_usable * TENTH).quantize(ONE)),
                           "unit": "lb expiry spoilage"})
        if ZERO < a.requested_lb < snap.warehouse.minimum_pickup_lb:
            codes.append("MINIMUM_PICKUP")
    return codes, detail


# ---------------------------------------------------------------- scoring

def _score_supply(snap, a, ctx, forecast, base_cons, base_exp, base_cov_exp,
                  base_peaks, base_bcons, base_bexp) -> Eval:
    cat = a.category_id
    assert cat is not None
    lots = _supply_lots(snap, a)
    act_cons_cat = project_category(snap, cat, forecast[cat], "conservative", lots)
    act_exp_all = project_all(snap, forecast, "expected", lots)
    a_cons = _burden_set(snap, ctx.categories, forecast, {**base_cons, cat: act_cons_cat})
    a_exp = _burden_set(snap, ctx.categories, forecast, {**base_exp, cat: act_exp_all[cat]})
    red_cons = clamp01(div(base_bcons - a_cons, max(base_bcons, CENT)))
    red_exp = clamp01(div(base_bexp - a_exp, max(base_bexp, CENT)))
    R = Decimal("0.70") * red_cons + Decimal("0.30") * red_exp

    act_cov = coverage(snap, forecast, act_exp_all)["horizon"]
    M = clamp01(div(act_cov - base_cov_exp, max(ONE - base_cov_exp, CENT)))
    idx = _arrival_index(snap, a)
    assert idx is not None
    T = clamp01(ONE - div(Decimal(idx - 1), max(Decimal(ctx.breach_week[cat]), ONE)))
    P = a.success_probability if a.action_type == "TARGETED_DONOR_REQUEST" else ONE
    E = (Decimal("0.40") * _cost_headroom(cents(a.computed_cost), snap.warehouse.budget_usd)
         + Decimal("0.30") * ONE
         + Decimal("0.30") * _storage_eff(snap, a.storage, forecast, lots, base_peaks))
    S = BURDEN[a.burden]
    ev = _finish(a, {"R": R, "M": M, "T": T, "P": P, "E": E, "S": S})
    ev.burden_reduction_cons = red_cons
    ev.coverage_gain = act_cov - base_cov_exp
    ev.expected_usable_lb = a.requested_lb * a.yield_ratio * P
    bw = ctx.breach_week[cat] - 1
    target_end = snap.policies[cat].target_wos * forecast[cat]
    if ctx.risk_type == "SHORTAGE":
        act_gap = max(ZERO, target_end - act_cons_cat[bw].ending_lb + act_cons_cat[bw].unmet_lb)
        base_gap = max(ZERO, target_end - base_cons[cat][bw].ending_lb + base_cons[cat][bw].unmet_lb)
        ev.gap_reduction_lb = base_gap - act_gap
    else:
        ev.unresolved_risk_ids = [ctx.shortage_risk_id[c] for c in ctx.categories if c != cat]
    return ev


def _score_short_life(snap, a, ctx, forecast, base_peaks) -> Eval:
    offer = ctx.offer
    exp_usable = ctx.expected_usable_offer
    if a.action_type in _ACCEPT:
        stats: dict = {}
        project_category(snap, offer.category_id, forecast[offer.category_id],
                         "conservative", [_accept_lot(snap, a, offer)], stats)
        peaks = capacity_peaks(snap, forecast, [_accept_lot(snap, a, offer)])
        act_overflow = overflow_for(peaks, a.storage, snap.warehouse.capacity_lb[a.storage])
        act_spoilage = stats.get("ACCEPT", {}).get("spoiled", ZERO)
        local_distributed = stats.get("ACCEPT", {}).get("distributed", ZERO)
        redirect_gross, storage = ZERO, a.storage
        lots = [_accept_lot(snap, a, offer)]
    else:
        act_overflow = act_spoilage = local_distributed = ZERO
        redirect_gross = a.requested_lb if a.action_type == "REDIRECT_DONATION" else ZERO
        storage, lots = "NONE", []
    ovf_avoid = ONE if ctx.ref_overflow == ZERO else clamp01(div(ctx.ref_overflow - act_overflow, ctx.ref_overflow))
    spo_avoid = ONE if ctx.ref_spoilage == ZERO else clamp01(div(ctx.ref_spoilage - act_spoilage, ctx.ref_spoilage))
    R = Decimal("0.50") * ovf_avoid + Decimal("0.50") * spo_avoid
    local_frac = clamp01(div(local_distributed, max(exp_usable, CENT)))
    redirect_frac = clamp01(div(redirect_gross * a.yield_ratio * a.success_probability, max(exp_usable, CENT)))
    M = clamp01((local_frac + Decimal("0.25") * redirect_frac) * div(ctx.offer_priority, Decimal(5)))
    P = ONE if a.action_type in _ACCEPT or a.action_type == "DECLINE_DONATION" else a.success_probability
    accepted_usable = a.requested_lb * a.yield_ratio if a.action_type in _ACCEPT else ZERO
    waste = ONE if accepted_usable == ZERO else clamp01(ONE - div(act_spoilage, max(accepted_usable, CENT)))
    E = (Decimal("0.40") * _cost_headroom(cents(a.computed_cost), snap.warehouse.budget_usd)
         + Decimal("0.30") * waste
         + Decimal("0.30") * _storage_eff(snap, storage, forecast, lots, base_peaks))
    ev = _finish(a, {"R": R, "M": M, "T": ONE, "P": P, "E": E, "S": BURDEN[a.burden]})
    ev.expected_usable_lb = local_distributed if a.action_type in _ACCEPT else redirect_gross
    return ev


def _score_mismatch(snap, a, ctx, forecast, base_peaks) -> Eval:
    offer = ctx.offer
    exp_usable = ctx.expected_usable_offer
    if a.action_type in _ACCEPT:
        stats: dict = {}
        project_category(snap, offer.category_id, forecast[offer.category_id],
                         "conservative", [_accept_lot(snap, a, offer)], stats)
        local_accepted = a.requested_lb
        useful = stats.get("ACCEPT", {}).get("distributed", ZERO)
        spoiled = stats.get("ACCEPT", {}).get("spoiled", ZERO)
        accepted_usable = a.requested_lb * a.yield_ratio
        waste = ONE if accepted_usable == ZERO else clamp01(ONE - div(spoiled, max(accepted_usable, CENT)))
        storage, lots = a.storage, [_accept_lot(snap, a, offer)]
    elif a.action_type == "REDIRECT_DONATION":
        local_accepted = ZERO
        useful = a.requested_lb * a.yield_ratio * a.success_probability
        waste, storage, lots = ONE, "NONE", []
    else:  # DECLINE_DONATION
        local_accepted = useful = ZERO
        waste, storage, lots = ONE, "NONE", []
    unsuitable_avoid = ONE - clamp01(div(local_accepted, max(offer.gross_lb, CENT)))
    useful_frac = clamp01(div(useful, max(exp_usable, CENT)))
    R = Decimal("0.70") * unsuitable_avoid + Decimal("0.30") * useful_frac
    M = clamp01(useful_frac * div(ctx.offer_priority, Decimal(5)))
    P = ONE if a.action_type in _ACCEPT or a.action_type == "DECLINE_DONATION" else a.success_probability
    E = (Decimal("0.40") * _cost_headroom(cents(a.computed_cost), snap.warehouse.budget_usd)
         + Decimal("0.30") * waste
         + Decimal("0.30") * _storage_eff(snap, storage, forecast, lots, base_peaks))
    ev = _finish(a, {"R": R, "M": M, "T": ONE, "P": P, "E": E, "S": BURDEN[a.burden]})
    ev.expected_useful_disposition_lb = useful
    if a.action_type in _ACCEPT:
        ev.mission_note = "Does not address a current priority gap"
    return ev


def _finish(a: Action, comps: dict[str, Decimal]) -> Eval:
    score = Decimal(100) * sum((W[k] * comps[k] for k in ("R", "M", "T", "P", "E", "S")), ZERO)
    return Eval(action=a, evaluated_action_id=_eval_id(a), cost_usd=cents(a.computed_cost),
                feasible=True, components=comps, score=score)


# ---------------------------------------------------------------- driver

def evaluate_actions(snap, ctx, forecast, base_cons, base_exp, base_peaks) -> list[Eval]:
    supply = ctx.risk_type in ("SHORTAGE", "BUDGET_TRADEOFF")
    base_cov_exp = coverage(snap, forecast, base_exp)["horizon"]
    base_bcons = _burden_set(snap, ctx.categories, forecast, base_cons) if supply else ZERO
    base_bexp = _burden_set(snap, ctx.categories, forecast, base_exp) if supply else ZERO
    evals: list[Eval] = []
    for a in snap.actions:
        if a.action_type == "MONITOR":
            evals.append(Eval(a, _eval_id(a), cents(a.computed_cost), False, ["MONITOR_NOT_SAFE"]))
            continue
        if supply:
            codes, detail = _constraints_supply(snap, a, ctx, base_peaks, forecast)
        else:
            codes, detail = _constraints_offer(snap, a, ctx, forecast)
        if codes:
            evals.append(Eval(a, _eval_id(a), cents(a.computed_cost), False, codes, detail))
            continue
        if supply:
            evals.append(_score_supply(snap, a, ctx, forecast, base_cons, base_exp,
                                       base_cov_exp, base_peaks, base_bcons, base_bexp))
        elif ctx.risk_type == "SHORT_LIFE_CAPACITY":
            evals.append(_score_short_life(snap, a, ctx, forecast, base_peaks))
        else:
            evals.append(_score_mismatch(snap, a, ctx, forecast, base_peaks))
    _rank(evals)
    return evals


def _rank(evals: list[Eval]) -> None:
    feasible = [e for e in evals if e.feasible and e.score is not None]

    def ranking_key(evaluation: Eval):
        assert evaluation.score is not None
        assert evaluation.components is not None
        return (
            -evaluation.score, -evaluation.components["R"],
            -evaluation.burden_reduction_cons, evaluation.cost_usd,
            evaluation.action.requested_lb,
            TYPE_ORDER.index(evaluation.action.action_type), evaluation.action.action_id,
        )

    feasible.sort(key=ranking_key)
    for i, e in enumerate(feasible, 1):
        e.rank = i
