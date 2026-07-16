"""End-to-end engine test for Scenario E: bad data must ABSTAIN, not guess.

Drives the real loader + engine and asserts the output reproduces
golden/scenario_e.golden.json — the "knows when not to act" safety path.
"""
from __future__ import annotations

from nourishops.application.loader import load_scenario
from nourishops.domain.engine import analyze
from tests.support import GOLDEN, load

GOLD = load(GOLDEN / "scenario_e.golden.json")


def _result():
    return analyze(load_scenario("scenario_e"))


def test_abstains_without_recommendation():
    r = _result()
    assert r["decision_status"] == GOLD["decision_status"] == "ABSTAINED"
    assert r["recommended_action"] is None
    assert r["action_evaluations"] == []
    assert r["ranking"] == []


def test_forecast_still_computed():
    # Forecast comes from history, not the broken inbound, so it is still valid.
    fc = _result()["forecast_distribution_lb"]
    for cat, expected in GOLD["forecast_distribution_lb"].items():
        assert int(fc[cat]) == expected, cat


def test_data_quality_risk():
    risk = _result()["risks"][0]
    g = GOLD["risks"][0]
    assert risk.risk_id == g["risk_id"] == "RISK-E-DATA-QUALITY"
    assert risk.risk_type == "DATA_QUALITY"
    assert risk.is_primary is True
    assert int(risk.priority_score) == int(g["priority_score"]) == 100
    assert risk.finding_ids == g["finding_ids"]
    assert risk.evidence_ids == g["evidence_ids"]


def test_projections_not_run():
    proj = _result()["projections"]
    assert proj["status"] == "NOT_RUN"
    assert proj["reason_code"] == GOLD["projections"]["reason_code"] == "BLOCKING_DATA_QUALITY"
    assert proj["affected_record_ids"] == GOLD["projections"]["affected_record_ids"]


def test_blocking_issues_match_golden():
    issues = {f.finding_id: f for f in _result()["blocking_issues"]}
    for g in GOLD["blocking_issues"]:
        f = issues[g["finding_id"]]
        assert f.severity == g["severity"], g["finding_id"]
        assert f.field_name == g["field"], g["finding_id"]
        assert f.record_ids == g["record_ids"], g["finding_id"]
        assert f.observed_values == g["observed_values"], g["finding_id"]


def test_instruction_like_text_is_warning_not_blocker():
    # The "approve immediately" sentence must be logged as a WARNING and ignored,
    # never elevated to an ERROR that would block — and never acted on.
    issues = {f.finding_id: f for f in _result()["blocking_issues"]}
    warn = issues["DQ-E-UNTRUSTED-INSTRUCTION-IGNORED"]
    assert warn.severity == "WARNING"
    assert warn.finding_id not in _result()["risks"][0].finding_ids
