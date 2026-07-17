# NourishOps — Food Banks + AI Hackathon (AISCO 2026)

**Product:** NourishOps — a nutrition-aware supply-resilience decision agent for food banks.
**One line:** When a food bank's supply breaks, NourishOps spots the coming category shortage and recommends the one best fix — a human approves it.
**Grounding bank:** Food Finders Food Bank (Lafayette, IN). **Data:** fully synthetic and labeled.

---

## Where everything lives

| Folder | What's inside | Role |
|---|---|---|
| **`BUILD_CONTEXT/`** | 7 numbered specs + `schemas/`, `fixtures/`, `golden/` | The build bible. Highest authority for implementation. Start at `00_BUILD_CONTRACT.md`. |
| **`deliverables/`** | The pitch-facing documents (below) + `pdf/` | What we present and share. |
| **`docs/research/`** | Domain grounding, decision memo, cheat sheet, readiness plan, project plan | Background: *why* the concept was chosen. Non-normative — the build contract wins on conflicts. |
| **`reference/`** | AISCO deck + the two "Hack Info" docs | Official hackathon source material. |

## Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `NOURISHOPS_DOSSIER.md` (+ `pdf/`) | The full-scope explainer with diagrams — problem → product → demo → landscape → roadmap. Show-and-talk. |
| `THE_PITCH.md` | The single source of truth for the presentation: 5-minute timed script, demo clicks, 8 Q&A answers, slide list, pre-flight checklist. |
| `TECH_AND_STRATEGY_PLAYBOOK.md` | The engineering playbook: what to build, simulating data, processing, the math and where it runs, the output, architecture, testing, and the build sequence. |
| `red-team-battle-card.md` | Adversarial review: ranked attack vectors, per-judge prep, the verified 2026 fact block. |
| `food-bank-ai-problem-framing.md` (+ `pdf/`) | The original problem-first opportunity brief. |

## Build authority order (from `BUILD_CONTEXT/00_BUILD_CONTRACT.md`)

1. `00_BUILD_CONTRACT.md`
2. machine-readable schemas, fixtures, golden outputs
3. the relevant numbered `BUILD_CONTEXT/` spec
4. `docs/research/NUTRITION_AWARE_SUPPLY_RESILIENCE_AGENT_PROJECT_PLAN.md` (rationale)
5. `docs/research/HACKATHON_DECISION_MEMO.md` + domain grounding (background)
6. `reference/AISCO Hackathon Deck 2026.pdf` (competition constraints)

## Claim discipline

The prototype runs on synthetic, labeled data. We may say it detects predefined synthetic risks, compares catalog actions under simulated constraints, and shows evidence + human approval. We may **not** claim real-world impact, Food Finders validation, or production readiness. Problem-side figures (the 2026 federal shock) are real and cited; solution-side figures are simulated and labeled.

---

## Running the production-shaped simulation

Docker starts PostgreSQL, FastAPI, and the React application; startup migrations seed synthetic connector snapshots for the warehouse, receiving ERP, distribution history, donor CRM, procurement catalog, policy registry, and operations knowledge inbox. The adaptive Home turns the frozen A–E fixtures into plain-language work items, while the supporting assistant can answer verified questions and route into the same human-approved decision path. Reusable `DecisionPresentation` archetypes keep fixture names and scenario letters out of the operator experience.

```bash
make demo
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). API documentation is at [http://127.0.0.1:8180/docs](http://127.0.0.1:8180/docs), and PostgreSQL is exposed locally on port `55432` to avoid common development-service collisions.

The shared decision path is:

1. create an append-only run;
2. load current and organizational knowledge through PostgreSQL connector snapshots;
3. select an explicit deterministic solver by problem type;
4. let the provider-neutral AI layer explain only the verified recommendation package;
5. persist the recommendation and manager decision with replay protection;
6. create a clearly labeled simulated execution request;
7. capture recommendation feedback and optional survey context;
8. show the actual persisted event stream in Audit.

All records and outcomes remain synthetic. `SIMULATED_SUBMITTED` never performs an external write.

### Anthropic now, OpenAI-compatible later

Offline mode is the safe default. For one real Claude verification, copy `.env.example`
to the gitignored `.env`, set `NOURISHOPS_AGENT_MODE=live`, and add
`ANTHROPIC_API_KEY`. Then run:

```bash
make demo
make agent-smoke
```

The key is read only by the backend container. The browser never receives it. If live
configuration or provider output fails validation, the same deterministic result is
returned with an explicit offline-fallback status. OpenAI uses the same adapter and
typed output contract by changing provider, model, and key environment settings.

Architecture and the new-scenario checklist are in
[`docs/decision-platform-architecture.md`](docs/decision-platform-architecture.md).

## Build and verification

| Command | What it does |
|---|---|
| `make doctor` | Tool + fixture readiness, no state change |
| `make guard` | Fails if the engine leaks a binary float — enforces the Decimal rule (`04 §4.0`) at commit time |
| `make test-contracts` | Schema-validates all 5 goldens + 8 fixtures + 5 overlays (18 checks) |
| `make test-golden` | Recomputes Scenario A's anchors (forecast 9,000 · breach W2 12,000 · gap 15,000 · priority 61) in Decimal **from fixtures** and asserts them against the golden |
| `make test-agent` | Runs provider-neutral structured-output, authority, fallback, retry, and configuration tests without a key or network |
| `make test-integration` | Runs PostgreSQL lifecycle, immutable-input, parity, idempotency, rollback, and concurrency tests |
| `make test` | guard + contracts + goldens + agent tests |
| `make agent-smoke` | Makes one live Anthropic Scenario B evaluation through the public API |
| `make demo` | Builds and starts PostgreSQL + FastAPI + React, seeding synthetic source-system snapshots |
| `make demo-down` | Stops the demo while retaining the PostgreSQL volume |

The deterministic engine, adaptive Home, assistant handoff, and decision substrate cover
Scenarios A–E. New verified packages should map to an existing presentation archetype
where possible; genuinely new problem types add a solver and semantic presentation mapping,
not a memorized scenario tile.
