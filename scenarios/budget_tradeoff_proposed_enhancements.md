# Proposed Enhancements: `BUDGET_TRADEOFF` (Scenario D)

**Status:** Design proposals for team validation — not yet implemented
**Related risk type:** `BUDGET_TRADEOFF`
**Related scenario:** Scenario D (`SCN-D-BUDGET-TRADEOFF`)
**Authority note:** These are **not normative**. Current, binding behavior is defined in `BUILD_CONTEXT/04_DECISION_AND_AGENT_CONTRACT.md` (see §5.5, §9.2, §9.5, §12) and implemented by the engine and golden fixtures. Nothing in this document changes an existing formula, constraint, or golden value until it is separately specced, incorporated into the numbered build contract, and re-approved.

---

## 1. Ratio-based portfolio allocation for `BUDGET_TRADEOFF`

**Current behavior:** per §5.5, the affordability test for `BUDGET_TRADEOFF` "never allocates a portfolio" — the engine funds exactly one competing category in full (the highest-ranked) and leaves the others open, even when the budget could partially cover more than one.

**Proposal:** add a portfolio candidate action that funds every competing category at least partially instead of picking one winner.

**Algorithm:**

1. For every competing category `c`, compute `floor_qty(c) = minimum_quantity_lb(c)` and `floor_cost(c) = floor_qty(c) × unit_price(c)`.
2. If `Σ floor_cost(c) > remaining_budget`, the portfolio is infeasible; fall back to current single-winner behavior.
3. Otherwise, fund every category's floor first, so no competing category is left at zero.
4. Compute `leftover = remaining_budget − Σ floor_cost(c)`.
5. Rank categories by cost-effectiveness: `value_ratio(c) = (priority_weight(c) / 5) ÷ unit_price(c)`.
6. Spend `leftover` one `quantity_increment_lb` step at a time, always to the category with the highest current `value_ratio(c)` among categories that have not yet reached their full need or `maximum_quantity_lb`.
7. Stop when no remaining category can afford another legal increment.
8. Score the resulting bundle through the existing §9 formula unchanged — `burden(v)` already sums over the full competing category set `C`, so a multi-category purchase's burden reduction is directly computable with no formula changes — and rank it against the single-category candidates using the existing §9.10 tie-break chain.

Generalizes to more than two competing categories without change, since the allocation loop already iterates over the full competing set.

**Worked example (Scenario D numbers):** dairy floor 3,000 lb ($4,800) + protein floor 5,000 lb ($4,250) = $9,050. Leftover $3,950 → protein has the better ratio (5/5 ÷ $0.85 = 1.18 vs dairy's 4/5 ÷ $1.60 = 0.50) → 4 more 1,000 lb protein increments = $3,400. Result: dairy 3,000/6,000 lb (50% of need), protein 9,000/15,000 lb (60% of need), $12,450 spent, $550 unspent — both categories get relief instead of one getting everything and the other nothing.

---

## 2. Usage-derived `priority_weight` (remove hardcoded config)

**Current behavior:** `priority_weight(c)` is a static value set once per category in `category_policies.json` (`PROTEIN=5`, `PRODUCE=5`, `DAIRY=4`, `STAPLES_MIXED_MEALS=4`, `GRAINS=3`, `SNACKS_DISCRETIONARY=1`) and never recalculated from actual distribution activity.

**Proposal:** derive it from that specific food bank's own recent usage instead of a fixed policy number.

```
derived_priority_weight(c, t) = normalize_to_1_5(
    distribution_volume(c, t-4..t-1) / total_distribution_volume(all categories, t-4..t-1)
)
```

- Reuses the same 4-week moving-average window already computed for the demand forecast (§4.1) — no new data pipeline.
- Recomputed on the same weekly cadence as the forecast refresh.
- Normalized into the existing 1–5 range so every formula referencing `priority_weight(c)/5` throughout Section 9 needs no structural change — only the source of the input changes.
- A floor (e.g. never below 1) prevents a quiet category from being weighted to zero and dropping out of consideration entirely.

**Open question:** removing the static config also removes the manual "mission override" lever — e.g. if leadership wants to boost produce purchasing for a public-health reason even though usage is currently low, they lose that knob unless a manual override multiplier is kept on top of the derived base.

---

## 3. Cross-week persistent state (memory)

**Current behavior:** per §12, "all policies begin from the same immutable scenario snapshot" — each evaluation run is independent, and nothing carries the outcome of a prior week's approved actions or unresolved risks into the next run.

**Proposal:** introduce a persistent `warehouse_state` record, keyed by `warehouse_id + week_start`, that each new weekly run reads as its starting point instead of resetting to a fixture-defined baseline.

**State carried forward:**

1. **Budget:** `remaining_budget_usd(t) = remaining_budget_usd(t-1) − approved_direct_cost(t-1) + replenishment(t)`.
2. **Inventory:** the existing single-scenario carryover math (`carryover_usable_storage_lb`, §1) extends across week boundaries instead of resetting.
3. **Open risks:** a risk left unresolved (e.g. the losing category in a `BUDGET_TRADEOFF`) carries forward with a `weeks_open` counter, allowing `priority_score` to include an aging/urgency term instead of the risk silently reappearing as if new.
4. **Approval events:** once an action is confirmed rather than merely simulated, its cost and inventory effect become the new baseline for the following week's run.

**Storage:** a new fixture/store type analogous to existing ones (`category_policies.json`, `candidate_actions.json`) — versioned, exact-decimal, and auditable, consistent with the determinism requirements in §1.1 and §14 of the build contract.

**Scope note:** this is the most architecturally significant of the three proposals, since it turns the system from "evaluate one static snapshot" into "maintain continuous state across runs," touching the run harness rather than only the scoring formulas.
