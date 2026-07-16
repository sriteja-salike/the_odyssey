/* Display formatting — the single place UI numbers are shaped.
   Enforces BUILD_CONTEXT/01_PRODUCT_AND_UX_SPEC.md §9.2.
   The frontend never computes domain math; it only formats values the
   backend/golden already produced. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Whole pounds with thousands separators: `12,000 lb`. Negatives are clamped to 0. */
export function lb(value: number | string): string {
  const n = Math.max(0, Math.round(Number(value)));
  return `${n.toLocaleString("en-US")} lb`;
}

/** Bare integer with separators (unit supplied separately). */
export function int(value: number | string): string {
  return Math.round(Number(value)).toLocaleString("en-US");
}

/** Weeks of supply — one decimal + `weeks`: `1.3 weeks`. */
export function weeks(value: number | string): string {
  return `${Number(value).toFixed(1)} weeks`;
}

/** One-decimal weeks-of-supply, no unit (for compact metric rows). */
export function wos(value: number | string): string {
  return Number(value).toFixed(1);
}

/** Whole dollars in primary UI: `$12,750`. */
export function usd(value: number | string): string {
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

/** Cents-precise currency for evidence/audit: `$12,750.00`. */
export function usdCents(value: number | string): string {
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Whole-percent coverage/score for primary UI: `84%`. */
export function pct(value01: number | string): string {
  return `${Math.round(Number(value01) * 100)}%`;
}

/** ISO `2026-08-10` -> UI `Aug 10, 2026`. */
export function date(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** ISO week-start -> compact `Aug 10`. */
export function dateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}`;
}

/** `Week 2 · Aug 10` from a 1-based index + ISO week start. */
export function weekLabel(index1: number, iso: string): string {
  return `Week ${index1} · ${dateShort(iso)}`;
}

/** Confidence enum -> title case (`HIGH` -> `High`). */
export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
