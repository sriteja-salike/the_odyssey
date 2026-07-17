# PostgreSQL simulation architecture

This implementation intentionally advances the original local SQLite P0 decision in `BUILD_CONTEXT/05_ARCHITECTURE_AND_RUNBOOK.md`. The July 2026 implementation direction requires mock systems to be accessed through production-shaped infrastructure, so PostgreSQL is now the runtime boundary for both source-system snapshots and application records.

## Database boundaries

`integration.*` represents read-only connector output:

- warehouse management and current inventory constraints;
- receiving/inbound ERP records;
- distribution history;
- donation offer CRM;
- procurement response catalog;
- organizational policy registry;
- operations notes and notices;
- synthetic scenario-control overlays.

The committed JSON fixtures remain the authoritative synthetic seed. Startup snapshots them into PostgreSQL with source IDs, versions, observation timestamps, and hashes. The application then reloads Scenario A from PostgreSQL and passes it through the same schema validation and normalization code used by the golden tests.

`nourishops_app.*` owns application records:

- immutable run identity;
- append-only run events protected from update/delete by database triggers;
- simulated execution requests;
- recommendation feedback and optional survey answers;
- immutable per-run input documents and package identity;
- insert-only idempotency records and exact replay responses.

## Safety boundary

Approval creates a `SIMULATED_SUBMITTED` execution with a stable request ID and `external_write_performed=false`. It demonstrates the future ERP/CRM/task-system handoff without placing a purchase order, contacting a donor, reserving food, or notifying another organization.

## Adding another scenario

Each new scenario is declared by a versioned package under `scenarios/packages/`.
The package selects its inputs, schemas, normalizer, explicit problem type, solver, and
result contract while reusing the shared run, evidence, decision, feedback, and audit
pipeline. See `docs/decision-platform-architecture.md` for the extension checklist and
complex-solver seam.
