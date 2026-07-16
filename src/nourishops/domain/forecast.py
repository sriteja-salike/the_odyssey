"""Distribution forecast (04 §4.3).

Simple mean of the four most-recent completed weekly distributions, per category.
P0 has no scenario multipliers, so the default 1.0 applies everywhere.
"""
from __future__ import annotations

from decimal import Decimal

from .model import CATEGORY_ORDER, Snapshot
from .numeric import ZERO, div


def forecast_distribution(snap: Snapshot) -> dict[str, Decimal]:
    out: dict[str, Decimal] = {}
    for cat in CATEGORY_ORDER:
        four = snap.last_four_distributed_lb[cat]
        out[cat] = div(sum(four, ZERO), Decimal(4))
    return out
