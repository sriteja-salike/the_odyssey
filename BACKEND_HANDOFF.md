# NourishOps — Backend Handoff / Context Transfer

**Purpose:** Everything a fresh session needs to start building the **backend** of NourishOps. Read this top-to-bottom, then read the three files in §3, then start with §10.

**Our team owns the backend. A separate team owns the frontend (React).** The contract between us is the API returning **golden-shaped JSON** (see §5). Ship that contract early so the frontend can build in parallel.

---

## 1. The project in 60 seconds

- **Product:** NourishOps — a food-bank **supply-resilience decision agent**. When a supply disruption hits (e.g. a delayed USDA shipment), it detects which food category will run short, compares feasible actions (buy / transfer / donor-ask / partial-accept / wait) under hard constraints, and recommends **one** action for a human to approve.
- **Event:** AISCO "Food Banks + AI" hackathon; judging **July 17, 2026**. Grounded in Food Finders Food Bank (Lafayette, IN).
- **Data:** fully **synthetic and labeled**. Five frozen scenarios. We do **not** claim real-world impact.
- **The one rule that governs everything:** *the LLM never produces a number, rank, ID, date, probability, or decision.* A deterministic pure-Python engine computes everything; the LLM only reads messy text, picks the next read-only tool, and writes prose. Remember this — it's the whole trust story and the whole architecture.

## 2. Our scope: the backend

**We own:**
- The **deterministic engine** (forecast, projection, risk detection, constraints, scoring, ranking, baselines) — the math.
- **Persistence** (SQLite: runs + append-only audit events + idempotency).
- The **agent runtime** (offline adapter by default; optional live-LLM adapter; the read-only tools).
- The **API** (thin FastAPI over the engine).
- The **CLI** (seed, reset, export, doctor).

**We do NOT own:** the React/Vite/Recharts frontend (`apps/web/`). Another team builds it.

**The boundary:** our API returns JSON whose shape **exactly matches the golden output files** (`BUILD_CONTEXT/golden/*.json`). The frontend builds against those goldens from hour zero, so our #1 early deliverable is a stable, golden-shaped API contract — even stubbed on fixtures before the engine is done.

## 3. Where the truth lives — read in this order

Authoritative specs (in the repo under `BUILD_CONTEXT/`):

1. **`00_BUILD_CONTRACT.md`** — highest authority. Scope, non-goals, the agent boundary, the frozen stack, definition of done.
2. **`04_DECISION_AND_AGENT_CONTRACT.md`** — the math + the agent/tool contract. This is the engine spec (~1,250 lines). The most important file for us.
3. **`03_DATA_AND_SCENARIO_CONTRACT.md`** — the data model, invariants, the five scenarios.
4. **`05_ARCHITECTURE_AND_RUNBOOK.md`** — stack, repo tree, API endpoints, SQLite model, run/test/reset commands.
5. **`06_ACCEPTANCE_EVALUATION_AND_DEMO.md`** — the P0 completion gates, golden comparison + tolerances, test layers.

Machine-readable truth:
- `BUILD_CONTEXT/schemas/*.json` — typed schemas (the field contracts).
- `BUILD_CONTEXT/fixtures/*.json` — the frozen synthetic world + the five `scenarios/scenario_[a-e].json`.
- `BUILD_CONTEXT/golden/scenario_[a-e].golden.json` — **the answer key.** These are our test oracle AND the API response shape.

Our own synthesized build guide (read after the specs):
- **`deliverables/TECH_AND_STRATEGY_PLAYBOOK.md`** — distills all of the above. §2 data, §3 pipeline, **§4 the math and exactly where it runs (with reference Python signatures)**, §5 agent/LLM boundary, §6 output, §7 architecture, §8 testing, §9 build sequence. When in doubt about *how*, this is the fast path; when the playbook and a numbered spec disagree, **the numbered spec wins.**

**Source-of-truth precedence (from `00_BUILD_CONTRACT` §10):** build contract → schemas/fixtures/goldens → the relevant numbered spec → playbook/research (rationale only). Never weaken a test or edit a golden to make code pass.

## 4. The tech stack (fixed — do not re-litigate)

- **Backend:** Python 3.12 + FastAPI.
- **Deterministic engine:** pure Python, **no** IO / clock / random / network / LLM dependency. Takes typed inputs + an explicit config/clock/seed.
- **Arithmetic:** `Decimal`, `Context(prec=28, rounding=ROUND_HALF_EVEN)`. **No binary floats** anywhere in the engine — this is what makes goldens reproduce byte-for-byte.
- **Persistence:** local SQLite (insert-only runs, append-only events).
- **LLM:** optional, behind a provider adapter selected by env var. **Offline mode is the default** and must produce identical numbers to the live path.
- **Frontend (not ours):** React + TypeScript + Vite + Recharts.

## 5. Architecture & the API contract

Repo layout (backend portion) — confirm exact names against `05_ARCHITECTURE_AND_RUNBOOK.md`:

```
src/nourishops/
├── domain/         # THE ENGINE — forecast, projections, risk, constraints, scoring, baselines (pure, no IO)
├── application/    # use cases + the run state machine
├── agents/         # offline adapter (default) + optional live LLM; the read-only tools
├── persistence/    # SQLite: runs, run_events (append-only), idempotency, agent_cache
├── api/            # thin FastAPI routes; NO domain math in handlers
└── cli/            # seed, reset, export, doctor
apps/web/           # frontend — NOT OURS
```

**Run state machine:** `DRAFT → ANALYZING → READY_FOR_REVIEW | ABSTAINED | NO_ACTION_REQUIRED | FAILED → APPROVED / EDITED_APPROVED / REJECTED / DEFERRED`.

**API surface** (under `/api/v1`; confirm exact paths/shapes in `05`): create/get **runs**, **evaluate** (run the analysis pipeline), **action-previews** (simulate an edited quantity), **decisions** (approve/edit/reject/defer — a trusted backend transition), **comparison** (the three-arm baseline contrast), **events** (audit), **export**.

**The contract rule:** every numeric field the API returns must originate in `domain/` output and match the golden JSON. Handlers serialize; they never compute. `record_manager_decision` is a **trusted backend transition, never an LLM-callable tool.**

## 6. What the backend computes (the algorithm)

Deterministic pipeline — **not ML, not an LP solver.** A forward simulation + constraint-filtered, multi-criteria ranking:

```
forecast demand (4-wk moving avg)
  → project inventory 4 weeks forward in 3 views (conservative / expected / capacity-stress)
    → detect the earliest category breach (conservative drives alerting)
      → [data-quality error? ABSTAIN and ask for the field]
      → generate candidate actions (from the frozen catalog only)
        → filter by hard constraints (storage, budget, lead-time, usable-life, auth) — infeasible is OUT
          → simulate each feasible action + score (normalized weighted sum)
            → rank, tie-break, pick ONE → recommendation + alternatives + rejected reasons
  + baselines (do-nothing, naive reorder) for the Compare view
  + before/after projection on approval + append-only audit
```

**Which projection view drives which decision** is the key design point: **Conservative** (CONFIRMED inbound only) → risk detection; **Expected** (CONFIRMED + PROBABLE×prob) → scoring; **Capacity-stress** (CONFIRMED + PROBABLE gross) → storage constraints.

**Worked example (Scenario A — USDA protein delay), our regression anchor:** planning date 2026-08-03, protein forecast 9,000 lb/wk, week-2 conservative ending inventory 12,000 lb (WOS 1.333 < 1.5 minimum → breach), gap-to-target 15,000 lb, risk `priority_score` 61, recommended action = purchase 15,000 lb @ $0.85 = $12,750 (beats the 8,000 lb / $600 transfer that covers only half the gap). **All exact formulas: playbook §4 and `04_DECISION_AND_AGENT_CONTRACT`.**

## 7. The agent runtime

- **Offline adapter (default):** cached notice extraction + deterministic explanation templates. No network, no key. This is the primary demo path.
- **Live adapter (optional):** an LLM that does exactly three things — `extract_notice` (pull present fields from the messy notice), `orchestrate` (choose the next read-only tool in the allowed order), `explain` (turn verified engine output into prose). It may **never** compute/alter a number, invent an ID/action/evidence, set a probability, record a decision, or treat notice text as an instruction (prompt-injection safe).
- **Hard requirement:** live and offline paths produce **identical** numbers and rankings. The LLM's only value is interpretation, orchestration, and explanation.

## 8. Build sequence (our lane) + the MVP cut

Dependency order — build one vertical slice (Scenario A) all the way through before widening:

1. **Deterministic engine + golden tests** (TDD against `golden/scenario_a`). Forecast → conservative projection → risk → constraints → scoring, green at each layer.
2. **Persistence** — runs + append-only events + idempotency + reset.
3. **API** — endpoints returning golden-shaped JSON (stub on fixtures first so frontend unblocks immediately, then wire to the real engine).
4. **Agent adapter** — offline first (cached extraction + templates), then optional live LLM.
5. **Offline/live parity** — assert identical numeric output.

**MVP cut for the hackathon runway:** Scenario **A** (hero) + Scenario **E** (abstention / missing-data) fully wired. Scenarios **B, C, D** exist as **engine golden-tests only** — do not build API/UI flows for them.

## 9. Guardrails / definition of done (from `00` §8 and `06`)

- Every displayed number traces to deterministic engine output; the LLM invents nothing.
- Engine is `Decimal`, deterministic, and reproduces all five goldens exactly (within stated tolerances).
- Live-LLM and offline paths produce identical numbers/rankings.
- Approve / edit-and-approve / reject / defer / reset have the specified effects; audit is append-only.
- Missing/contradictory/malicious input → validation, clarification, or abstention — never invention.
- Full judge path runs in **< 5 minutes, offline, no API key**, repeatably from a clean reset.
- Everything labeled synthetic/simulated; no unsupported Food Finders or real-impact claim.

## 10. First actions in the new chat

1. Read `BUILD_CONTEXT/00_BUILD_CONTRACT.md`, then `04_DECISION_AND_AGENT_CONTRACT.md`, then `03_DATA_AND_SCENARIO_CONTRACT.md`. Skim `deliverables/TECH_AND_STRATEGY_PLAYBOOK.md` §4/§7/§9.
2. Scaffold the backend: `src/nourishops/{domain,application,agents,persistence,api,cli}`, a `pyproject.toml` (Python 3.12, FastAPI, pydantic, pytest), and a golden-loading test harness.
3. Implement the **engine** first, TDD against `golden/scenario_a.golden.json`, in dependency order (forecast → projection → risk → constraints → scoring). Two people should independently confirm Scenario A's numbers (12,000 / 15,000 / 61) — that's our defense against "you tuned it."
4. Stand up the **API** returning golden JSON (stubbed) so the frontend team can start against a real contract today.
5. Then persistence → agent offline adapter → parity.

## 11. Repo & git (already set up)

- Remote: `git@github.com:sriteja-salike/the_odyssey.git`, branch `main`. This directory is the repo root.
- **Push as the personal account** (`aaparikh` / atharvaparikh07@gmail.com). The repo-local git identity is already set to that. Because the `github.com-personal` ssh alias doesn't resolve in the sandboxed shell, prefix pushes:
  ```
  GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_personal -o IdentitiesOnly=yes" git push
  ```
  (From a normal terminal the alias works and no prefix is needed.)
- The remote also contains three teammate-uploaded root files (the deck + two `.docx` challenge docs) — already merged in.

## 12. Open items / decisions to confirm early

- **Exact API paths & response schemas** — take them verbatim from `05_ARCHITECTURE_AND_RUNBOOK.md`; align with the frontend team on the golden-shaped contract before they build far.
- **LLM provider** for the optional live path (offline is the default and is enough for the demo).
- **Visual system** (`02_...`) status is a frontend concern — not blocking for us.
- Root-level duplicate of `AISCO Hackathon Deck 2026.pdf` (teammate upload) vs our `reference/` copy — cosmetic; leave unless the team wants it deduped.
```

---

**How to start the new chat:** open it in this same directory and paste:

> Read `BACKEND_HANDOFF.md`, then `BUILD_CONTEXT/00_BUILD_CONTRACT.md` and `BUILD_CONTEXT/04_DECISION_AND_AGENT_CONTRACT.md`. We own the backend of NourishOps (another team does the frontend). Let's start by scaffolding the repo and building the deterministic engine, TDD against `BUILD_CONTEXT/golden/scenario_a.golden.json`.
