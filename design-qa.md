# Product Design QA — Adaptive Home and Decision Flow

Date: 2026-07-17
Branch: `codex/carbon-ui-redesign`

## Visual truth

- Selected adaptive Home reference: `BUILD_CONTEXT/design-references/adaptive-home-option-3.png`
- Final desktop implementation: `BUILD_CONTEXT/design-references/adaptive-home-implementation.png`
- Side-by-side comparison input: `BUILD_CONTEXT/design-references/adaptive-home-comparison.png`
- Mobile implementation: `BUILD_CONTEXT/design-qa/adaptive-home-390x844.png`
- Assistant implementation: `BUILD_CONTEXT/design-qa/adaptive-assistant-1440x1024.png`
- Decision-flow references retained: `BUILD_CONTEXT/design-references/option-3-checklist-coach.png` and `BUILD_CONTEXT/design-references/option-2-plain-language-visual.png`

The selected Home reference and final implementation were normalized into one 2880×1024 comparison input and inspected together. The implementation follows the reference's editorial greeting, large issue composer, persistent simulation statement, one Agent Briefing item, and restrained service palette. It intentionally omits the reference attachment control because this release has no attachment workflow; no nonfunctional control was imitated. The briefing contains more verified context than the sketch while preserving one primary action.

## User-flow verification

| Flow / state | Result |
|---|---|
| Home at 1440×1024 | One composer, three lightweight prompt examples, one briefing item, and one primary response action. No scenario picker or card-grid dashboard. |
| Home at 390×844 | No horizontal overflow; simulation notice remains visible; bottom navigation has Home, Ask, and Records; briefing remains linear. |
| Effective 200% zoom | No horizontal overflow at the reduced viewport. |
| Composer → assistant | Example question opens `/assistant`, sends the initial question, and returns a verified answer with one matched case. |
| Assistant → decision | `Review response` creates and evaluates the matching case, then opens the existing structured review route. |
| Review → approval → result | Confirmation repeats action, quantity, cost, timing, and simulation consequence; approval produces `Action completed in simulation` and records outcome feedback. |
| Safe abstention | The conflicting-records work item opens Step 1 with field-specific discrepancies, blocks Step 2, makes Step 3 unavailable, and renders zero approval controls. |
| Offline fallback | Frozen work items, presentations, and assistant routing remain available without inventing quantities or permitting unverified custom previews. |

## Contract and accessibility verification

- Home and chat consume semantic `WorkItem` and `DecisionPresentation` contracts; generic surfaces do not branch on Scenario A–E.
- Frozen scenarios remain regression fixtures while five operational archetypes provide reusable skeletons.
- The assistant uses assistant-ui thread/composer primitives but cannot approve or mutate a decision.
- Quantitative visuals remain Recharts-based with plain-language summaries and expandable exact-value tables.
- Testing Library and axe-core cover the core draft, review dialog, and abstention structures.
- Final verification: 30 frontend tests, frontend typecheck, production build, Ruff, 87 backend tests plus 15 PostgreSQL integration tests.
- Fresh browser checks found zero console errors or warnings in Home, the 200% equivalent, and final safe-abstention routing.

## Findings and fixes

1. P1 — the first implementation centered and vertically stretched the Home hierarchy relative to the selected reference. Fixed by moving the simulation statement into the header, left-aligning the desktop hero, enlarging the composer, and bringing the briefing into the first viewport.
2. P1 — scenario fixtures originally risked becoming the navigation model. Fixed by replacing named scenario selection with a verified adaptive briefing and keeping demo fixtures under the overflow menu.
3. P1 — Scenario E exposed generic `Record` labels because the presentation mapper read the wrong field key. Fixed by mapping `field_name` to Shipment status, Expected arrival, and Shipment quantity with plain-language missing/conflict messages.
4. P2 — Scenario E conflict rows could share React keys. Fixed with stable field/source/index keys; the final browser pass has no duplicate-key warning.
5. P2 — the mobile navigation grid still assumed the previous number of destinations. Fixed to allocate all visible destinations without clipping or horizontal scroll.
6. P2 — a simulated approval handoff briefly showed historical hot-reload errors after a container rebuild. A clean reload and full repeated journey produced zero new console errors; no runtime defect remained.

No P0, P1, or P2 findings remain open.

final result: passed
