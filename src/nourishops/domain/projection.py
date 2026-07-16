"""Weekly projections: FEFO roll-forward, WOS, coverage, capacity peaks (04 §4).

Three views share one timeline (04 §4.4):
  - conservative: CONFIRMED inbound only  -> drives breach detection
  - expected:     CONFIRMED + PROBABLE×p  -> drives expected trajectory
  - capacity:     CONFIRMED + PROBABLE gross at 100% -> drives storage peaks

FEFO ordering (04 §4.4): a lot with a *known* calendar expiry sorts before
starting inventory whose expiry is unknown — even when that known expiry is after
the horizon. So a known expiry keeps its real (possibly >4) week index; only
starting inventory uses the +inf sentinel. This is why an accepted 90-day offer
counts as locally dispositioned ahead of the unknown-expiry starting lot.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from .model import CATEGORY_ORDER, STORAGE_ORDER, Snapshot
from .numeric import INF_WEEK, ONE, ZERO, div

HORIZON = 4


@dataclass
class Lot:
    expiry_idx: int          # week it expires at end of (real index, may exceed HORIZON)
    arrival_seq: int         # 0 = starting inventory (before W1 inbound)
    lot_id: str
    usable_lb: Decimal


@dataclass
class WeekRow:
    week_start: str
    beginning_lb: Decimal
    confirmed_inbound_lb: Decimal
    probable_inbound_lb: Decimal
    arrivals_gross_lb: Decimal
    fulfilled_lb: Decimal
    unmet_lb: Decimal
    spoilage_lb: Decimal
    ending_lb: Decimal
    end_wos: Decimal | None


@dataclass
class ExtraLot:
    """A candidate action's / offer's simulated inbound lot for scoring (04 §7)."""
    category_id: str
    week_start: str
    gross_lb: Decimal
    status: str
    probability: Decimal
    storage: str
    yield_ratio: Decimal
    usable_life_days: int | None
    lot_id: str | None = None   # set to track distribution/spoilage of this lot
    track: bool = False


def _expiry_idx(arrival_idx: int, usable_life_days: int | None) -> int:
    """04 §4.4: arrival_idx + ceil(life/7) - 1, floored at arrival. Unknown life = +inf."""
    if usable_life_days is None:
        return INF_WEEK
    weeks = -(-int(usable_life_days) // 7)  # ceil division, no float
    return max(arrival_idx, arrival_idx + weeks - 1)


def _inclusion_factor(status: str, probability: Decimal, view: str) -> Decimal:
    if status == "CONFIRMED":
        return ONE
    if status == "PROBABLE":
        return probability if view == "expected" else (ONE if view == "capacity" else ZERO)
    return ZERO  # UNCONFIRMED


def project_category(
    snap: Snapshot, cat: str, forecast_c: Decimal, view: str,
    extra: list[ExtraLot] | None = None, lot_stats: dict | None = None,
) -> list[WeekRow]:
    """Roll one category forward across W1..W4 under `view`.

    If `lot_stats` is given, tracked extra lots accumulate {distributed, spoiled}.
    """
    inbounds = [ExtraLot(
        i.category_id, i.week_start, i.gross_lb, i.status, i.probability,
        i.storage, i.yield_ratio, i.usable_life_days,
    ) for i in snap.inbounds if i.category_id == cat]
    inbounds += [e for e in (extra or []) if e.category_id == cat]

    lots = [Lot(INF_WEEK, 0, f"START-{cat}", snap.starting_inventory_lb[cat])]
    tracked: set[str] = set()
    rows: list[WeekRow] = []
    seq = 1
    for t in range(1, HORIZON + 1):
        week = snap.weeks[t - 1]
        beginning = sum((lot.usable_lb for lot in lots), ZERO)
        confirmed_usable = ZERO
        probable_usable = ZERO
        arrivals_gross = ZERO
        for inb in sorted((x for x in inbounds if snap.week_index(x.week_start) == t),
                          key=lambda x: (x.storage, x.gross_lb, x.lot_id or "")):
            factor = _inclusion_factor(inb.status, inb.probability, view)
            usable = inb.gross_lb * inb.yield_ratio * factor
            if inb.status == "CONFIRMED":
                confirmed_usable += usable
            elif inb.status == "PROBABLE":
                probable_usable += usable
            if inb.status in ("CONFIRMED", "PROBABLE"):
                arrivals_gross += inb.gross_lb
            if usable > ZERO:
                lid = inb.lot_id or f"INB-{cat}-{t}-{seq}"
                lots.append(Lot(_expiry_idx(t, inb.usable_life_days), seq, lid, usable))
                if inb.track and lot_stats is not None:
                    lot_stats.setdefault(lid, {"distributed": ZERO, "spoiled": ZERO})
                    tracked.add(lid)
                seq += 1

        available = sum((lot.usable_lb for lot in lots), ZERO)
        fulfilled = min(forecast_c, available)
        unmet = forecast_c - fulfilled if forecast_c > available else ZERO

        remaining = fulfilled
        for lot in sorted(lots, key=lambda l: (l.expiry_idx, l.arrival_seq, l.lot_id)):
            if remaining <= ZERO:
                break
            take = min(lot.usable_lb, remaining)
            lot.usable_lb -= take
            remaining -= take
            if lot.lot_id in tracked:
                lot_stats[lot.lot_id]["distributed"] += take

        spoilage = ZERO
        for lot in lots:
            if lot.expiry_idx == t and lot.usable_lb > ZERO:
                spoilage += lot.usable_lb
                if lot.lot_id in tracked:
                    lot_stats[lot.lot_id]["spoiled"] += lot.usable_lb
                lot.usable_lb = ZERO
        lots = [lot for lot in lots if lot.usable_lb > ZERO]

        ending = sum((lot.usable_lb for lot in lots), ZERO)
        wos = div(ending, forecast_c) if forecast_c > ZERO else None
        rows.append(WeekRow(week, beginning, confirmed_usable, probable_usable,
                            arrivals_gross, fulfilled, unmet, spoilage, ending, wos))
    return rows


def project_all(snap: Snapshot, forecast: dict[str, Decimal], view: str,
                extra: list[ExtraLot] | None = None,
                lot_stats: dict | None = None) -> dict[str, list[WeekRow]]:
    return {cat: project_category(snap, cat, forecast[cat], view, extra, lot_stats)
            for cat in CATEGORY_ORDER}


def capacity_peaks(snap: Snapshot, forecast: dict[str, Decimal],
                   extra: list[ExtraLot] | None = None) -> dict[str, list[Decimal]]:
    """peak(s,t) = carryover usable (capacity view) + gross arrivals, per storage/week."""
    cap = project_all(snap, forecast, "capacity", extra)
    peaks: dict[str, list[Decimal]] = {s: [ZERO] * HORIZON for s in STORAGE_ORDER}
    for cat in CATEGORY_ORDER:
        s = snap.policies[cat].storage
        for t in range(HORIZON):
            row = cap[cat][t]
            peaks[s][t] += row.beginning_lb + row.arrivals_gross_lb
    return peaks


def overflow_for(peaks: dict[str, list[Decimal]], storage: str, cap: Decimal) -> Decimal:
    return max((max(ZERO, peaks[storage][t] - cap) for t in range(HORIZON)), default=ZERO)


def coverage(snap: Snapshot, forecast: dict[str, Decimal],
             rows: dict[str, list[WeekRow]]) -> dict:
    """Priority-weighted coverage by week + horizon mean (04 §4.7)."""
    weights = {c: snap.policies[c].priority_weight for c in CATEGORY_ORDER}
    wsum = sum(weights.values(), ZERO)
    by_week: list[Decimal] = []
    for t in range(HORIZON):
        acc = ZERO
        for c in CATEGORY_ORDER:
            target = snap.policies[c].target_wos
            wos = rows[c][t].end_wos
            ratio = ONE if (wos is None or target == ZERO) else min(ONE, div(wos, target))
            acc += weights[c] * ratio
        by_week.append(div(acc, wsum))
    horizon = div(sum(by_week, ZERO), Decimal(HORIZON))
    return {"by_week": by_week, "horizon": horizon}
