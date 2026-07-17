# 02 — Visual System and Screen Reference

**Authority:** Normative after a visual direction is selected  
**Current status:** `SELECTED_AND_NORMATIVE`  
**Build gate:** Cleared — Carbon-based checklist coach selected 2026-07-17; implementation and visual QA may proceed
**Target frame:** 1440 × 1024 desktop web application  

---

## 0. Phase 1 selected adaptive direction (normative override)

The Phase 1 visual truth combines the user-selected adaptive Home with the selected decision flow:

- **Adaptive Home reference:** `BUILD_CONTEXT/design-references/adaptive-home-option-3.png`
- **Primary structure:** `BUILD_CONTEXT/design-references/option-3-checklist-coach.png`
- **Focused explanation treatment:** `BUILD_CONTEXT/design-references/option-2-plain-language-visual.png`

Adaptive Home Option 3 controls the entry hierarchy: editorial greeting, large composer, one briefing item, and no component-dump dashboard. Decision Option 3 controls the full decision hierarchy: a simple service shell, a vertical three-step journey, one active section, clear completed/current/pending states, and a single dominant action. Decision Option 2 contributes only the compact, plain-language visual inside the active step. This override replaces the older persistent recommendation rail, permanent sidebar, dark console header, global Decision Guide, and scenario-picker-first treatment described later in this document.

The target user is Jordan, a frequently interrupted food-bank operations coordinator. The page should feel like a calm task checklist, not a planning dashboard, analyst console, AI chat, or executive command center.

### 0.1 Phase 1 visual system

- **Foundation:** IBM Carbon components and icons, assistant-ui primitives for the supporting chat thread, IBM Plex Sans/Mono for interface text, Newsreader for calm display headings, and Recharts for verified quantitative comparisons.
- **Palette:** paper white `#fbfaf7`, warm raised surface `#f5f2eb`, charcoal `#25231f`, deep blue action `#174b7a`, ochre attention `#9a6500`, forest completion `#2f6b45`, restrained red breach `#a63a3a`.
- **Shape:** 8px default radius and 12px emphasized radius; status tags may remain pill-shaped.
- **Elevation:** flat page and task surfaces; subtle shadow only for dialogs and menus.
- **Targets:** minimum 44px interaction height; visible keyboard focus; reduced motion honored.
- **Responsive:** no horizontal scrolling at 1440×1024, 1280px, 200% zoom, or 390×844. The journey remains linear and actions stack on narrow screens.

### 0.2 Screen hierarchy

1. Nourish Ops shell and persistent simulation notice.
2. On Home: greeting, composer, lightweight prompt examples, then one item from `Today’s decision queue`; no recommendation appears before agent review.
3. In a decision: plain-language issue label, headline, one-sentence explanation, and three-step journey.
4. At most one compact visual (approximately 120–160px high) in the current/completed issue step.
5. One recommended response and one primary action.
6. Alternatives, rationale, evidence, assumptions, and technical context only through labeled disclosures.

The assistant has a conventional open-source thread/composer structure but remains a separate focused route. Its context surface shows the typed agent outcome, live/fallback mode, verified-source count, safety recheck, and manager-approval boundary. Its handoff is `Open agent recommendation` or `Review blocking records`; there is no chat approval control.

The review card begins with `Agent recommendation`, `Prepared by the Nourish Decision Agent`, and an honest mode tag. A compact verification strip states the verified record count, constraint result, and manager-approval requirement. Scenario E uses the same provenance language as `Agent-safe stop`, while its red blocked step and unavailable confirmation remain visually dominant. AI is communicated through provenance and bounded capabilities, never sparkles, avatars, glowing borders, or theatrical thinking animation.

### 0.3 Scenario visual mapping

| Scenario | Visual |
|---|---|
| A | Four-week coverage bars with a labeled minimum and highlighted Aug 10 breach; approved result is a before/after comparison. |
| B | Refrigerated-capacity comparison for full acceptance, capacity, and recommended partial acceptance. |
| C | Offer versus target comparison, followed by approved redirected amount. |
| D | Available budget, combined need, recommended spend, and remaining balance. |
| E | Stacked source-conflict rows with field, finding, source IDs, and observed values; no quantitative chart. |

All charts have a plain-language summary and an expandable semantic table. There are no gauges, score rings, decorative gradients, custom SVG illustrations, or decorative animation.

## 1. Selection record

| Field | Value |
|---|---|
| Ideation set date | 2026-07-13 |
| Selected displayed option | Full redesign · Carbon foundation |
| Selected direction name | Checklist Coach with focused operational visual |
| Selection feedback | Build around Option 3's simple checklist for a food-bank employee, retaining one useful Option 2-style visual. Use open-source Carbon patterns wherever possible and custom-build only domain-specific presentation. |
| Final reference asset paths | `BUILD_CONTEXT/design-references/adaptive-home-option-3.png`; `BUILD_CONTEXT/design-references/option-3-checklist-coach.png`; `BUILD_CONTEXT/design-references/option-2-plain-language-visual.png`; implementation QA captures in `BUILD_CONTEXT/design-qa/` |
| Approved by | User (2026-07-17, persona-led full redesign) |

The original ideation moved from Control Desk to Clinical Calm. The user then explicitly requested a complete redesign built smartly on an open-source professional UI. **Operational Dossier** retains the calm, humane intent while adopting IBM Carbon for controls, dialogs, navigation, progress, tables, notifications, accessibility behavior, and IBM Plex typography. Custom work is limited to the domain-specific risk narrative, recommendation rail, projection, before/after outcome, and evidence compositions.

## 11. Selected design tokens — Operational Dossier (Carbon)

Light-native, editorial operations workspace built on Carbon White. Carbon components own interaction states and accessibility. NourishOps owns the information hierarchy: disruption first, verified recommendation second, human action third, evidence and agent trace on demand.

### 11.1 Color tokens

| Token | Value | Role |
|---|---|---|
| `--bg` | `#F4F4F4` | Carbon Gray 10 page ground |
| `--appbar` | `#161616` | Carbon Gray 100 application header |
| `--panel` | `#FFFFFF` | Default grouped surface |
| `--raised` | `#F8F8F8` | Carbon Gray 10 quiet layer and row hover |
| `--line` | `#E0E0E0` | Default divider |
| `--line-strong` | `#A8A8A8` | Emphasized rule and outline |
| `--ink` | `#161616` | Carbon Gray 100 primary text |
| `--sub` | `#525252` | Carbon Gray 70 secondary text |
| `--action` | `#0F62FE` | Carbon Blue 60 primary interaction and conservative series |
| `--action-ink` | `#FFFFFF` | Text/icon on `--action` fills |
| `--breach` | `#DA1E28` | Carbon Red 60 hard breach and blocked constraint |
| `--warn` | `#8E6A00` | Accessible warning text on pale yellow |
| `--ok` | `#198038` | Carbon Green 60 completed simulated transition |
| `--series-conservative` | `#0F62FE` | Chart: conservative projection (primary solid) |
| `--series-after` | `#198038` | Chart: with-approved-action projection |
| `--series-expected` | `#8A3FFC` | Chart: expected projection (secondary, dashed) |

Light tints use Carbon token equivalents: breach `#FFF1F1`, ok `#DEFBE6`, warn `#FCF4D6`, action `#EDF5FF`. Status color always ships with text or a distinct shape. The minimum line keeps a direct label and differs from every projection series in both color and geometry.

### 11.2 Typography

- **Families:** UI sans = Carbon's `IBM Plex Sans`, with `Helvetica Neue`, Arial, sans-serif fallback. Machine records use `IBM Plex Mono`, `SFMono-Regular`, Consolas, monospace.
- **Numbers use the sans family with `font-variant-numeric: tabular-nums`** for column alignment — not monospace. Mono is reserved for machine identifiers (e.g. `INB-USDA-PROTEIN-104`) and rule codes.
- Scale: body 14–16px; operational eyebrows 11px; section headings 16–22px; decision headings 30–48px responsive; primary metric values 24px.
- Plain language leads; explanation lines ≤ ~65 characters; primary-view prose ≤ 120 words.

### 11.3 Spacing, shape, elevation, icons

- **Spacing:** Carbon 4px base grid — 8/12/16/24/32/40/48/64. Main padding 32px desktop / 16px mobile.
- **Radii:** Carbon-square by default. Status tags may be pill-shaped; domain panels use rules and color bands rather than rounded card decoration.
- **Control height:** Carbon sizes; critical decision actions are 48px.
- **Elevation:** flat by default. Shadow is limited to the sticky recommendation dossier, dialogs, menus, and the Decision Guide panel.
- **Icons:** Carbon Icons for Carbon controls. Existing Lucide domain/status marks may remain until replaced, but no custom SVG, emoji, or AI-themed decoration is introduced.

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
