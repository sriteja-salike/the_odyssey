"""Decimal foundation for the engine (04 §2.1).

Everything downstream imports D/CTX/clamp01 from here. The float-leak guard
(scripts/check_no_float.py) forbids binary floats in this whole package, so all
constants are Decimal("...") strings and all division goes through CTX.
"""
from __future__ import annotations

from decimal import Context, Decimal, ROUND_HALF_EVEN, ROUND_HALF_UP

# 04 §2.1: exactly 28 significant digits, banker's rounding, configured explicitly.
CTX = Context(prec=28, rounding=ROUND_HALF_EVEN)

ZERO = Decimal(0)
ONE = Decimal(1)
CENT = Decimal("0.01")
INF_WEEK = 10**9  # FEFO sentinel for "expiry after horizon / unknown" (04 §4.4)


def D(x) -> Decimal:
    """Coerce a fixture scalar to Decimal without ever passing through float."""
    if isinstance(x, Decimal):
        return x
    if isinstance(x, bool):
        return ONE if x else ZERO
    return Decimal(str(x))


def div(a, b) -> Decimal:
    """Context division (04 §2.1). Callers own the zero-denominator fallback."""
    return CTX.divide(D(a), D(b))


def clamp01(x) -> Decimal:
    """clamp01(x) = min(1, max(0, x))  (04 §2.1)."""
    v = D(x)
    if v < ZERO:
        return ZERO
    if v > ONE:
        return ONE
    return v


def cents(x) -> Decimal:
    """Quantize a currency amount to cents with ROUND_HALF_UP (04 §2.1)."""
    return D(x).quantize(CENT, rounding=ROUND_HALF_UP)
