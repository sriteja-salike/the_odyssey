"""Contract test: every golden, fixture, and scenario overlay validates against
its JSON schema (06 §2 P0-02; the machine-readable contract, 00 §10). 18 checks.

This is the proof that the contract is machine-enforceable, not just prose — the
frontend builds against these exact golden shapes, so a schema drift here is a
cross-team break.
"""
from __future__ import annotations

import pytest

from tests.support import FIXTURES, GOLDEN, load, schema_errors, schema_registry

REGISTRY = schema_registry()

GOLDENS = sorted(GOLDEN.glob("*.json"))
FIXTURE_MAP = {
    "base_manifest.json": "base_manifest.schema.json",
    "candidate_actions.json": "candidate_actions.schema.json",
    "category_policies.json": "category_policies.schema.json",
    "evidence_records.json": "evidence_records.schema.json",
    "historical_weekly_category_flow.json": "historical_weekly_category_flow.schema.json",
    "pending_donation_offers.json": "pending_donation_offers.schema.json",
    "planned_inbound.json": "planned_inbound.schema.json",
    "warehouse.json": "warehouse_constraints.schema.json",
}
OVERLAYS = sorted((FIXTURES / "scenarios").glob("*.json"))
_FIX_ITEMS = sorted(FIXTURE_MAP.items())


@pytest.mark.parametrize("golden", GOLDENS, ids=lambda p: p.name)
def test_golden_validates(golden):
    errs = schema_errors(load(golden), "golden_output.schema.json", REGISTRY)
    assert not errs, f"{golden.name}:\n" + "\n".join(errs[:10])


@pytest.mark.parametrize("fixture,schema", _FIX_ITEMS, ids=[k for k, _ in _FIX_ITEMS])
def test_fixture_validates(fixture, schema):
    errs = schema_errors(load(FIXTURES / fixture), schema, REGISTRY)
    assert not errs, f"{fixture}:\n" + "\n".join(errs[:10])


@pytest.mark.parametrize("overlay", OVERLAYS, ids=lambda p: p.name)
def test_overlay_validates(overlay):
    errs = schema_errors(load(overlay), "scenario_overlay.schema.json", REGISTRY)
    assert not errs, f"{overlay.name}:\n" + "\n".join(errs[:10])
