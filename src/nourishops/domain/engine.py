"""Top-level deterministic analysis (04 §5-10 orchestration).

analyze(snapshot) runs the ordered stages — forecast, data-quality gate,
projection, risk detection, candidate evaluation, ranking, recommendation,
confidence — and returns a plain dict comparable to golden/scenario_*.golden.json.
"""
from __future__ import annotations

from decimal import Decimal

from .actions import Context, Eval, evaluate_actions
from .forecast import forecast_distribution
from .model import Snapshot
from .numeric import CENT, CTX, ONE, ZERO, clamp01, div
from .projection import capacity_peaks, coverage, project_all
from .risk import detect_risks
from .validation import build_data_quality_risk, validate


def _population_std(values: list[Decimal]) -> Decimal:
    n = Decimal(len(values))
    mean = div(sum(values, ZERO), n)
    var = div(sum(((v - mean) * (v - mean) for v in values), ZERO), n)
    return var.sqrt(CTX)


def _forecast_stability(snap: Snapshot, cats: list[str]) -> Decimal:
    """Priority-weighted mean of per-category forecast stability (04 §10.1)."""
    num = den = ZERO
    for c in cats:
        last4 = snap.last_four_distributed_lb[c]
        mean = div(sum(last4, ZERO), Decimal(4))
        fs = clamp01(ONE - div(_population_std(last4), max(mean, CENT)))
        w = snap.policies[c].priority_weight
        num += w * fs
        den += w
    return div(num, den)


def _confidence(snap, ctx, top: Eval, second: Eval | None, warnings: int) -> dict:
    reliability = top.components["P"]
    data_quality = ONE if warnings == 0 else Decimal("0.75")
    forecast_stability = _forecast_stability(snap, ctx.fs_categories)
    rank_margin = ONE if (second is None or second.score is None) \
        else clamp01(div(top.score - second.score, Decimal(100)))
    value = (Decimal("0.35") * reliability + Decimal("0.25") * data_quality
             + Decimal("0.20") * forecast_stability + Decimal("0.10") * ONE
             + Decimal("0.10") * rank_margin)
    label = ("HIGH" if value >= Decimal("0.80")
             else "MEDIUM" if value >= Decimal("0.60")
             else "LOW" if value >= Decimal("0.45") else "ABSTAIN")
    return {"confidence_value": value, "confidence": label,
            "inputs": {"action_reliability": reliability, "data_quality": data_quality,
                       "forecast_stability": forecast_stability,
                       "evidence_completeness": ONE, "rank_margin": rank_margin}}


def _build_context(snap: Snapshot, primary, shortages) -> Context:
    if primary.risk_type == "SHORTAGE":
        c = primary.category_id
        return Context("SHORTAGE", primary.risk_id, categories=[c],
                       breach_week={c: primary.first_breach_week_index},
                       shortage_risk_id={c: primary.risk_id}, fs_categories=[c])
    if primary.risk_type == "BUDGET_TRADEOFF":
        cats = list(primary.cheapest_costs_usd.keys())
        return Context("BUDGET_TRADEOFF", primary.risk_id, categories=cats,
                       breach_week={s.category_id: s.first_breach_week_index for s in shortages},
                       shortage_risk_id={s.category_id: s.risk_id for s in shortages},
                       fs_categories=cats)
    offer = next(o for o in snap.offers if o.offer_id == primary.offer_id)
    priority = snap.policies[offer.category_id].priority_weight
    ctx = Context(primary.risk_type, primary.risk_id, offer=offer, offer_priority=priority,
                  expected_usable_offer=offer.gross_lb * offer.yield_ratio,
                  fs_categories=[offer.category_id])
    if primary.risk_type == "SHORT_LIFE_CAPACITY":
        ctx.ref_overflow = primary.overflow_lb
        ctx.ref_spoilage = primary.full_accept_spoilage_lb
        ctx.expected_usable_offer = primary.expected_usable_offer_lb
    return ctx


def analyze(snap: Snapshot) -> dict:
    forecast = forecast_distribution(snap)

    # DATA_QUALITY gate (04 §5.1): a decision-critical ERROR forces abstention.
    findings = validate(snap)
    errors = [f for f in findings if f.severity == "ERROR"]
    if errors:
        dq = build_data_quality_risk(snap, findings)
        affected: list[str] = []
        for f in errors:
            for r in f.record_ids:
                if str(r).startswith("INB") and r not in affected:
                    affected.append(r)
        return {"scenario_id": snap.scenario_id, "decision_status": "ABSTAINED",
                "forecast_distribution_lb": forecast, "risks": [dq],
                "projections": {"status": "NOT_RUN", "reason_code": "BLOCKING_DATA_QUALITY",
                                "affected_record_ids": affected},
                "action_evaluations": [], "ranking": [], "recommended_action": None,
                "blocking_issues": findings}
    warnings = sum(1 for f in findings if f.severity == "WARNING")

    cons = project_all(snap, forecast, "conservative")
    exp = project_all(snap, forecast, "expected")
    peaks = capacity_peaks(snap, forecast)
    risks = detect_risks(snap, forecast, cons, exp)

    result: dict = {
        "scenario_id": snap.scenario_id, "forecast_distribution_lb": forecast, "risks": risks,
        "projections": {"conservative": cons, "expected": exp, "capacity_peaks": peaks,
                        "conservative_coverage": coverage(snap, forecast, cons),
                        "expected_coverage": coverage(snap, forecast, exp)},
        "blocking_issues": findings,
    }
    if not risks:
        result["decision_status"] = "NO_ACTION_REQUIRED"
        return result

    primary = risks[0]
    shortages = [r for r in risks if r.risk_type == "SHORTAGE"]
    ctx = _build_context(snap, primary, shortages)
    evals = evaluate_actions(snap, ctx, forecast, cons, exp, peaks)
    result["action_evaluations"] = evals
    ranked = sorted((e for e in evals if e.rank is not None), key=lambda e: e.rank)
    result["ranking"] = [e.action.action_id for e in ranked]
    if not ranked:
        result["decision_status"] = "ABSTAINED"
        return result

    top, second = ranked[0], (ranked[1] if len(ranked) > 1 else None)
    conf = _confidence(snap, ctx, top, second, warnings)
    letter = snap.scenario_id.split("-")[1]
    rec = {"recommendation_id": f"REC-{letter}-001", "risk_id": primary.risk_id,
           "action_id": top.action.action_id, "evaluated_action_id": top.evaluated_action_id,
           "requested_quantity_lb": int(top.action.requested_lb), "cost_usd": top.cost_usd,
           "requires_human_approval": True, **conf}
    if top.gap_reduction_lb is not None:
        rec["gap_reduction_lb"] = top.gap_reduction_lb
    if top.expected_usable_lb is not None:
        rec["expected_usable_quantity_lb"] = top.expected_usable_lb
    if top.expected_useful_disposition_lb is not None:
        rec["expected_useful_disposition_lb"] = top.expected_useful_disposition_lb
    if top.action.action_type in ("REDIRECT_DONATION",) and top.action.category_id:
        # synthetic destination is fixture provenance, never an authorized write.
        pass
    result["recommended_action"] = rec
    result["decision_status"] = "READY_FOR_REVIEW" if conf["confidence"] != "ABSTAIN" else "ABSTAINED"
    return result
