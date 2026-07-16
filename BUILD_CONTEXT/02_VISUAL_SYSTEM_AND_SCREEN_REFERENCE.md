# 02 — Visual System and Screen Reference

**Authority:** Normative after a visual direction is selected  
**Current status:** `SELECTED_AND_NORMATIVE`  
**Build gate:** Cleared — Direction C ("Clinical Calm") selected 2026-07-16 (superseding an initial Direction B pick); frontend implementation may proceed  
**Target frame:** 1440 × 1024 desktop web application  

---

## 1. Selection record

| Field | Value |
|---|---|
| Ideation set date | 2026-07-13 |
| Selected displayed option | Direction C |
| Selected direction name | Clinical Calm — light, airy, humane operator workspace |
| Selection feedback | Initially selected Direction B (Control Desk), then changed to C: the dark console read as too technical/engineer-facing. C's light, calm, single-accent treatment is more approachable and usable for a food-bank operator with ~2 minutes. |
| Final reference asset paths | `BUILD_CONTEXT/visual-references/` (review/approved/abstained/audit to be captured from the built app) |
| Approved by | User (2026-07-16) |

Three independent visual directions (A · Field Brief, B · Control Desk, C · Clinical Calm) were generated from this contract and rendered as the hero Review screen with frozen Scenario A data. The user first picked B, then switched to **Direction C**. The concrete design tokens are frozen in §11 below and are the normative target for frontend implementation.

## 11. Selected design tokens — Direction C ("Clinical Calm")

Light-native, airy, humane workspace. One confident indigo accent; a single UI sans family, with monospace reserved only for machine record IDs. Plain-language first, generous whitespace, restrained status color. All values are the frozen implementation contract; the built app must use these exact tokens.

### 11.1 Color tokens

| Token | Value | Role |
|---|---|---|
| `--bg` | `#FBFBFC` | Page / app ground (near-white, cool bias) |
| `--appbar` | `#FFFFFF` | Top bar and context strip |
| `--panel` | `#FFFFFF` | Default grouped surface |
| `--raised` | `#F1F3F6` | Recommendation panel / hover / quiet fills |
| `--line` | `#E4E7EC` | Default divider/border |
| `--line-strong` | `#CFD4DB` | Emphasized border, secondary button outline |
| `--ink` | `#22262B` | Primary text |
| `--sub` | `#5A626C` | Secondary text, axis/label, expected series |
| `--action` | `#3D4CB0` | Primary interactive (buttons, links, focus) — indigo, distinct from risk red and success green |
| `--action-ink` | `#FFFFFF` | Text/icon on `--action` fills |
| `--breach` | `#C0413A` | Hard breach, blocked constraint, minimum threshold line (strongest danger) |
| `--warn` | `#B07D1E` | Probable supply, low confidence (quieter warning) |
| `--ok` | `#2F8F6B` | Completed simulated transition (success — never claimed mission impact) |
| `--series-conservative` | `#3D4CB0` | Chart: conservative projection (primary solid) |
| `--series-after` | `#2F8F6B` | Chart: with-approved-action projection (named comparison) |
| `--series-expected` | `#5A626C` | Chart: expected projection (secondary, dashed) |

Light tints for chips/pills: breach `#F7E5E3`, ok `#E6F2EC`, warn `#F6EEDD`, action `#E7E9F6`. Status/danger colors always ship with text + icon/shape, never color alone. Chart series validated colorblind-safe against the light surface (dataviz `validate_palette.js`): conservative↔after normal-vision ΔE 24.8, all CVD checks pass; the minimum line is a reserved status color carried with a direct "Minimum 1.5" label and a distinct flat-rule shape.

### 11.2 Typography

- **Families:** UI sans = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Monospace (record IDs / rule codes only) = `ui-monospace, "SF Mono", "JetBrains Mono", "Roboto Mono", Menlo, Consolas, monospace`.
- **Numbers use the sans family with `font-variant-numeric: tabular-nums`** for column alignment — not monospace. Mono is reserved for machine identifiers (e.g. `INB-USDA-PROTEIN-104`) and rule codes.
- Scale: body 14–15px; section headings and labels sentence-case 12–13px (not uppercase eyebrows); risk/decision headings ~24px (concise); primary metric values ~20px.
- Plain language leads; explanation lines ≤ ~65 characters; primary-view prose ≤ 120 words.

### 11.3 Spacing, shape, elevation, icons

- **Spacing:** 4px base grid — steps 8/12/16/24/32/48; generous — main padding 32/24, card padding 24, column gap 32.
- **Radii:** 6px (chips, inputs, code tags), 10px (buttons), 14px (panels/cards). `999px` reserved for true status pills, the mode indicator, and compact filters only. No nested cards.
- **Control height:** ≥ 40px; critical/primary targets 44px.
- **Elevation:** flat by default — panels use `--panel`/`--raised` + `--line`, not shadow. Shadow only for dialogs, menus, and genuinely floating panels: `0 24px 60px -30px rgba(20,24,40,.35)`.
- **Icons:** Lucide only, 16px default (13–14px inline with text), ~2px stroke. Icons accompany text for consequential status; never replace it. No emoji, sparkles, robot/brain glyphs.

### 11.4 Component states (required in the component reference)

- **Focus:** `2px solid var(--action)`, `outline-offset:2px`, visible on every surface.
- **Hover:** shift fill to `--raised` or border to `--line-strong`.
- **Selected:** `--action`-tinted border + subtle tinted fill; the original agent recommendation stays visually identified after an alternative is selected.
- **Pressed:** momentary darken.
- **Disabled:** reduced opacity + a discoverable reason (tooltip/inline text) — never a silent dead control.
- **Error:** `--breach` border + message programmatically tied to the field.
- **Success:** `--ok` text + check icon; status text changes on live/offline fallback, not the whole composition.

### 11.5 Chart tokens (Recharts)

- Conservative = `--series-conservative`, solid, 3px, weightiest; markers ≥ 8px at data points.
- Expected = `--series-expected`, dashed `5 5`, 2.5px.
- With-approved-action = `--series-after`, solid 2.5px, added only after an action is selected, named in the legend.
- Minimum threshold = `--breach`, 2px solid, labeled "Minimum 1.5". Target = `--sub`, 1.5px dashed `2 4`, labeled "Target 3.0".
- Grid/axis recessive (`--line` / `--sub`). Single y-axis only. Every chart ships a text summary + `View chart data` semantic table; the SVG is `aria-hidden` only when that table is present.

## 2. Shared visual brief

Design NourishOps as a calm, credible operational decision workspace for a food-bank supply-planning manager.

The primary review screen must make one decision immediately legible:

> Protein is projected below minimum coverage in week 2. A 15,000 lb purchase is the highest-ranked feasible response under the synthetic scenario.

The interface should communicate AI through verified analysis stages, evidence, alternatives, uncertainty, and abstention—not through a chatbot aesthetic.

Visual character:

- purposeful and restrained;
- humane without appearing consumer-oriented;
- data-dense enough for an operator, but not crowded;
- clear on a laptop and projector;
- more like a well-designed operations brief than a generic SaaS dashboard;
- visibly synthetic without allowing the disclaimer to dominate the work.

## 3. Required reference states

The selected direction must be converted into reference images for these exact states:

1. `workspace-draft-1440x1024` — imported disruption notice and `Analyze disruption` action.
2. `workspace-review-1440x1024` — protein risk, four-week projection, recommended purchase, alternatives, and approval.
3. `workspace-approved-1440x1024` — simulation updated with before/after coverage and next links.
4. `workspace-abstained-1440x1024` — missing/conflicting data and no approval control.
5. `compare-1440x1024` — no intervention, simple reorder, agent action, and edited action when applicable.
6. `audit-1440x1024` — chronological event surface with one expanded record.
7. `quantity-edit-1440x1024` — edit bounds, cost recalculation, validation, and recheck action.

At minimum, the review, approved, abstained, and audit references must exist before the coding engine starts frontend implementation.

### 3.1 Reusable state templates beyond the seven captures

The selected system must also freeze these reusable compositions so the builder does not invent a new page for each state:

- **Decision-result template:** `APPROVED` uses the approved reference with before/after metrics; `REJECTED` and `DEFERRED` use the same frame and risk position but replace the simulated-result block with the recorded outcome/reason and unchanged-projection statement.
- **Safe-stop template:** `ABSTAINED`, no feasible action, `FAILED`, and `STALE` keep the persistent frame, put the exact state headline/reason first, show source or recovery details in one grouped surface, and render only the state-table primary action. `NO_ACTION_REQUIRED` uses this composition with neutral—not success-impact—styling.
- **Fallback/error banner:** live-agent fallback is a non-blocking inline banner above otherwise unchanged verified results. Database-decision failure is an assertive inline error inside the still-open confirmation; it never switches to a success/result screen.
- **Dialog template:** quantity edit, approval, reject, defer, and reset share measured width, heading, concise consequence copy, field/error region where applicable, a right-aligned primary action, and `Cancel`. Approval repeats action/quantity/cost/arrival and any manager reason. Reject contains required `Reason for rejecting`; defer contains optional `Deferral note`; reset contains no text field.
- **Unavailable Compare template:** before valid analysis, retain the Compare heading and persistent frame, show the exact state-aware message from Product/UX §3.2, no empty table/chart, and a secondary link back to Decision.

Rejected, Deferred, No Action Required, Stale, and Failed do not each require a separate ideation image, but the component/state reference created after selection must show their headline, status treatment, controls, and shared template mapping.

## 4. Required hierarchy on the review screen

Regardless of selected direction, the 1440 × 1024 review reference must show without scrolling:

- NourishOps identity and primary navigation;
- persistent simulation notice;
- scenario, as-of date, run ID, and offline/live mode;
- category and breach timing;
- conservative projected coverage and threshold;
- compact four-week projection;
- recommended action, quantity, arrival, cost, and expected effect;
- `Approve simulated action` as the sole primary button;
- access to alternatives and evidence without making them compete with the decision.

Total pounds, storage summary, and general category metrics remain supporting context.

## 5. Shared component rules

The selected direction may change composition and styling, but must preserve these rules.

### 5.1 Surfaces

- Use the page surface as the default container.
- Prefer spacing, alignment, type, and dividers before borders.
- Avoid nested cards.
- A list should read as one grouped surface with row separators.
- Use elevation only for dialogs, menus, and a genuinely floating contextual panel.
- Do not place the entire application inside a centered card.

### 5.2 Typography

- Use no more than two font families.
- Body text is 14–16 px at the target viewport.
- Operational labels and table text may use 13–14 px if contrast and line height remain accessible.
- Primary risk and decision headings should be concise rather than oversized.
- Numeric values use tabular figures.
- Long explanation lines do not exceed approximately 65 characters.

### 5.3 Spacing and shape

- Use a consistent 4 px base grid with 8, 12, 16, 24, 32, and 48 px steps.
- Default control height is at least 40 px; critical targets reach 44 px.
- Corner radii must be restrained and consistent. Avoid pill-shaped containers except true statuses or compact filters.
- Do not use rounded rectangles as decoration.

### 5.4 Icons

- Use one established outline icon library, with Lucide as the default.
- Never use emoji as interface icons.
- Icons accompany text for consequential status; they do not replace it.
- Do not use sparkles, magic wands, robot heads, brains, or decorative AI glyphs.

### 5.5 Status and color

- Risk, warning, confidence, pass, fail, and uncertainty must include text or shape, not color alone.
- Reserve the strongest danger color for hard breaches and blocked constraints.
- Use a distinct but quieter warning treatment for probable supply and low confidence.
- Success color means a completed simulated transition, not claimed mission impact.
- The action color must remain visually distinct from risk red and success green.

### 5.6 Tables and evidence

- Align quantities and currency to the right.
- Keep units visible in column labels or values.
- Use row separators and subtle hover/focus states rather than individual row cards.
- Source IDs are links/buttons that open evidence details; they are not decorative monospace tags.
- Expanded evidence shows record, source, timestamp, provenance, and exact fields used.

### 5.7 Charts

- Use Recharts as the only P0 chart library; a dependency change requires an explicit contract revision rather than an implementation-time substitution.
- Conservative projection is the primary solid series.
- Expected projection is secondary and dashed.
- Minimum threshold is stronger than target threshold.
- An approved/selected action adds a clearly named comparison series.
- Pointer tooltips may supplement the chart but are never the keyboard or screen-reader data path.
- Every chart has a concise text summary and an adjacent semantic data table exposed by `View chart data`; keyboard and assistive-technology users receive every plotted value, series name, week, and threshold through that table without focusing SVG points or hovering.
- The Recharts SVG is `aria-hidden` when—and only when—the equivalent labeled summary and table are present in the same figure.
- Avoid gauges, radar charts, donuts for precise comparison, 3D charts, decorative area gradients, and unlabeled sparklines.

## 6. Interaction appearance

- There is one visually dominant primary action in each state.
- Secondary actions use lower-emphasis buttons or text controls.
- Destructive or history-preserving reset is visually distinct but not alarming.
- Disabled controls include a discoverable reason.
- Loading maintains layout stability.
- Live/offline fallback changes status text, not the entire screen composition.
- Focus, hover, selected, pressed, disabled, error, and success states must be represented in the component reference.
- Dialogs name the simulated action and return focus correctly.

## 7. Anti-slop rules

The implementation must not contain:

- an oversized chat panel or chat bubbles as the primary experience;
- a grid of equally weighted KPI cards;
- invented navigation, filters, alerts, avatars, or controls;
- glassmorphism, neon glows, gratuitous gradients, or background blobs;
- excessive shadows or card-on-card composition;
- giant percentage typography without decision context;
- generic stock imagery of food, warehouses, volunteers, or trucks inside the operator workflow;
- fake maps, fake real-time feeds, or fake integrations;
- decorative AI narration such as “thinking,” “magic,” or “powered insights”;
- long paragraphs where a structured fact, rule, or comparison is clearer;
- inaccessible red/green-only semantics;
- controls that do nothing;
- responsive behavior that simply squeezes a desktop dashboard into mobile cards.

## 8. Content shown in visual references

Reference screens must use frozen Scenario A values from `fixtures/` and `golden/`. Do not invent visually convenient data. The review reference must show these exact facts:

- scenario: `USDA protein shipment delay`;
- planning date: `Aug 3, 2026`;
- active category: `Protein`;
- breach: `Week 2 · Aug 10`;
- conservative coverage at breach: `1.3 weeks` against minimum `1.5 weeks`;
- inbound change: `10,000 lb · Aug 3 → Aug 17 · Probable`;
- recommendation: `Purchase 15,000 lb of protein` arriving `Aug 10`;
- simulated cost: `$12,750` in primary UI and `$12,750.00` in evidence/audit;
- simulated after-state at the breach: `27,000 lb · 3.0 weeks`;
- alternatives: fixed `Request fixed 8,000 lb peer transfer` and `Request 15,000 lb from targeted donors` rows, with verified status/constraint details accessed through the review interaction;
- mode: `Offline verified mode` for the primary reference;
- simulation label: exact text from `00_BUILD_CONTRACT.md`.

A realistic runtime run ID may be generated for the image, but it must be visibly synthetic and no other identifier, metric, alert, integration, or operator identity may be invented.

## 9. Visual QA gate

Frontend work is visually complete only when:

1. Reference and implementation screenshots use the same 1440 × 1024 viewport and data state.
2. Each pair is placed in one comparison image or visual review surface.
3. Review checks hierarchy, spacing, alignment, font family/weight/size, color, borders, radii, chart geometry, labels, focus, and clipping.
4. Material differences are corrected and compared again.
5. The review, approved, abstained, compare, audit, and quantity-edit states pass.
6. No reference content has been replaced with invented values or functionality.
7. The core review path remains readable at 1280 px wide and at projector scale.

Screenshots alone are not proof of interaction quality. Keyboard flow, dialog behavior, selection, edit validation, fallback, and reset must also pass the acceptance specification.

## 10. Completion instructions after selection

When the user selects or refines a displayed option:

1. Record the displayed option and direction name in Section 1.
2. Save the selected image in `BUILD_CONTEXT/visual-references/`.
3. Generate or design the remaining required states in the same system.
4. Replace all `Pending` values.
5. Add the final font families, weights, color tokens, spacing tokens, radii, shadows, icon sizes, chart tokens, and component-state rules.
6. Reference the exact saved asset paths.
7. Change status to `SELECTED_AND_NORMATIVE`.

No coding instruction may treat an unselected ideation image as a normative target.
