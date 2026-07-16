"""Normalized engine input types (04 §3).

Plain dataclasses holding Decimal values. The loader (application layer) builds
these from fixtures + overlay; the engine only ever reads them.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

# 04 §1.1 — normative category order for stable iteration.
CATEGORY_ORDER = [
    "PROTEIN", "PRODUCE", "DAIRY", "GRAINS", "STAPLES_MIXED_MEALS", "SNACKS_DISCRETIONARY",
]
STORAGE_ORDER = ["DRY", "REFRIGERATED", "FROZEN"]


@dataclass(frozen=True)
class Policy:
    category_id: str
    priority_weight: Decimal
    essential: bool
    min_wos: Decimal
    target_wos: Decimal
    storage: str


@dataclass(frozen=True)
class Inbound:
    inbound_id: str
    category_id: str
    week_start: str           # None-safe: loader rejects null weeks before here
    gross_lb: Decimal
    status: str               # CONFIRMED | PROBABLE | UNCONFIRMED
    probability: Decimal
    storage: str
    yield_ratio: Decimal
    usable_life_days: int


@dataclass(frozen=True)
class Action:
    action_id: str
    action_type: str
    category_id: str | None
    requested_lb: Decimal
    minimum_lb: Decimal
    maximum_lb: Decimal
    increment_lb: Decimal
    unit_price: Decimal | None
    fixed_cost: Decimal
    computed_cost: Decimal
    arrival_week_start: str | None
    lead_time_days: int
    success_probability: Decimal
    yield_ratio: Decimal
    usable_life_days: int | None
    storage: str
    burden: str               # LOW | MEDIUM | HIGH
    evidence_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class Offer:
    offer_id: str
    category_id: str
    gross_lb: Decimal
    arrival_week_start: str
    yield_ratio: Decimal
    usable_life_days: int
    storage: str


@dataclass(frozen=True)
class Warehouse:
    budget_usd: Decimal
    capacity_lb: dict[str, Decimal]
    probable_probability: Decimal
    minimum_pickup_lb: Decimal


@dataclass(frozen=True)
class Snapshot:
    scenario_id: str
    weeks: list[str]                       # W1..W4 forecast week starts
    policies: dict[str, Policy]
    warehouse: Warehouse
    starting_inventory_lb: dict[str, Decimal]
    last_four_distributed_lb: dict[str, list[Decimal]]
    inbounds: list[Inbound]
    actions: list[Action]
    primary_risk_type: str = "SHORTAGE"
    offers: list[Offer] = field(default_factory=list)
    # Carried for data-quality validation (04 §5.1); not used by the projection math.
    raw_inbound_records: list[dict] = field(default_factory=list)
    evidence: list[dict] = field(default_factory=list)

    def week_index(self, week_start: str | None) -> int | None:
        """1-based W-index for a week start, or None if outside the horizon."""
        if week_start in self.weeks:
            return self.weeks.index(week_start) + 1
        return None
