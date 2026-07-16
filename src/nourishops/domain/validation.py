"""Data-quality validation and the DATA_QUALITY risk (04 §5.1, §11).

Decision-critical ERRORs (missing arrival week/status, conflicting evidence)
force abstention. Instruction-like untrusted text is a WARNING only: it is
preserved as evidence and ignored, never executed (04 §17.3 / 06 red-team).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from .model import Snapshot

# Evidence field name -> (finding suffix, unit) for cross-source conflicts.
_CONFLICT_FIELDS = {
    "expected_week_start": ("ARRIVAL-WEEK-CONFLICT", None),
    "gross_quantity_lb": ("QUANTITY-CONFLICT", "lb"),
}


@dataclass
class Finding:
    finding_id: str
    severity: str            # ERROR | WARNING
    field_name: str
    record_ids: list[str]
    observed_values: list
    unit: str | None = None


@dataclass
class DataQualityRisk:
    risk_id: str
    finding_ids: list[str]
    evidence_ids: list[str]
    is_primary: bool = True
    risk_type: str = "DATA_QUALITY"
    category_id: None = None
    priority_score: Decimal = Decimal(100)


def _scen_letter(scenario_id: str) -> str:
    return scenario_id.split("-")[1] if "-" in scenario_id else "X"


def validate(snap: Snapshot) -> list[Finding]:
    """Return every data-quality finding for the snapshot, ERRORs and WARNINGs."""
    letter = _scen_letter(snap.scenario_id)
    findings: list[Finding] = []

    # 1. Structural nulls on a decision-critical inbound field.
    for rec in snap.raw_inbound_records:
        rid = rec["inbound_id"]
        if rec.get("status") is None:
            findings.append(Finding(f"DQ-{letter}-INBOUND-STATUS-MISSING", "ERROR",
                                    "status", [rid], [None]))
        if rec.get("expected_week_start") is None:
            findings.append(Finding(f"DQ-{letter}-ARRIVAL-WEEK-MISSING", "ERROR",
                                    "expected_week_start", [rid], [None]))

    # 2. Cross-evidence conflicts for the same inbound (arrival week, quantity).
    for field_name, (suffix, unit) in _CONFLICT_FIELDS.items():
        contributions: list[tuple[str, object]] = []  # (evidence_id, value) in fixture order
        for ev in snap.evidence:
            if not any(str(r).startswith("INB") for r in ev.get("related_record_ids", [])):
                continue
            for fact in ev.get("structured_facts", []):
                if fact.get("field") == field_name and fact.get("value") is not None:
                    contributions.append((ev["evidence_id"], fact["value"]))
        if len({v for _, v in contributions}) > 1:
            findings.append(Finding(f"DQ-{letter}-{suffix}", "ERROR", field_name,
                                    [eid for eid, _ in contributions],
                                    [v for _, v in contributions], unit))

    # 3. Instruction-like untrusted text — warned and ignored, never a blocker.
    for ev in snap.evidence:
        if ev.get("contains_instruction_like_text"):
            findings.append(Finding(f"DQ-{letter}-UNTRUSTED-INSTRUCTION-IGNORED", "WARNING",
                                    "body", [ev["evidence_id"]], ["instruction-like text present"]))
    return findings


def build_data_quality_risk(snap: Snapshot, findings: list[Finding]) -> DataQualityRisk:
    """Aggregate ERROR findings into the single primary DATA_QUALITY risk (04 §5.1)."""
    errors = [f for f in findings if f.severity == "ERROR"]
    finding_ids = sorted(f.finding_id for f in errors)
    ev_order = {ev["evidence_id"]: i for i, ev in enumerate(snap.evidence)}
    ids: list[str] = []
    for f in errors:
        for rid in f.record_ids:
            if rid not in ids:
                ids.append(rid)
    # Subject inbound(s) first, then evidence in fixture order (04 golden ordering).
    ids.sort(key=lambda r: (not str(r).startswith("INB"), ev_order.get(r, 0)))
    return DataQualityRisk(risk_id=f"RISK-{_scen_letter(snap.scenario_id)}-DATA-QUALITY",
                           finding_ids=finding_ids, evidence_ids=ids)
