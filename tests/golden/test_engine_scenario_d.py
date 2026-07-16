"""End-to-end engine test for Scenario D: two shortages, one budget (04 §5.5).

The engine must fund the higher-impact dairy purchase and leave the protein risk
visibly open — reproducing golden/scenario_d.golden.json.
"""
from __future__ import annotations

from nourishops.application.loader import load_scenario
from nourishops.domain.engine import analyze
from tests.support import GOLDEN, close, load

GOLD = load(GOLDEN / "scenario_d.golden.json")


def _result():
    return analyze(load_scenario("scenario_d"))


def test_budget_tradeoff_is_primary():
    risks = {r.risk_id: r for r in _result()["risks"]}
    bt = risks["RISK-D-BUDGET"]
    g = GOLD["risks"][0]
    assert bt.is_primary is True
    assert bt.component_risk_ids == g["component_risk_ids"]
    assert close(bt.required_combined_cost_usd, g["required_combined_cost_usd"])
    assert close(bt.budget_shortfall_ratio, g["budget_shortfall_ratio"])
    assert close(bt.priority_score, g["priority_score"])


def test_component_shortages_present():
    risks = {r.risk_id: r for r in _result()["risks"]}
    assert int(risks["RISK-D-DAIRY-W1"].gap_to_target_lb) == 6000
    assert int(risks["RISK-D-PROTEIN-W2"].gap_to_target_lb) == 15000
    assert [r.risk_id for r in _result()["risks"]] == [g["risk_id"] for g in GOLD["risks"]]


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


def test_dairy_wins_protein_stays_open():
    r = _result()
    assert r["ranking"] == GOLD["ranking"]
    rec = r["recommended_action"]
    g = GOLD["recommended_action"]
    assert rec["action_id"] == g["action_id"] == "ACT-D-PURCHASE-DAIRY-6000"
    assert rec["confidence"] == "HIGH"
    assert close(rec["confidence_value"], g["confidence_value"])
    assert close(rec["inputs"]["forecast_stability"], g["confidence_inputs"]["forecast_stability"])
    # protein risk remains open under the chosen action
    dairy_eval = {e.action.action_id: e for e in r["action_evaluations"]}["ACT-D-PURCHASE-DAIRY-6000"]
    assert dairy_eval.unresolved_risk_ids == ["RISK-D-PROTEIN-W2"]
