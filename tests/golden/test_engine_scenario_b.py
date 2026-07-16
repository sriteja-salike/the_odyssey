"""End-to-end engine test for Scenario B: a big short-life offer (04 §5.2).

Full acceptance overflows the fridge and spoils; the engine must recommend the
safe partial accept — reproducing golden/scenario_b.golden.json.
"""
from __future__ import annotations

from nourishops.application.loader import load_scenario
from nourishops.domain.engine import analyze
from tests.support import GOLDEN, close, load

GOLD = load(GOLDEN / "scenario_b.golden.json")


def _result():
    return analyze(load_scenario("scenario_b"))


def test_short_life_capacity_risk():
    risks = {r.risk_id: r for r in _result()["risks"]}
    sl = risks["RISK-B-PRODUCE-OFFER"]
    g = GOLD["risks"][0]
    assert sl.is_primary is True
    assert int(sl.overflow_lb) == int(g["overflow_lb"]) == 10000
    assert int(sl.full_accept_spoilage_lb) == int(g["full_accept_expiry_spoilage_lb"]) == 6000
    assert close(sl.spoilage_rate, g["spoilage_rate"])
    assert close(sl.priority_score, g["priority_score"])


def test_full_accept_fails_partial_wins():
    evals = {e.action.action_id: e for e in _result()["action_evaluations"]}
    accept = evals["ACT-B-ACCEPT-PRODUCE-20000"]
    assert accept.feasible is False
    assert sorted(accept.failed_codes) == ["STORAGE_CAPACITY", "USABLE_LIFE"]
    assert _result()["ranking"] == GOLD["ranking"]


def test_action_scores():
    evals = {e.action.action_id: e for e in _result()["action_evaluations"]}
    for g in GOLD["action_evaluations"]:
        e = evals[g["action_id"]]
        assert e.feasible == g["feasible"], g["action_id"]
        assert sorted(e.failed_codes) == sorted(g["failed_constraint_codes"])
        if g["score_components"]:
            for k, v in g["score_components"].items():
                assert close(e.components[k], v), f"{g['action_id']}.{k}"
            assert close(e.score, g["score_unrounded"]), g["action_id"]
            assert e.rank == g["rank"]


def test_recommendation():
    rec = _result()["recommended_action"]
    g = GOLD["recommended_action"]
    assert rec["action_id"] == g["action_id"] == "ACT-B-PARTIAL-PRODUCE-10000"
    assert rec["confidence"] == "HIGH"
    assert close(rec["confidence_value"], g["confidence_value"])
    assert close(rec["inputs"]["forecast_stability"], g["confidence_inputs"]["forecast_stability"])
