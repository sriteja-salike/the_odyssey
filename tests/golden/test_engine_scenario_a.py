"""End-to-end engine test: run the real loader + engine on Scenario A and assert
the output reproduces golden/scenario_a.golden.json (04 §19 oracle parity).

Unlike test_scenario_a_anchors.py (which recomputes anchors independently), this
drives the actual src/nourishops engine — it is the regression that proves Steps
2-4 (load, risk detect, rank) are wired correctly.
"""
from __future__ import annotations

from decimal import Decimal

from nourishops.application.loader import load_scenario
from nourishops.domain.engine import analyze
from tests.support import GOLDEN, close, load

GOLD = load(GOLDEN / "scenario_a.golden.json")


def _result():
    return analyze(load_scenario("scenario_a"))


def test_forecast_matches_golden():
    fc = _result()["forecast_distribution_lb"]
    for cat, expected in GOLD["forecast_distribution_lb"].items():
        assert fc[cat] == Decimal(expected), cat


def test_conservative_endings_all_categories():
    cons = _result()["projections"]["conservative"]
    golden = GOLD["projections"]["baseline"]["all_category_conservative_ending_inventory_lb"]
    for cat, series in golden.items():
        got = [int(cons[cat][t].ending_lb) for t in range(4)]
        assert got == series, cat


def test_weighted_coverage_and_peaks():
    r = _result()["projections"]
    base = GOLD["projections"]["baseline"]
    assert close(r["conservative_coverage"]["horizon"],
                 base["horizon_conservative_weighted_coverage"])
    assert close(r["expected_coverage"]["horizon"],
                 base["horizon_expected_weighted_coverage"])
    frozen_peaks = [int(r["capacity_peaks"]["FROZEN"][t]) for t in range(4)]
    assert [str(p) for p in frozen_peaks] == base["capacity_stress_frozen_peak_lb_by_week"]


def test_primary_risk():
    risk = _result()["risks"][0]
    g = GOLD["risks"][0]
    assert risk.risk_id == g["risk_id"]
    assert risk.is_primary is True
    assert risk.first_breach_week_start == g["first_breach_week_start"]
    assert int(risk.gap_to_target_lb) == int(g["gap_to_target_lb"])
    assert close(risk.priority_score, g["priority_score"])
    assert close(risk.conservative_end_wos_at_breach, g["conservative_end_wos_at_breach"])


def test_action_scores_and_feasibility():
    evals = {e.action.action_id: e for e in _result()["action_evaluations"]}
    for g in GOLD["action_evaluations"]:
        e = evals[g["action_id"]]
        assert e.feasible == g["feasible"], g["action_id"]
        assert sorted(e.failed_codes) == sorted(g["failed_constraint_codes"]), g["action_id"]
        if g["score_components"]:
            for k, v in g["score_components"].items():
                assert close(e.components[k], v), f"{g['action_id']}.{k}"
            assert close(e.score, g["score_unrounded"]), g["action_id"]
            assert e.rank == g["rank"], g["action_id"]


def test_ranking_and_recommendation():
    r = _result()
    assert r["ranking"] == GOLD["ranking"]
    rec = r["recommended_action"]
    g = GOLD["recommended_action"]
    assert rec["recommendation_id"] == g["recommendation_id"]
    assert rec["action_id"] == g["action_id"]
    assert rec["confidence"] == g["confidence"]
    assert close(rec["confidence_value"], g["confidence_value"])
    for k, v in g["confidence_inputs"].items():
        assert close(rec["inputs"][k], v), k


def test_decision_status():
    assert _result()["decision_status"] == GOLD["decision_status"]
