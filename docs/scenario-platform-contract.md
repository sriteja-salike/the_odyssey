# Scenario platform contract

The platform treats each problem variation as data around one stable decision lifecycle:

1. A scenario overlay selects or changes source records.
2. The context builder separates the incoming incident, current operational knowledge, and organizational rules.
3. The deterministic engine validates inputs, projects outcomes, detects risks, enumerates the allowed action catalog, rejects infeasible actions, and ranks the remainder.
4. A manager previews, approves, edits, rejects, or defers a recommendation.
5. Approval creates a simulated execution request; it never claims that an external action completed.
6. Feedback and every state-changing event are appended to the PostgreSQL audit history.

## What varies by scenario

- Incident records and supporting evidence
- Source-record overlay operations
- Focus categories and relevant policies
- Primary risk type
- Enabled action catalog
- Golden assertions for the intended recommendation and safe-stop behavior

## What remains stable

- PostgreSQL source snapshots and provenance hashes
- `scenario-context/1.0.0` response shape
- Decimal-only engine arithmetic
- Validation, projection, constraint checking, ranking, and confidence flow
- Action preview and full revalidation after quantity edits
- Human approval boundary
- Simulated execution gateway
- Append-only audit and recommendation feedback

## Scenario B proof

Scenario B enters as a structured offer for 20,000 lb of refrigerated produce with five days of usable life. Current knowledge shows 15,000 lb on hand, 14,000 lb weekly distribution, and no week-one produce inbound. Organizational knowledge supplies the 40,000-lb refrigerated limit, produce coverage policy, and five permitted responses.

The engine rejects full acceptance because it would create a 50,000-lb peak and 6,000 lb of expiry spoilage. It recommends accepting 10,000 lb, which reaches the 40,000-lb capacity boundary without modeled offer spoilage. Approval creates a `PARTIAL_DONATION_ACCEPTANCE_REQUEST` in the simulated operations gateway.

The current React experience is intentionally not part of this contract. It will be redesigned after backend scenario logic is verified so screens consume the general incident, knowledge, risk, action, execution, and feedback contracts instead of Scenario A-specific fields.

## Implemented platform hardening

Every new run now pins and hashes an immutable source-version manifest, including its
versioned scenario package. Connector refreshes only affect later runs. Mutating API
routes require idempotency keys, persist the replayable response atomically with the
mutation, serialize same-run decisions, and reject stale recommendation revisions.

The remaining deliberate boundary is the simulated execution gateway. Real outreach
or operational writes are out of scope until a separate authorization and integration
contract is designed.
