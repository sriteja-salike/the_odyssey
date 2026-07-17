# ShareStack connected journey audit

Date: 2026-07-17  
Surface: local desktop app at `http://127.0.0.1:5173`  
Representative user: Jordan, a frequently interrupted food-bank operations coordinator

## Overall verdict

The core decision workspace is demoable, but the full product journey is not yet closed. The strongest path is **issue → agent review → human approval → recorded result → feedback**. The most important remaining work is not visual polish; it is connecting global state across Today, Ask, the decision workspace, and Records so the product always communicates what was completed, what remains urgent, and which conversation or record is active.

## Journey map and health

| Step | User intent | Current touch point | Health | Evidence |
| --- | --- | --- | --- | --- |
| 1 | See what needs attention | Today composer and decision queue | Needs work | `01-home.png` |
| 2 | Ask a general or case-specific question | Ask workspace | Partial | `02-ask.png` |
| 3 | Understand the issue and agent recommendation | Three-step decision workspace | Healthy | `03-decision-review.png` |
| 4 | Verify safety and approve | Approval dialog | Healthy after wording correction | `04-approval.png` |
| 5 | Understand the outcome and report whether it worked | Result and feedback | Healthy locally after wording correction | `05-result.png`, `06-feedback.png`, `11-result-updated.png` |
| 6 | Return to prior evidence and decisions | Records | Partial | `07-records.png` |
| 7 | Stop safely when evidence conflicts | Scenario E safe stop | Screen is healthy; discovery is weak | `08-safe-stop-entry.png`, `09-safe-stop.png` |
| 8 | Reject a recommendation and retain the reason | Rejection result | Healthy | `10-rejected.png` |

## What is already strong

- Today offers a low-friction start: type a question or open a verified issue.
- The decision workspace answers the three user questions in the right order: what is wrong, what the agent recommends, and whether approval is safe.
- The agent remains the source of the recommendation while the manager remains the decision-maker.
- Recommendation rationale, evidence, rejected options, and technical trace are progressively disclosed instead of dominating the task.
- Approval is deliberate, repeats the operational facts, and clearly states that it does not place orders or contact partners.
- Rejection captures a required reason and offers a sensible next move through the agent.
- Scenario E correctly removes approval and exposes conflicting evidence.
- Outcome and recommendation-quality feedback are separated, which keeps the immediate result question simple.

## P1 journey gaps

### 1. Today is not driven by decision state

After approval, rejection, or deferral, returning to Today still presents the same issue as ready for review. This makes the system look as though it did not remember the user's work. The queue needs to derive status from the active run or record: **ready**, **in review**, **completed**, **deferred**, or **safe stop**.

### 2. Queue order does not reflect urgency

The data-conflict safe stop is marked `NOW`, but it appears fifth in the one-card sequence. Jordan must click through four items to discover the most urgent case. Priority and due time should determine ordering, and the interface should expose a compact queue overview instead of relying on memory.

### 3. Records is a latest-record shortcut, not decision history

Records only loads the last run stored in the current browser session. Starting another case replaces the navigable record. The heading and copy currently promise more than the surface provides. A strong demo needs at least an in-session list of completed, rejected, deferred, and abstained runs, with state and timestamp.

### 4. Ask session continuity is implicit

Opening Ask can restore a prior scenario conversation, but the user is not told that an existing case context was resumed. Add an explicit context header such as **Discussing: Protein coverage risk**, plus **New conversation** and **Return to decision** controls.

### 5. Global navigation changes across surfaces

Today uses Home / Ask / Records, while the decision workspace uses Home / Current decision / a Records menu. This raises avoidable orientation cost. One application shell should preserve the same top-level destinations and show the active case as secondary context.

### 6. Safe stop has no resolution handoff

Scenario E explains the conflict correctly, but the journey ends at asking the agent or starting over. The product needs a non-approval resolution path: identify the record owner, request or mark a correction, and return when the source is reconciled.

## P2 polish and interaction improvements

- Show visible queue position and status without requiring repeated `Continue to next item` clicks.
- Give completion a clear next-step hierarchy: first **Return to Today**, then feedback and record review.
- Avoid competing terminal CTAs after rejection; emphasize the next operationally useful action.
- Label estimated quantities and costs consistently in review and results.
- Use a persistent case label across Ask, decision review, result, and Records.
- Provide a visible loading and retry model for every agent transition, including what data is being checked.

## Wording decision

The primary UI now uses **Action completed**, **Approve action**, and **Estimated cost**. The persistent simulation notice remains in the global shell, and technical details still retain the execution status needed for auditability. This avoids making the result feel like a prototype artifact while preserving truthful system boundaries.

## What can be tested now

### Strong demo paths

1. Scenario A: open the issue, ask the agent to review, inspect the impact visual, approve, review the result, submit outcome feedback, and open the audit record.
2. Scenario A alternative: show other options, select one, enter the manager reason, and approve.
3. Scenario A quantity edit: change quantity, verify the previewed cost/effect, enter a reason, and approve.
4. Rejection: reject the recommendation, provide a reason, confirm that feedback is recorded, and continue into Ask.
5. Deferral: decide later, provide a reason, verify that the risk remains open, and return to the decision.
6. Scenarios B–D: verify the recommendation, exact quantitative visual, alternatives, and approval result.
7. Scenario E: verify conflicting source records, the absence of approval controls, and the Ask-agent handoff.
8. Records: open the most recent decision, its audit trace, and Scenario A comparison.
9. Ask: start from the Home composer, a decision-specific question, and a post-rejection question.
10. Offline fallback: disconnect the API after loading evaluated data, verify the offline label and frozen-option limits, then reconnect and retry.

### Usability checks

1. Complete the approval path using only the keyboard; verify logical focus order, visible focus, modal focus placement, and Escape/cancel behavior.
2. Test at 1440×1024, 1280px, 390×844, and 200% browser zoom without horizontal scrolling.
3. Use a screen reader to verify page headings, dialog names, disclosure labels, live loading announcements, chart summaries, and data-table alternatives.
4. Verify that no control is visually disabled unless it is truly unavailable, and that unavailable actions explain why.
5. Confirm that repeated clicks or slow responses cannot create duplicate decisions or feedback.

## Do not treat these as complete yet

- Today does not update or reorder itself from decision outcomes.
- Records is not a real multi-decision history.
- Ask does not clearly distinguish resumed context from a new conversation.
- The shell is not fully consistent between global and case-specific surfaces.
- Safe stop does not yet support source correction or ownership handoff.
- Offline fallback should be tested as resilience behavior, not presented as the primary demo path.

## Accessibility and evidence limits

The reviewed screens use semantic headings, named dialogs, visible labels, disclosure controls, and clear status copy. Approval focus placement is covered by an interaction test. This audit does not claim full WCAG conformance: mobile screen-reader behavior, full keyboard traversal across every disclosure, color-contrast measurement, reduced-motion behavior, and browser/assistive-technology combinations still require dedicated verification.

## Recommended next implementation pass

Create one shared journey-state model that drives queue ordering and status, active-case context, Ask session identity, and the Records list. Then unify the application shell around that model. This will make the existing polished screens behave like one product rather than connected demos.
