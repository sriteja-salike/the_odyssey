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

## Backend build (`src/nourishops/`) — status

Scaffold + contract harness in place; the deterministic engine is next. Runnable today with only `jsonschema` + `pytest` (no full install needed):

| Command | What it does |
|---|---|
| `make doctor` | Tool + fixture readiness, no state change |
| `make guard` | Fails if the engine leaks a binary float — enforces the Decimal rule (`04 §4.0`) at commit time |
| `make test-contracts` | Schema-validates all 5 goldens + 8 fixtures + 5 overlays (18 checks) |
| `make test-golden` | Recomputes Scenario A's anchors (forecast 9,000 · breach W2 12,000 · gap 15,000 · priority 61) in Decimal **from fixtures** and asserts them against the golden |
| `make test` | guard + contracts + golden |

Layout follows `BUILD_CONTEXT/05 §5`: `src/nourishops/{domain,application,agents,persistence,api,cli}`. The full toolchain (uv lockfile, FastAPI app, `make dev/build/start`, frontend) lands with the engine.
