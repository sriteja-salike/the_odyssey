"""Scenario A regression anchors, recomputed independently from FIXTURES (not
read back from the golden) and asserted against golden/scenario_a.golden.json.

This encodes the two-person independent confirmation of 12,000 / 15,000 / 61
(BACKEND_HANDOFF §10) as a test, and is the first demonstration of the Decimal
discipline (04 §4.0): every value below is Decimal, no binary float.

Scope: PROTEIN, conservative view only — conservative (CONFIRMED inbound only)
is what drives breach detection (04 §4.3). The full engine widens this; this
test is the anchor everything else regresses against.
"""
from __future__ import annotations

from decimal import Decimal

from tests.support import DEC, FIXTURES, GOLDEN, close, load

# W1..W4 for Scenario A (from the overlay's forecast_week_starts).
WEEKS = ["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"]


def _last_four_mean(distributed: list[int]) -> Decimal:
    # 04 §4.1: forecast = simple mean of the four most-recent completed weeks.
    four = [Decimal(x) for x in distributed[-4:]]
    return DEC.divide(sum(four, Decimal(0)), Decimal(4))


def _protein_conservative_inbound() -> list[Decimal]:
    """CONFIRMED protein inbound per week AFTER applying the Scenario A overlay.

    Overlay is field replacement, not additive merge (03 §2.5); conservative
    excludes PROBABLE/UNCONFIRMED (04 §4.3).
    """
    records = load(FIXTURES / "planned_inbound.json")["records"]
    overlay = load(FIXTURES / "scenarios" / "scenario_a.json")["overlay"]
    mutations = {m["inbound_id"]: m["set"] for m in overlay["inbound_mutations"]}
    removed = set(overlay["remove_inbound_ids"])

    per_week = [Decimal(0), Decimal(0), Decimal(0), Decimal(0)]
    for base in records:
        if base["inbound_id"] in removed or base["category_id"] != "PROTEIN":
            continue
        rec = {**base, **mutations.get(base["inbound_id"], {})}
        if rec["status"] != "CONFIRMED":
            continue
        week = rec["expected_week_start"]
        if week in WEEKS:
            yield_ratio = Decimal(str(rec["expected_usable_yield_ratio"]))
            per_week[WEEKS.index(week)] += Decimal(rec["gross_quantity_lb"]) * yield_ratio
    return per_week


def test_scenario_a_protein_anchors():
    golden = load(GOLDEN / "scenario_a.golden.json")
    flow = {s["category_id"]: s for s in load(FIXTURES / "historical_weekly_category_flow.json")["series"]}
    policy = {p["category_id"]: p for p in load(FIXTURES / "category_policies.json")["records"]}["PROTEIN"]

    # --- forecast (04 §4.1): mean of last-4 distributed = 9,000 ---
    forecast = _last_four_mean(flow["PROTEIN"]["distributed_lb"])
    assert forecast == Decimal(9000)
    assert forecast == Decimal(golden["forecast_distribution_lb"]["PROTEIN"])

    # --- conservative roll-forward (04 §4.3, §4.5): 30k -> 21k -> 12k -> 12k ---
    opening = Decimal(flow["PROTEIN"]["ending_inventory_lb"][-1])  # 30,000
    inbound = _protein_conservative_inbound()  # [0, 0, 9000, 9000]
    endings: list[Decimal] = []
    begin = opening
    for t in range(4):
        available = begin + inbound[t]
        fulfilled = min(forecast, available)
        ending = max(Decimal(0), available - fulfilled)  # no protein expiry in this window
        endings.append(ending)
        begin = ending
    golden_series = golden["projections"]["baseline"]["all_category_conservative_ending_inventory_lb"]["PROTEIN"]
    assert [int(e) for e in endings] == golden_series == [21000, 12000, 12000, 12000]

    # --- first breach: conservative WOS strictly < minimum (04 §4.5) ---
    min_wos = Decimal(str(policy["minimum_weeks_of_supply"]))   # 1.5
    target_wos = Decimal(str(policy["target_weeks_of_supply"]))  # 3.0
    breach_idx = next(t for t in range(4) if DEC.divide(endings[t], forecast) < min_wos)
    risk = golden["risks"][0]
    assert breach_idx == 1  # zero-based W2
    assert risk["first_breach_week_start"] == WEEKS[breach_idx] == "2026-08-10"
    assert risk["first_breach_week_index"] == 2

    wos_at_breach = DEC.divide(endings[breach_idx], forecast)  # 12,000 / 9,000
    assert close(wos_at_breach, risk["conservative_end_wos_at_breach"])

    # --- gap to target (04 §4.5): 3.0*9000 - 12000 = 15,000 ---
    target_end = target_wos * forecast
    gap = max(Decimal(0), target_end - endings[breach_idx])  # + conservative unmet (0)
    assert gap == Decimal(15000)
    assert gap == Decimal(risk["gap_to_target_lb"])

    # --- SHORTAGE priority score (04 §4.6): 50 + 5 + 5 + 9*depth = 61 ---
    depth = min(Decimal(1), max(Decimal(0), (min_wos - wos_at_breach) / min_wos))
    essential = Decimal(1) if policy["essential_assortment"] else Decimal(0)
    weight = Decimal(policy["priority_weight"])
    priority = Decimal(50) + Decimal(5) * essential + Decimal(5) * (weight / Decimal(5)) + Decimal(9) * depth
    assert close(priority, risk["priority_score"])
    assert close(priority, Decimal(61))
