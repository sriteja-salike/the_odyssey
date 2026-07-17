# Product Design QA — Core Food-Bank Decision Flow

Date: 2026-07-17
Branch: `codex/carbon-ui-redesign`

## Visual truth

- Full-layout reference: `BUILD_CONTEXT/design-references/option-3-checklist-coach.png`
- Focused-visual reference: `BUILD_CONTEXT/design-references/option-2-plain-language-visual.png`
- Desktop implementation comparison: `BUILD_CONTEXT/design-qa/review-1440x1024.jpg`
- Final focused visual confirmation: `BUILD_CONTEXT/design-qa/review-final-default.jpg`
- Approved result: `BUILD_CONTEXT/design-qa/approved-1440x1024-final.jpg`
- Mobile review: `BUILD_CONTEXT/design-qa/review-mobile-top.jpg`
- Mobile abstention: `BUILD_CONTEXT/design-qa/abstained-390x844-full.jpg`

The Option 3 reference and desktop implementation were inspected together in one comparison input. The Option 2 reference and implementation were then inspected together in a second comparison input. Option 3 governs the linear checklist, task hierarchy, and one-primary-action treatment. Option 2 governs only the compact plain-language chart and operational effect treatment. The reference's permanent `Today` sidebar was intentionally omitted because the approved Phase 1 contract requires no permanent right sidebar.

## Verified states and viewports

| State | Viewport / check | Result |
|---|---|---|
| Draft | Desktop | One active Step 1 and one `Check impact` primary action. |
| Ready for review | 1440×1024 | No horizontal overflow; `Review and approve` is visible at y=945–992. |
| Ready for review | 390×844 | No horizontal overflow; linear task flow and stacked actions. |
| Ready for review | Effective 720×512 (200% zoom equivalent) | No horizontal overflow; primary action remains present. |
| Approved | 1440×1024 | Step 3 before/after visual is followed immediately by outcome feedback; no external action claim is explicit. |
| Abstained | 390×844 | Source-conflict rows, Step 2 blocked, Step 3 unavailable, zero approval controls. |
| Scenarios B–D | Desktop | Correct issue, recommendation, visual, numerical anchors, and one approval control for each. |
| Offline fallback | Desktop | API unavailable creates a frozen offline run, displays `Offline verified`, analyzes, and renders the safe recommendation. |
| Records | Desktop/mobile | Compare table and Audit route both render; Audit remains available on non-A mobile scenarios. |

## Interaction and accessibility checks

- Draft → impact check → ready for review → approval confirmation → simulated result completed.
- Approval dialog receives initial focus on `Approve simulated action`; keyboard Enter behavior is covered by the interaction test.
- Alternative selection requires a manager reason before approval.
- Scenario E exposes no approval control.
- Outcome feedback records successfully; recommendation-quality feedback stays behind its disclosure.
- Testing Library and axe-core cover the draft and abstained structures, labels, headings, and dialog flow.
- Charts have a plain-language summary, hidden chart semantics, and an expandable exact-value table.
- Interaction targets are at least 44px; reduced-motion rules remain in effect.
- Final browser check found zero console errors. Earlier session warnings were historical Carbon deprecation warnings from the replaced shell, not errors from the final build.

## Findings and iteration history

1. P1 — concise `useEffect` returned the browser's scroll result and caused a React cleanup crash. Fixed by making the effect explicitly return nothing.
2. P1 — the review action initially fell below the 1024px viewport. Fixed by using the selected compact Option 2-style chart inside the completed step and tightening only the active recommendation spacing.
3. P1 — Audit was hidden on Scenario E at 390px. Fixed by hiding only the Scenario A Compare link at the narrowest breakpoint.
4. P1 — the approval modal initially focused Carbon's close icon. Fixed by scoping the primary-focus selector to form fields or the modal footer primary action.
5. P1 — the approved chart repeated the baseline-risk summary. Fixed by mapping result-specific plain-language outcome copy and compacting completed steps so outcome feedback begins in the first viewport.
6. P2 — Scenario E used an invalid `article[role=listitem]` combination. Fixed with neutral list-item containers; axe-core now reports no violations in the tested states.
7. P2 — quantitative reference labels clipped at chart edges. Fixed by centering the verified threshold label on the reference line.
8. P2 — Carbon's Records menu required an explicit accessible name. Added `aria-label="Records"`; the rebuilt app has zero new browser console errors.

No P0, P1, or P2 findings remain open.

final result: passed
