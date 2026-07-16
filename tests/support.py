"""Shared test helpers: contract paths, schema registry, Decimal comparison.

Grounded in 06 §4 tolerance rules: business fields (IDs, integer lb, cents) are
exact; derived decimals (WOS, coverage, scores, confidence) compare as Decimal
with absolute difference <= 1e-24 — not string equality.
"""
from __future__ import annotations

import json
from decimal import Context, Decimal, ROUND_HALF_EVEN
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
BC = ROOT / "BUILD_CONTEXT"
SCHEMAS = BC / "schemas"
FIXTURES = BC / "fixtures"
GOLDEN = BC / "golden"

# 04 §4.0 numeric foundation (matches Python's default decimal context).
DEC = Context(prec=28, rounding=ROUND_HALF_EVEN)
# 06 §4.1 derived-decimal equality tolerance.
DERIVED_TOL = Decimal("1e-24")


def load(path: Path) -> dict:
    return json.loads(Path(path).read_text())


def schema_registry() -> Registry:
    """Registry so cross-file $refs (e.g. common.schema.json#/$defs/...) resolve."""
    resources = []
    for sp in SCHEMAS.glob("*.json"):
        doc = json.loads(sp.read_text())
        resources.append((sp.name, Resource.from_contents(doc)))
        if "$id" in doc:
            resources.append((doc["$id"], Resource.from_contents(doc)))
    return Registry().with_resources(resources)


def schema_errors(instance: dict, schema_name: str, registry: Registry) -> list[str]:
    schema = json.loads((SCHEMAS / schema_name).read_text())
    validator = Draft202012Validator(schema, registry=registry)
    out = []
    for e in sorted(validator.iter_errors(instance), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in e.path) or "<root>"
        out.append(f"@{loc}: {e.message}")
    return out


def close(a, b, tol: Decimal = DERIVED_TOL) -> bool:
    """True if |a-b| <= tol, both parsed as Decimal (06 §4.1 derived rule)."""
    return abs(Decimal(str(a)) - Decimal(str(b))) <= tol
