# Scenario platform contract

The platform treats each problem variation as data around one stable decision lifecycle:

1. A scenario overlay selects or changes source records.
2. The package-selected context builder freezes the incident, current operational knowledge, organizational rules, and provenance into a shared bundle.
3. The deterministic engine validates inputs, projects outcomes, detects risks, enumerates the allowed action catalog, rejects infeasible actions, and ranks the remainder.
4. A bounded AI orchestrator explains the verified result; an isolated reviewer and backend authority validator recheck it.
5. A manager previews, approves, edits, rejects, or defers a recommendation.
6. Approval creates an immutable action intent and a completed simulated receipt; no external write occurs.
7. Recommendation feedback, action outcomes, timings, fallback status, and every state change are appended to PostgreSQL.

## What varies by scenario

- Incident records and supporting evidence
- Source-record overlay operations
- Focus categories and relevant policies
- Primary risk type
- Enabled action catalog
- Golden assertions for the intended recommendation and safe-stop behavior

## What remains stable

- PostgreSQL source snapshots and provenance hashes
- Package-selected, versioned context builder registry
- `scenario-context/1.0.0` response shape
- `context-bundle/1.0.0` frozen retrieval shape
- Decimal-only engine arithmetic
- Validation, projection, constraint checking, ranking, and confidence flow
- Action preview and full revalidation after quantity edits
- Human approval boundary
- Simulated execution gateway
- Append-only action intent, execution receipt, audit, recommendation feedback, and outcome feedback

## Scenario B proof

Scenario B enters as a structured offer for 20,000 lb of refrigerated produce with five days of usable life. Current knowledge shows 15,000 lb on hand, 14,000 lb weekly distribution, and no week-one produce inbound. Organizational knowledge supplies the 40,000-lb refrigerated limit, produce coverage policy, and five permitted responses.

The engine rejects full acceptance because it would create a 50,000-lb peak and 6,000 lb of expiry spoilage. It recommends accepting 10,000 lb, which reaches the 40,000-lb capacity boundary without modeled offer spoilage. Approval creates a `PARTIAL_DONATION_ACCEPTANCE_REQUEST` intent and a `SIMULATED_COMPLETED` receipt in the simulated operations gateway.

The React experience keeps the richer Scenario A hero renderer and uses the general
decision-brief contract for Scenarios B–D. All actionable frozen scenarios now share
the same review, approval, simulated receipt, audit, and feedback loop; Scenario E
continues to demonstrate a safe abstention.

## Implemented platform hardening

Every new run now pins and hashes an immutable source-version manifest, including its
versioned scenario package and closed JSON Schema set. Replay reads that stored
contract rather than the live package registry, and source selection requires each
package-declared source ID. Connector refreshes only affect later runs. Mutating API
routes require idempotency keys, persist the replayable response atomically with the
mutation, serialize same-run decisions, and reject stale recommendation revisions.

Every deterministic solver result is checked against the shared result contract before
an AI adapter can see it. Live AI wording is restricted to backend-authored grounded
statements; any changed or invented narrative falls back to the deterministic offline
renderer. A separate reviewer records a closed verdict. The decision trace exposes what
each stage consumed and produced, its duration, mode, and hashes without exposing
private chain-of-thought.

The action loop is complete for the demo: manager approval, immutable intent,
simulation receipt, recommendation feedback, and observed outcome feedback. Real
outreach or operational writes remain out of scope until an adapter-specific
authorization and integration contract is designed.
