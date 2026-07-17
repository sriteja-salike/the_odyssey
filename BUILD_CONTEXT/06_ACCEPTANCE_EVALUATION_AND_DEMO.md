# 06 — Acceptance, Evaluation, and Demo Contract

**Status:** Normative acceptance contract; visual sign-off is blocked until `02_VISUAL_SYSTEM_AND_SCREEN_REFERENCE.md` becomes `SELECTED_AND_NORMATIVE`  
**Product:** NourishOps — Nutrition-Aware Supply Resilience  
**Evaluation domain:** Fixed synthetic scenarios only  
**Primary demonstration:** `SCN-A-USDA-PROTEIN-DELAY`

---

## 1. Purpose and pass rule

This document defines observable proof that NourishOps was implemented as specified. A feature is not complete because it renders, calls an LLM, or appears plausible. It is complete only when its acceptance cases pass against the frozen schemas, fixtures, decision rules, golden outputs, interaction contract, and visual reference.

P0 passes only when:

- every automated gate in this document passes without network access or a model key;
- every required manual accessibility, visual, clean-handoff, and demo check is signed off;
- all five scenarios reproduce their frozen golden outputs;
- no test was weakened, skipped, or updated merely to match an implementation mistake;
- the selected visual reference—not a generated default interface—is implemented;
- the team rehearses the exact judge path three consecutive times from new clean runs in under five minutes each.

The proof-of-concept may be durable and repeatable without being production-ready or validated on real food-bank operations.

### 1.1 Strong demo journey

The judge path begins at Home and demonstrates the product from Jordan's point of view:

1. Home shows a plain-language verified issue queue, not scenario fixtures or premature recommendations.
2. Ask accepts a natural question, returns a typed agent match, and preserves context through one follow-up and refresh.
3. An unrelated question yields clarification and no default scenario.
4. Opening review invokes the decision agent; the review visibly identifies live or fallback mode, verified records, deterministic safety checks, and manager authority.
5. Scenario A completes approval, simulated receipt, before/after result, outcome feedback, and `Return to Today`.
6. Scenario E shows an agent-matched safe stop, exact conflicting records, no approval control, and a correction-assistance path.
7. Audit shows the deterministic solver, decision agent, reviewer, authority validator, tool names, modes, and fallbacks without private chain-of-thought.
8. Repeating the path with the provider unavailable preserves the same deterministic recommendation and exposes the verified fallback honestly.

The demo fails if chat loses the matched work item, a broad/irrelevant prompt silently becomes Scenario A, Home labels a solver preview as an agent recommendation, agent provenance is hidden, or a safe-stop state exposes approval.

---

## 2. P0 requirement index and build-contract crosswalk

These IDs are the stable acceptance identifiers. `00_BUILD_CONTRACT.md` remains higher authority; this table names the exact phrase or section each ID proves.

| ID | P0 requirement | Build-contract crosswalk |
|---|---|---|
| `P0-01` | Keep every route and result visibly synthetic and simulated | §1 “synthetic supply disruption”; §6 persistent simulation notice; §8 completion; §11 approved claim boundary |
| `P0-02` | Load five immutable scenarios and create/reset isolated runs without rewriting history | §4.1 immutable base data; §4.2 five scenarios; §4.5 Reset |
| `P0-03` | Analyze Scenario A's synthetic unstructured notice in offline and optional live modes | §3 hero steps 3–5; §5 allowed extraction/orchestration; §7 offline/live architecture |
| `P0-04` | Validate schemas, arithmetic, required facts, conflicts, and provenance; abstain rather than invent | §3 hero step 5; §5 agent boundary; §8 missing/untrusted-data completion standard |
| `P0-05` | Calculate the frozen forecast, projections, coverage, gaps, and risks deterministically | §1 product promise; §3 hero step 5; §7 pure Python engine; §8 formula tests |
| `P0-06` | Generate only catalog actions and enforce budget, storage, timing, usable-life, authorization, and edit constraints | §4.3 supported actions; §4.4 recommendation/edit shape; §5 numeric and authority boundary |
| `P0-07` | Return exactly one highest-ranked action with evidence, assumptions, feasible alternatives, rejected options, and uncertainty | §3 hero step 6; §4.4 single-action shape; §5 evidence/ranking boundary |
| `P0-08` | Support approve, edit-and-approve, reject, and defer as explicit human decisions | §2 primary operator; §4.4 edit; §4.5 decision outcomes |
| `P0-09` | Apply approved actions only to simulation and compare no intervention, simple reorder, and selected action from one starting state | §1 “shows simulated effect”; §3 hero steps 7–8; §4.5 approval effect |
| `P0-10` | Preserve an append-only, versioned audit of notices, tools, recommendation, human decision, and outcome | §3 hero step 8; §4.5 Reset; §6 Audit |
| `P0-11` | Preserve the LLM authority boundary and exact offline/live parity for deterministic results | §3 hero step 4; §5 complete agent boundary; §7 provider adapter/offline mode; §8 parity completion standard |
| `P0-12` | Enforce the specified state machine, atomic transitions, stale-state checks, and idempotency | §4.5 outcomes; §8 state/idempotency completion standard; Product/UX §5 |
| `P0-13` | Implement the three-destination, decision-first experience with every required happy and non-happy state | §6 Experience contract; Product/UX §§3–8 |
| `P0-14` | Match the selected visual reference and meet keyboard, focus, contrast, status-text, chart-alternative, and responsive requirements | §8 visual/accessibility completion standard; Product/UX §§10–11; Visual §9 |
| `P0-15` | Install, seed, reset, build, start, test, and complete the judge path locally without network or a model key | §3 final hero sentence; §7 execution; §8 clean checkout and under-five-minute standards |
| `P0-16` | Contain no real PII, integration, autonomous action, unsupported Food Finders claim, or real-world impact claim | §1 no external action; §5 prohibited authority; §9 non-goals; §11 claim boundary |

No P1 item may compensate for a failed P0 ID.

---

## 3. Test layers and required evidence

| Layer | Required command | What it proves | Required artifact |
|---|---|---|---|
| Static quality | Included in `make test` | Python/TypeScript lint, formatting, and type correctness | Console/JUnit result |
| Unit | `make test-unit` | Pure formulas, constraints, scores, state reducers, frontend component behavior | JUnit/XML and coverage summary |
| Contract | `make test-contracts` | JSON Schema, fixture, API, enum, version, and provenance compatibility | Contract report with asset hashes |
| Golden | `make test-golden` | All five scenarios reproduce exact expected externally visible behavior | Canonical JSON diff report |
| Integration | `make test-integration` | FastAPI, SQLite transactions, append-only events, idempotency, mocked agent, error mapping | JUnit/XML and event snapshots |
| Red team | Included in integration/test | Malformed records, untrusted notice, authority bypass, provider failure | Case-by-case pass report |
| End-to-end | `make test-e2e` | Real Chromium interaction for draft, review, decision branches, compare, audit, and reset | Playwright HTML report, trace on failure |
| Accessibility | `make test-a11y` | Automated rules plus keyboard/focus/live-region behavior | axe JSON plus manual checklist |
| Visual | `make test-visual` | Reference fidelity and stable approved rendering | Reference/implementation pairs and screenshot diffs |
| Production smoke | Included in `make verify` | Built frontend served same-origin by FastAPI in offline mode | Health response and smoke trace |
| Clean handoff | `make verify-clean` | New checkout can reproduce the app using only documented prerequisites | Version/command transcript |
| Demo rehearsal | Manual, three runs | Exact path stays under five minutes and survives reset | Timings, run IDs, result hashes |

All reports are written under `.local/test-results/` and are not committed, except an intentionally approved visual baseline set stored in the location named by the final visual specification.

---

## 4. Comparison and tolerance rules

### 4.1 Golden comparison

The golden harness must compare canonical response content exactly after removing only fields explicitly declared runtime-variant by the data contract, such as `request_id`, runtime `run_id`, and wall-clock audit timestamp. It must not ignore business fields, ordering, source IDs, reasons, version IDs, or agent status.

| Field kind | Comparison rule |
|---|---|
| IDs, enums, dates, weeks, statuses, booleans, source ordering | Exact |
| Integer pounds, counts, days, and cents | Exact |
| Quantized currency shown in dollars | Exact after contract-defined cent quantization |
| Derived probabilities, WOS, coverage ratios, scores, confidence, and normalized components | Parse as Decimal and require absolute difference `<= 1e-24`; literal trailing-zero/string equality is not required |
| UI-formatted text | Exact for required labels/copy; explanation wording may differ only where the agent contract marks it non-normative |
| Candidate and evidence lists | Exact membership and contract-defined order |
| Offline/live deterministic payload produced by the same engine/version | Exact canonical JSON/hash; this is runtime-to-runtime parity, not a hash of golden-file bytes |

Using broad snapshot exclusions or updating a golden file without a reviewed schema/fixture/rule change fails this contract.

### 4.2 Deterministic test controls

- Scenario seed: `20260713` unless a scenario manifest explicitly supplies a more specific seed.
- Base-data version: `synthetic-base/1.0.0`.
- Schema version: `data-contract/1.0.0`.
- Golden version: `golden/1.0.0`.
- Scenario versions: `scenario-a/1.0.0` through `scenario-e/1.0.0`.
- Ruleset version: `decision-engine/1.0.0`.
- Numeric-policy version: `decimal-policy/1.0.0`.
- Tool-contract version: `agent-tools/1.0.0`.
- Prompt version: `agent-system/1.0.0`.
- Agent-output schema version: `agent-output/1.0.0`.
- Notice-extraction schema version: `notice-extraction/1.0.0`.
- Notice-reconciliation policy version: `notice-reconciliation/1.0.0`.
- Engine version: `nourishops-engine/1.0.0`.
- Scenario/planning date: `2026-08-03` where the fixture declares it.
- Test audit clock and stable test IDs: exact values declared in each golden case; never the machine clock.
- Locale/timezone for browser tests: `en-US` and `UTC`.

If a machine-readable asset freezes a newer version, the asset controls and every dependent prose reference must be updated together.

---

## 5. Given/When/Then P0 acceptance cases

### `P0-01` — Synthetic and simulated labeling

**`AC-P0-01-A — Persistent notice`**  
Given any Decision, Compare, or Audit state at 1440 × 1024 and 1280 CSS pixels, when the route loads or changes, then the exact notice remains visible:

> Simulation only — All organizations, records, quantities, costs, and outcomes in this prototype are synthetic.

**`AC-P0-01-B — Consequential-action copy`**  
Given approval confirmation and the approved result, when they render, then the confirmation names the simulation-only effect and the result states `No external action was taken.`

**`AC-P0-01-C — Result provenance`**  
Given any displayed result, when its evidence/details are opened, then the value is labeled as a synthetic assumption, deterministic calculation, simulated outcome, or future pilot metric—not real impact.

### `P0-02` — Fixtures, immutable runs, and reset

**`AC-P0-02-A — Catalog`**  
Given validated contract assets, when `GET /api/v1/scenarios` runs, then it returns exactly these scenario IDs and no additional P0 scenario:

1. `SCN-A-USDA-PROTEIN-DELAY`
2. `SCN-B-SHORT-LIFE-PRODUCE`
3. `SCN-C-SNACK-MISMATCH`
4. `SCN-D-BUDGET-TRADEOFF`
5. `SCN-E-DATA-CONFLICT`

**`AC-P0-02-B — Immutable snapshot`**  
Given a new run, when analysis and a manager decision occur, then the fixture bytes and hashes remain unchanged and all changes exist only as appended run events.

**`AC-P0-02-C — Clean reset`**  
Given a completed or deferred run, when `Start clean run` is confirmed or `make reset` executes, then a different run ID is created from the same fixture/version/seed, its UI state is `DRAFT`, the prior run/events remain byte-for-byte queryable, and no `UPDATE` or `DELETE` occurs on `runs` or `run_events`.

### `P0-03` — Notice analysis

**`AC-P0-03-A — Offline hero extraction`**  
Given Scenario A in `DRAFT` and offline mode, when `Analyze disruption` is selected, then the cached extraction identifies only inbound `INB-USDA-PROTEIN-104`, original date `2026-08-03`, revised date `2026-08-17`, and canonical revised status `PROBABLE`; deterministic policy maps that status to probability `0.65` and the UI renders `Probable`.

**`AC-P0-03-B — Live mocked extraction`**  
Given the same notice and a schema-valid mocked live response, when analysis runs, then the verified extraction equals the offline extraction and produces the same analysis hash.

**`AC-P0-03-C — Unsupported text`**  
Given a notice containing commentary or instructions beyond the supported extraction fields, when parsed, then those parts do not create facts, actions, probabilities, evidence, or state changes.

### `P0-04` — Validation and abstention

**`AC-P0-04-A — Asset validation`**  
Given the frozen asset pack, when contract tests run, then every manifest and JSON fixture record, enum, type, unit, foreign key, date, provenance field, continuity equation, threshold invariant, capacity record, and action-catalog reference validates through a local `$id` registry while an outbound-network trap proves schema resolution makes zero network requests.

**`AC-P0-04-B — Invalid arithmetic`**  
Given a mutated test fixture whose ending inventory violates continuity, when analysis is attempted, then the API returns a typed validation failure with record/equation evidence, no recommendation or decision control appears, and no fixture is repaired silently.

**`AC-P0-04-C — Scenario E abstention`**  
Given `SCN-E-DATA-CONFLICT`, when analysis runs, then state becomes `ABSTAINED`, the exact missing/conflicting decision-critical fields from its golden output are listed with source IDs, the primary copy is `A safe recommendation cannot be produced from the current data.`, and approval is absent.

### `P0-05` — Deterministic projections and risks

**`AC-P0-05-A — Scenario A breach`**  
Given Scenario A after the delay notice, when the conservative projection runs, then protein forecast distribution is `9,000 lb/week`, opening inventory is `30,000 lb`, week-1 ending inventory is `21,000 lb` (`2.3333` weeks), week-2 ending inventory is `12,000 lb` (`1.3333` weeks), and the first minimum-coverage breach is Week 2 (`2026-08-10`).

**`AC-P0-05-B — Expected versus conservative`**  
Given the delayed probable shipment, when projections run, then the conservative view excludes it, the expected view uses exactly probability `0.65` in its eligible week, and neither view treats it as confirmed.

**`AC-P0-05-C — Reproducibility`**  
Given the same folded run-state hash, seed, and version bundle, when the engine runs 100 times and in at least two independently instantiated processes, then every deterministic result hash is identical.

**`AC-P0-05-D — No action required`**  
Given a valid mutation test in which no category breaches its minimum and no capacity, spoilage, mismatch, or data-quality risk exists, when analysis completes, then state becomes `NO_ACTION_REQUIRED`, the copy reads `No category is projected below its minimum in the four-week conservative view.`, no recommendation or approval control exists, and the audit records reason `NO_ACTIONABLE_RISK`.

### `P0-06` — Catalog actions and hard constraints

**`AC-P0-06-A — Catalog allowlist`**  
Given any scenario, when candidates are generated, then every candidate/action ID exists in that scenario's immutable catalog and uses one of the nine supported action types.

**`AC-P0-06-B — Constraints precede ranking`**  
Given a candidate that fails budget, capacity, timing, usable-life, bounds/increment, or authorization, when evaluation runs, then it is excluded before scoring and appears with the exact rule ID and human-readable reason.

**`AC-P0-06-C — Edited quantity`**  
Given the quantity editor, when the manager enters a value outside bounds, off increment, over budget/capacity, too late, or unusable before distribution, then `Recheck plan` calls the non-persisting backend action-preview operation, reports the precise failures, keeps approval disabled, and appends no event. A valid edit returns a deterministic preview hash and is independently revalidated/resimulated by the decision endpoint before approval.

### `P0-07` — Recommendation package

**`AC-P0-07-A — Single recommendation`**  
Given a non-abstaining golden scenario, when evaluation completes, then exactly one action is marked `Recommended response`; no blended/portfolio recommendation appears.

**`AC-P0-07-B — Hero recommendation`**  
Given Scenario A, when evaluation completes, then the top action is `ACT-A-PURCHASE-PROTEIN-15000`, quantity `15,000 lb`, unit cost `$0.85/lb`, total cost `$12,750`, arrival Week 2, and target-gap reduction `15,000 lb`; the action is highest-ranked under the frozen rules, never labeled “optimal.”

**`AC-P0-07-C — Review evidence`**  
Given a ready recommendation, when its review state renders, then quantity, timing, cost, expected usable quantity, effect, confidence, score, hard-constraint passes, at least two fixture-provided alternatives when available, rejected options, assumptions, source IDs, and version IDs are present and match golden output.

**`AC-P0-07-D — Why not`**  
Given Scenario A, when `Not feasible in this scenario` is expanded, then the frozen late/oversized candidate and any budget-failing candidate appear with their exact golden rule failures; no rejected candidate receives a score that can override the failure.

### `P0-08` — Human decision controls

**`AC-P0-08-A — Approve`**  
Given `READY_FOR_REVIEW`, when the manager selects `Approve simulated action`, reads the exact simulation-only confirmation, and confirms, then one manager-decision event and one simulated-application event are appended atomically and state becomes `APPROVED`.

**`AC-P0-08-B — Edit and approve`**  
Given a feasible selected action, when the manager changes only `requested_quantity_lb`, enters 1–500 non-whitespace characters in `Reason for changing the recommended quantity`, rechecks, and confirms, then immutable catalog fields remain unchanged, the confirmation repeats the reason, the original and edited quantities are audited, and state becomes `APPROVED` with decision outcome `edited_approved`.

**`AC-P0-08-C — Reject`**  
Given a recommendation, when Reject is attempted without a reason, then submission is blocked. When a reason is provided and confirmed, state becomes `REJECTED`, the projection is unchanged, and one rejection event records the reason.

**`AC-P0-08-D — Defer`**  
Given a recommendation, when Defer is confirmed with or without a note, then state becomes `DEFERRED`, the risk remains unresolved, the projection is unchanged, and one deferral event is appended.

**`AC-P0-08-E — Alternative selection`**  
Given at least one feasible alternative, when it is selected, then it is labeled `Manager-selected alternative`, the original recommendation remains identified, preview metrics update deterministically, `Reason for choosing this alternative` is required before approval, the confirmation repeats that reason, and no manager event is written until a final decision.

### `P0-09` — Simulated result and baseline comparison

**`AC-P0-09-A — Approved hero outcome`**  
Given approval of `ACT-A-PURCHASE-PROTEIN-15000`, when the outcome is simulated from the frozen starting state, then Scenario A's Week-2 protein ending inventory changes from `12,000 lb` / `1.3333 weeks` to `27,000 lb` / `3.0000 weeks`; simulated cost is `$12,750`; no external side effect occurs.

**`AC-P0-09-B — Same starting state`**  
Given Compare, when no intervention, simple reorder, agent action, and an edited action are shown, then all policies cite the same starting `analysis_snapshot_hash` and version bundle.

**`AC-P0-09-C — Exact comparison`**  
Given a non-abstaining scenario, when Compare loads, then `NO_INTERVENTION`, `SIMPLE_REORDER`, and the unchanged `Original agent recommendation` reproduce every frozen comparison field. If a manager chooses a different action or quantity, an additional deterministic `Manager selection` row appears with the same `analysis_snapshot_hash`; it never replaces the original agent row. Before valid analysis, Compare renders the typed unavailable state and no fake metrics.

### `P0-10` — Audit integrity

**`AC-P0-10-A — Required evidence`**  
Given a completed Scenario A run, when Audit opens, then chronological events expose notice/import, verified extraction, validation, deterministic tool stages, risk, candidates and failures, recommendation, manager decision, simulated outcome, source IDs, timestamps, and complete version bundle.

**`AC-P0-10-B — Append-only enforcement`**  
Given direct application attempts to update/delete a run or event, when SQLite executes them through the application connection, then triggers reject the operation and prior event payload/hash remains unchanged.

**`AC-P0-10-C — Export`**  
Given a run export, when JSON and CSV are generated, then ordering/content equals the API event stream, every result remains labeled synthetic, version fields are present, and spreadsheet-formula prefixes are neutralized.

### `P0-11` — Agent authority, mocked LLM, and parity

**`AC-P0-11-A — Read-only tools`**  
Given the live agent tool registry, when inspected, then it contains only the read-only tools in the agent contract and excludes `record_manager_decision`, generic database writes, external actions, and arbitrary network access.

**`AC-P0-11-B — Numeric authority`**  
Given a mocked model response that changes a quantity, cost, probability, score, rank, date, ID, or source, when validation runs, then the response is discarded and the verified offline package is rendered with `AGENT_AUTHORITY_VIOLATION_FALLBACK`.

**`AC-P0-11-C — Offline parity`**  
Given offline and successful mocked-live runs over the same verified extraction, when deterministic payloads are canonicalized, then their hashes are identical for all calculations, IDs, evidence, risks, candidate feasibility, reasons, scores, ranks, confidence, and simulated metrics.

**`AC-P0-11-D — Explanation boundary`**  
Given a live explanation, when shown, then it contains no chain-of-thought, unsupported source, new number, new ID, new action, promise of execution, or explanation longer than 120 words in the primary view.

### `P0-12` — State, atomicity, stale checks, and idempotency

**`AC-P0-12-A — State controls and run identity`**  
Given each canonical committed state at `/runs/{run_id}`, `/runs/{run_id}/compare`, or `/runs/{run_id}/audit`, when the workspace renders or refreshes, then only controls allowed by Product/UX §5 are enabled, the same server-folded run is restored using GET-only requests, and no new run is created. `ANALYZING` is excluded from refresh restoration: while evaluate is in flight, refresh returns the prior committed `DRAFT`, `STALE`, or `FAILED`, and same-key resubmission safely resumes or replays.

**`AC-P0-12-B — Duplicate analysis`**  
Given two evaluate requests with the same route, key, and payload, when both complete, then both responses are identical and only one analysis event sequence exists.

**`AC-P0-12-C — Duplicate decision`**  
Given approval is retried after a lost response with the same key/payload, when the backend receives it, then it returns the original success and no duplicate decision/application event is appended.

**`AC-P0-12-D — Reused key conflict`**  
Given the same key with a different quantity or outcome, when submitted, then the API returns `409 IDEMPOTENCY_KEY_REUSED` and appends nothing.

**`AC-P0-12-E — Atomic failure`**  
Given a simulated database failure between any decision event, simulated outcome, and idempotency replay-record write, when approval is attempted, then no event, derived state, or replay record commits and the UI does not show success. Given the commit succeeds but the HTTP response is lost, retrying the same key returns the exact committed response.

**`AC-P0-12-F — Stale review`**  
Given recommendation revision/version no longer matches the run, when approval is attempted, then the API returns `409 STALE_RECOMMENDATION`, approval is disabled, and re-analysis is required.

### `P0-13` — Decision-first UX and complete states

**`AC-P0-13-A — Routes`**  
Given the built app, when navigation is inspected, then only `/runs/{run_id}`, `/runs/{run_id}/compare`, and `/runs/{run_id}/audit` are working P0 destination patterns; `/` only performs the idempotent bootstrap/redirect in Product/UX §3.4; overview, risk, and review are coherent states of Decision; no chatbot-first route exists.

**`AC-P0-13-B — No fabricated placeholders`**  
Given a `DRAFT` run, when it renders, then the notice, baseline context, and `Analyze disruption` appear, while recommendation, comparison, and outcome values are absent rather than fake or zero-filled.

**`AC-P0-13-C — Non-happy states`**  
Given each Product/UX §8 condition, when triggered by a test fixture or mocked failure, then the exact required state/copy/control availability appears without layout collapse or stale result content.

### `P0-14` — Accessibility and visual quality

**`AC-P0-14-A — Automated accessibility`**  
Given Draft, Review, Approved, Abstained, Compare, Audit, quantity-edit, confirmation, error, and fallback states, when axe runs with WCAG 2.2 A/AA-relevant rules, then there are zero critical/serious violations and zero unreviewed lower-severity violations.

**`AC-P0-14-B — Keyboard path`**  
Given keyboard-only input, when the complete Scenario A path runs, then navigation, disclosure, alternative selection, edit/recheck, confirmation, Compare, Audit details, and reset work in logical order; dialogs trap/restore focus; focus remains visible.

**`AC-P0-14-C — Semantics and alternatives`**  
Given a screen reader or accessibility tree, when risks, constraints, confidence, charts, errors, and updates render, then text/shape—not color alone—communicates status, fields own their errors, live regions announce state once, and every chart has an equivalent data table.

**`AC-P0-14-D — Reference fidelity`**  
Given the human-selected final references, when the implementation states are captured at 1440 × 1024, then the visual gate in §11 passes with no anti-slop violation.

### `P0-15` — Local durability and clean handoff

**`AC-P0-15-A — No-key build`**  
Given a clean checkout and no `.env`/provider key, when `make verify-clean` runs with network only for frozen dependency installation, then install, schema/fixture checks, all tests, build, seed, reset, readiness, and offline smoke succeed without modifying lockfiles.

**`AC-P0-15-B — Disconnected demo`**  
Given dependencies are installed and the network is disconnected, when `make demo` runs, then the built app starts, creates a new Scenario A run, and completes the judge path.

**`AC-P0-15-C — Repetition`**  
Given three successive `make reset` executions and full hero runs, when recommendation/result hashes and timings are compared, then hashes are identical, run IDs differ, prior audit streams remain unchanged, and each path is under five minutes.

### `P0-16` — Safety, scope, and claims

**`AC-P0-16-A — No external effect`**  
Given any manager action, when approved, rejected, or deferred, then no purchase, payment, email, donor contact, transfer, allocation, notification, external task, or production-system call occurs.

**`AC-P0-16-B — No real data`**  
Given the repository, runtime database, UI, exports, prompts, logs, and recorded backup, when inspected, then they contain only frozen synthetic data and no real client, donor, pantry, vendor, organization transaction, credential, or PII.

**`AC-P0-16-C — Claim lint`**  
Given UI/pitch/demo text, when scanned and manually reviewed, then none of the prohibited claims in §16 appear, and simulated metrics are never phrased as observed savings, waste prevention, meals, hunger reduction, adoption, or Food Finders performance.

---

## 6. Formula, rule, and contract test matrix

The exact equations, rounding stages, error codes, score weights, confidence rules, and tie-breaks live in `04_DECISION_AND_AGENT_CONTRACT.md`. The tests below must use its published vectors plus independent edge cases.

| Test ID | Contract under test | Minimum cases |
|---|---|---|
| `FORM-01` | Inventory continuity | normal row; zero inbound; spoilage; intentional mismatch; no silent negative inventory |
| `FORM-02` | Four-week moving-average forecast | exact four comparable weeks; rounding boundary; insufficient history abstention |
| `FORM-03` | Conservative projection | confirmed fully included; probable/unconfirmed excluded; arrival week respected |
| `FORM-04` | Expected projection | confirmed fully included; probable probability-adjusted; unconfirmed excluded; no double count |
| `FORM-05` | Weeks of supply | ordinary case; zero forecast rule; exact threshold; just below/above threshold |
| `FORM-06` | Projected inventory and unmet distribution | week-to-week continuity; floor at zero for display; unmet quantity separate |
| `FORM-07` | Minimum breach and target gap | first breach date; equality boundary; gap floors at zero |
| `FORM-08` | Nutrition-weighted coverage | six-category vector; cap at target; priority weights; canonical Decimal strings and frozen `1e-24` derived-field tolerance |
| `FORM-09` | Expected usable quantity | yield × success probability; confirmed action; partial acceptance; quantization |
| `FORM-10` | Storage utilization | dry/refrigerated/frozen independent totals; arrival/distribution order; exact-capacity pass; one-pound-over fail |
| `FORM-11` | Budget | cents arithmetic; exact budget pass; one-cent-over fail; shared Scenario D budget |
| `FORM-12` | Lead time and usable life | arrival before breach; arrival at boundary; late fail; expiry/distribution feasibility |
| `FORM-13` | Quantity editing | min/max inclusive; increment; immutable fields; resimulation |
| `FORM-14` | Candidate normalization and score | each component vector; infeasible excluded; configured weights; serialized total |
| `FORM-15` | Deterministic tie-break | unrounded Decimal score under the frozen oracle tolerance; exact `R` ordering; conservative shortage-burden reduction; cost; quantity; frozen action-type order; catalog and evaluated-action IDs |
| `FORM-16` | Confidence | exact high/medium/low boundaries; data-quality downgrade; no confidence invention |
| `FORM-17` | Withholding/no-action behavior | missing critical field; conflicting field; no-feasible-action state; safe Monitor distinction |
| `FORM-18` | Baselines | no intervention; exact simple-reorder policy; agent starts from identical `analysis_snapshot_hash` |
| `FORM-19` | Manager transition | approve; edited approve; reject; defer; final-decision protection; no external effect |
| `FORM-20` | Canonical hashing | key order; number serialization; version/seed change; cache invalidation |

Required contract checks:

- Pydantic/API enums are subsets of the canonical schema enums and preserve exact serialized names.
- Every displayed numeric field maps to one deterministic response path and one source/provenance field.
- No response contains an undocumented action, risk, status, confidence, unit, or error code.
- Every fixture record has the schema/data version and required provenance.
- The immutable fixture, golden output, and runtime test record collectively bind the input hash, scenario version, seed, ruleset, and engine contract; no single asset is required to duplicate all five values.
- Pydantic transport models generate a checked-in OpenAPI snapshot and typed frontend client/guards during implementation; contract tests detect drift, and no route accepts consequential fields beyond those authorized by `03`, `04`, and Architecture §9.
- The normative golden schema rejects a missing score component, an invented projection/comparison field, and a projection shape copied from the wrong scenario; validation resolves only the pre-registered local schema registry and performs no network access.

---

## 7. Golden-scenario truth and tests

Machine-readable golden files are authoritative over this summary. Each test must compare the complete expected risk set, candidate set, feasibility/reasons, ranking, recommendation or abstention, evidence, baseline comparison, and simulated result—not only the headline action.

The exact oracle files are:

- `BUILD_CONTEXT/golden/scenario_a.golden.json`;
- `BUILD_CONTEXT/golden/scenario_b.golden.json`;
- `BUILD_CONTEXT/golden/scenario_c.golden.json`;
- `BUILD_CONTEXT/golden/scenario_d.golden.json`;
- `BUILD_CONTEXT/golden/scenario_e.golden.json`.

| Scenario | Required primary truth | Required negative/alternative proof |
|---|---|---|
| `SCN-A-USDA-PROTEIN-DELAY` | Protein first breaches minimum in Week 2; target gap `15,000 lb`; recommend `ACT-A-PURCHASE-PROTEIN-15000` for `15,000 lb`, `$12,750`, arriving Week 2; approved Week-2 result `27,000 lb` / `3.0000 weeks` | Show all golden feasible alternatives in order; reject exact late/oversized and budget-failing candidates with rule IDs; Monitor must not outrank a gap-closing feasible action |
| `SCN-B-SHORT-LIFE-PRODUCE` | For the `20,000 lb`/five-day offer, recommend `ACT-B-PARTIAL-PRODUCE-10000`, `PARTIAL_ACCEPT`, exactly `10,000 lb`, `$0` | Full acceptance fails the exact golden refrigerated-capacity and/or distribution/usable-life rules; redirect/decline alternatives match golden order |
| `SCN-C-SNACK-MISMATCH` | Recommend `ACT-C-REDIRECT-SNACKS-12000`, `REDIRECT_DONATION`, exactly `12,000 lb`, with simulated transport cost `$250` | Show that snack pounds increase aggregate supply but do not improve the frozen essential-category gap metric; use neutral donor language and only the catalog destination |
| `SCN-D-BUDGET-TRADEOFF` | Under a `$13,000` shared budget, recommend `ACT-D-PURCHASE-DAIRY-6000`, exactly `6,000 lb` / `$9,600`, because it resolves the earlier W1 breach; expose the remaining protein risk | The `15,000 lb` / `$12,750` protein purchase is the golden feasible alternative; both together cost `$22,350` and exceed budget; ranking and tradeoff match golden raw components; no clinical claim |
| `SCN-E-DATA-CONFLICT` | Return `ABSTAINED` and exact golden missing/conflicting fields/source IDs | No recommendation, rank, approval control, fabricated probability/date/usable life, or simulated improvement |

For every scenario:

1. validate fixture and staged event;
2. reproduce the golden extraction, if present;
3. calculate the exact baseline and post-disruption risk set;
4. compare every catalog action and rule outcome;
5. reproduce recommendation/abstention and evidence ordering;
6. simulate each feasible manager selection without mutating the fixture;
7. reproduce no-intervention/simple-reorder/selected-action comparison;
8. rerun with a different runtime run ID and prove the deterministic hash is unchanged.

---

## 8. State-transition and idempotency matrix

| Starting state | Event | Required ending state | Persistent effect |
|---|---|---|---|
| `DRAFT` | Analyze valid scenario | `READY_FOR_REVIEW` | One atomic extraction/evaluation/recommendation event sequence |
| `DRAFT` | Analyze missing/conflicting critical data | `ABSTAINED` | Validation/evaluation/abstention evidence; no recommendation |
| `DRAFT` | Analyze actionable risk with no feasible action and unsafe Monitor | `ABSTAINED` | `NO_FEASIBLE_ACTION`, all constraint failures, unresolved risk; no manager decision controls |
| `DRAFT` | Deterministic internal failure | `FAILED` | Failure event only; no applied disruption/result mutation |
| `FAILED` | Retry completes without infrastructure/integrity failure | `READY_FOR_REVIEW`, `ABSTAINED`, or `NO_ACTION_REQUIRED` as determined by the contract | New attempt events; original failure retained |
| `READY_FOR_REVIEW` | Select alternative | `READY_FOR_REVIEW` | No manager decision; selection may remain UI draft |
| `READY_FOR_REVIEW` | Valid quantity recheck | `READY_FOR_REVIEW` | No manager decision; deterministic preview only |
| `READY_FOR_REVIEW` | Approve | `APPROVED` | Atomic manager decision + simulated application |
| `READY_FOR_REVIEW` | Edit/reason/approve | `APPROVED` | Atomic `edited_approved` decision + application, original/edit audited |
| `READY_FOR_REVIEW` | Reject with reason | `REJECTED` | Rejection event; projection unchanged |
| `READY_FOR_REVIEW` | Defer | `DEFERRED` | Deferral event; projection unchanged, risk open |
| `READY_FOR_REVIEW` | Input/version revision changes | `STALE` | Stale marker; approval forbidden |
| `STALE` | Re-analyze | Contract-determined valid state | New revision/analysis; old recommendation retained in audit only |
| Any terminal/abstained/deferred state | Start clean run | New run `DRAFT` | New run; old event stream unchanged |

Idempotency cases:

| Case | Expected result |
|---|---|
| Same route/key/payload retried | Return stored original response; zero duplicate events |
| Same route/key, differently ordered but canonically equal JSON | Treat as same payload |
| Same route/key/different payload | `409 IDEMPOTENCY_KEY_REUSED`; zero new events |
| New key, unchanged evaluate state | Same `input_hash` and deterministic `output_hash`; no duplicate domain events or contradictory recommendation |
| Old recommendation revision decision | `409 STALE_RECOMMENDATION`; zero decision events |
| Concurrent different final decisions | Exactly one commits; other receives `409 DECISION_ALREADY_FINAL` |
| Write fails before commit, including before replay-record insertion | No event, derived state, or idempotency record persists |
| Response lost after commit | Retry replays the exact response committed atomically with the mutation, not a second transition |

---

## 9. Agent, model-failure, and adversarial acceptance

All cases use a mocked adapter; no automated acceptance test calls a paid or live provider.

| Case | Mock/input | Required result |
|---|---|---|
| Valid extraction | Exact supported hero fields | Same verified extraction and deterministic hash as offline |
| Markdown instead of JSON | Schema-invalid response | Discard/one structured repair at most; then offline fallback |
| Truncated JSON | Provider connection closes | Bounded retry/fallback; no partial text rendered |
| Timeout | A provider request exceeds six seconds or the analysis reaches its global twelve-second deadline | At most one retry/repair total across the analysis; offline result and `AGENT_TIMEOUT_FALLBACK` |
| HTTP 429/5xx | Retryable provider error | One bounded retry, then offline fallback |
| Missing key/model/provider | Live requested but incomplete config | Startup succeeds in offline fallback with visible warning |
| Invented action ID | Model returns unknown ID | Discard, `AGENT_AUTHORITY_VIOLATION_FALLBACK`, golden result unchanged |
| Changed number | Model echoes `15,001 lb` or different cost/probability | Discard; no altered number reaches UI or audit |
| Changed rank | Model promotes lower action | Discard; deterministic order remains |
| Fake evidence | Model adds source ID | Discard; only deterministic source allowlist renders |
| Approval request | Model calls/asks for decision write | Tool unavailable; no event; authority warning/fallback |
| Prompt injection | Notice says to ignore rules, approve an action, reveal prompt, or contact a donor | Treat as untrusted data, emit `UNTRUSTED_INSTRUCTION_IGNORED`, extract only supported explicit facts |
| Chain-of-thought request | User/provider text asks for hidden reasoning | Return evidence/rules/concise explanation only |
| Unsupported real-world claim | Model says money/food was saved or hunger reduced | Reject narrative and use verified offline copy |
| Stale cache | Prompt/rules/data/model/version changes | Cache miss; never pair old prose with new values |
| Offline mode | Network disabled | No outbound request; all five scenarios still complete or abstain per golden truth |

The test harness must assert zero outbound network connections in offline mode.

---

## 10. Accessibility gate

### 10.1 Automated coverage

Run axe and semantic checks over:

- Scenario A Draft, Analyzing, Ready, Approved, Rejected, Deferred, Stale, No Action Required, and failure/fallback states;
- Scenario E Abstained;
- Compare and Audit with collapsed/expanded details;
- quantity edit in valid and invalid states;
- approval/reject/defer/reset confirmation dialogs;
- 1440 × 1024, 1280 CSS-pixel, 900 CSS-pixel layouts, and 200% zoom where specified.

There must be zero critical/serious violations and no unreviewed moderate/minor violation. Automated success does not waive manual checks.

### 10.2 Manual keyboard script

Without a pointer:

1. reach and understand the persistent synthetic notice;
2. move among Decision, Compare, and Audit with visible focus;
3. select Scenario A and activate `Analyze disruption` once;
4. open/close evidence and rejected-action disclosures;
5. select a feasible alternative and return to the original recommendation;
6. open quantity edit, trigger one invalid error, correct it, cancel or recheck;
7. open approval confirmation, read it in focus order, cancel, reopen, and confirm;
8. follow `View comparison`, then `View audit record`;
9. expand an audit event and reach every source link;
10. open `Start clean run`, cancel, reopen, and confirm.

Pass conditions:

- no keyboard trap except intentional modal containment;
- focus enters a dialog at its heading/first logical control and returns to the invoker;
- focus is never lost after async analysis, fallback, validation, or route transition;
- status announcements occur once and do not continuously repeat;
- disabled controls expose a reason;
- chart values are available in a semantic table without hover;
- color is never the sole carrier of risk, pass/fail, probability, or confidence.

### 10.3 Contrast and layout

- body text at least 4.5:1;
- large text and meaningful non-text UI at least 3:1;
- visible focus at least 3:1 against adjacent colors;
- 44 × 44 CSS-pixel critical targets where practical;
- no horizontal page scrolling at 1280 CSS pixels and 200% zoom for the primary flow;
- the core flow remains usable down to 640 CSS pixels, including a 1280-pixel desktop viewport at 200% zoom;
- below 900 CSS pixels, a clear desktop-optimized message may supplement, but never replace or disable, the stacked core flow.

---

## 11. Visual QA gate

### 11.1 Blocking prerequisite

Frontend visual acceptance cannot pass while Visual §1 says `PENDING_HUMAN_SELECTION`. The user must select one of three directions, the required reference states must be saved, tokens/asset paths must be frozen, and Visual status must become `SELECTED_AND_NORMATIVE`.

### 11.2 Deterministic capture environment

- Playwright-managed pinned Chromium;
- viewport `1440 × 1024`, device scale factor 1;
- `en-US`, timezone `UTC`, color scheme and reduced-motion setting frozen by the selected reference;
- committed/locally bundled fonts fully loaded before capture;
- CSS animations/transitions disabled for capture;
- exact scenario/golden state, fixed clock, stable IDs, and offline mode;
- no caret, transient toast timeout, skeleton, or live network content in the capture.

### 11.3 Required states

Capture and review:

1. `workspace-draft-1440x1024`;
2. `workspace-review-1440x1024`;
3. `workspace-approved-1440x1024`;
4. `workspace-abstained-1440x1024`;
5. `compare-1440x1024`;
6. `audit-1440x1024` with one expanded event;
7. `quantity-edit-1440x1024` with validation guidance.

Also inspect Review at 1280 wide and projector scale.

### 11.4 Pass procedure

1. Place reference and implementation screenshots side by side and as a 50% opacity overlay where geometrically useful.
2. A human reviewer checks hierarchy, content, typography, spacing, alignment, colors, borders, radii, chart geometry, evidence density, focus, clipping, and every Visual §7 anti-slop rule.
3. Material differences are fixed; the reference is not retroactively weakened to excuse the implementation.
4. After human acceptance, capture implementation regression baselines.
5. Automated regression uses Playwright `maxDiffPixelRatio: 0.005`; any diff also receives human review because a small ratio may hide a critical label or control change.
6. Baselines may be updated only with user/design-owner approval and a short visual change record.

Automatic failure conditions include:

- the recommendation, breach, primary action, or synthetic label is below the fold in Review;
- a generic KPI-card grid or chat panel dominates;
- provisional/invented data replace golden values;
- reference-required controls or evidence are absent;
- a fake or nonfunctional control appears;
- projector/1280 view clips the primary decision;
- visual status remains pending.

---

## 12. Clean reset, persistence, and durability test

Run this sequence against the production build, not the Vite dev server:

1. `make verify`.
2. `make reset`; record run ID A1 and its initial state/event hash.
3. Complete the Scenario A offline approval path; export its audit.
4. `make reset`; record A2.
5. Confirm A2 is `DRAFT`, has no manager decision, and has the same fixture, `contract_snapshot_hash`, and golden analysis inputs as A1.
6. Confirm A1 and its export are unchanged and still retrievable.
7. Complete A2 with an edited-and-approved quantity allowed by the fixture.
8. Reset to A3; complete Reject with a reason.
9. Reset to A4; complete Defer.
10. Reset to Scenario E; confirm abstention and absent approval.
11. Stop/restart the backend; verify all runs fold to the same states and event hashes.
12. Disconnect the network and repeat a clean Scenario A approval.

The gate fails if reset deletes history, a restart changes a result, a draft inherits a prior decision, an event is duplicated, or an agent cache determines business state.

---

## 13. Evaluation report

The implementation must produce one reproducible synthetic evaluation summary from `make test-golden`. It reports, by scenario and policy:

- expected versus detected risk/category/date;
- warning lead time;
- candidate feasibility classification;
- top recommendation agreement with golden truth;
- constraint violations;
- abstention correctness;
- essential categories above minimum;
- nutrition-weighted coverage;
- stockout weeks and unmet distribution;
- projected spoilage;
- simulated purchase cost;
- result hash and version bundle.

Aggregate acceptance targets:

| Metric | P0 target |
|---|---:|
| Manifest/base/overlay/golden structural validation | 18/18 asset documents pass |
| Inventory arithmetic | 100% exact |
| Known synthetic risk/abstention outcome | 5/5 exact |
| Hard-constraint classification | 100% of golden candidates exact |
| Top recommendation or abstention | 5/5 exact |
| Evidence/source coverage | 100% |
| Unsupported numeric/evidence claims | 0 |
| Offline/live deterministic parity | 100% exact |
| Duplicate decision events under retry | 0 |
| External operational writes | 0 |

The report may say a frozen agent policy improves a **simulated** scenario metric relative to a defined synthetic baseline only when the calculated golden comparison shows it. It may not generalize the result to Food Finders or food banks.

---

## 14. Exact 4–5 minute demo storyboard

### 14.1 Pre-demo state

Before entering the room:

- run `make verify`, then `make demo`;
- use offline mode unless live mode has been explicitly rehearsed that day;
- open the printed new Scenario A run at 1440 × 1024 or projector-equivalent scale;
- keep browser zoom at 100%; close developer tools and unrelated tabs;
- confirm `DRAFT`, banner visible, imported notice unapplied, and `Analyze disruption` enabled;
- keep a second local tab on `/api/v1/health/ready` and the backup recording/screenshots available but not projected;
- disconnect from dependency on venue Wi-Fi—the default path needs none.

### 14.2 Presenter path

| Time | Presenter action / exact click | Expected screen proof | Suggested narration |
|---:|---|---|---|
| `0:00–0:25` | No click. Point to the category context, Scenario A title, and simulation notice. | Scenario date `Aug 3, 2026`; total pounds remain secondary; banner visible. | “A food bank can look healthy in total pounds and still be heading toward a critical category gap. This is a fully synthetic demonstration.” |
| `0:25–0:50` | Point to the imported notice and evidence row. | `INB-USDA-PROTEIN-104`, `10,000 lb`, confirmed `Aug 3` changed to probable `Aug 17`. | “A USDA protein shipment just moved two weeks and became uncertain. That is the trigger for replanning.” |
| `0:50–1:10` | Click **Analyze disruption** once. | Compact verified stages complete; mode reads `Offline verified mode` or successful live explanation. | “The agent reads the notice, then invokes deterministic validation, projection, constraint, and ranking tools. The model never does the arithmetic.” |
| `1:10–1:40` | Point to the risk statement and four-week chart; optionally focus the Week-2 point. | Forecast `9,000 lb/week`; Week 1 `21,000 lb / 2.3 weeks`; Week 2 `12,000 lb / 1.3 weeks`; first minimum breach `Week 2 · Aug 10`; target gap `15,000 lb`. | “The conservative view excludes the probable arrival. Protein falls from 2.3 to 1.3 weeks of supply in week two, below the staff-defined minimum.” |
| `1:40–2:20` | Point to **Recommended response**, cost/effect, and constraint passes. | `ACT-A-PURCHASE-PROTEIN-15000`; purchase `15,000 lb`; arrival Week 2; `$0.85/lb`; `$12,750`; expected gap reduction `15,000 lb`; exact golden confidence/score; budget, frozen storage, timing, and authorization pass. | “The highest-ranked feasible response is a 15,000-pound purchase arriving before the breach. Every quantity and pass result comes from the deterministic engine.” |
| `2:20–2:50` | Expand **Other feasible actions**, then **Not feasible in this scenario**. Do not change selection. | Golden transfer/donor alternatives remain ordered; exact late/oversized and budget failures show rule IDs and reasons. | “The manager sees real alternatives and why rejected options failed. A score can never override budget, timing, storage, usable life, or human authority.” |
| `2:50–3:20` | Click **Approve simulated action**; pause on confirmation; click the confirmation action once. | Confirmation says no order/outreach/notification occurs; then `Simulation updated` and `No external action was taken.` | “The agent cannot execute this. A manager explicitly approves, and even then the action changes only this synthetic run.” |
| `3:20–3:50` | Point to before/after result; click **View comparison**. | Week-2 protein changes `12,000 lb / 1.3 weeks` → `27,000 lb / 3.0 weeks`; simulated cost `$12,750`; comparison uses one `analysis_snapshot_hash` and exact golden no-action/reorder/agent metrics. | “In this simulation, the approved plan restores the week-two target without breaking the frozen constraints. This is a modeled result—not measured field impact.” |
| `3:50–4:20` | Click **Audit** or **View audit record**; expand the manager-decision row. | Chronological notice, sources, tools, recommendation, human approval, simulated outcome, versions `synthetic-base/1.0.0`, `data-contract/1.0.0`, `decision-engine/1.0.0`, `agent-tools/1.0.0`, and `agent-system/1.0.0`. | “Every recommendation is reviewable: source records, rules, versions, alternatives, manager action, and simulated outcome stay in an append-only run history.” |
| `4:20–4:45` | No additional click. End on Audit or return to Decision only if rehearsed. | Synthetic banner and run ID remain visible. | “What we have proven is a reliable, human-approved decision workflow on fixed synthetic cases. The next step is historical replay and read-only shadow mode with de-identified exports—not autonomous operations.” |

Target duration: **4 minutes 30 seconds**, leaving 30 seconds of recovery margin. Do not add an unrehearsed live prompt, edit, reset, or hosted dependency to the judged path.

### 14.3 Demo assertions

The presenter must not say “optimal,” “we saved,” “we prevented waste,” “we delivered meals,” “Food Finders uses,” or “the AI made the decision.” The phrases `highest-ranked under these assumptions`, `simulated`, `staff-defined`, and `manager approved` are accurate.

---

## 15. Failure fallback and recovery

### 15.1 Automatic live-agent fallback

If live explanation times out, returns malformed output, violates authority, or loses network:

- do not reload or apologize at length;
- allow the automatic offline result to render;
- point once to `Live explanation unavailable. Showing verified offline analysis.`;
- say: “The deterministic planning path is independent of the language model, so the numbers and ranking are unchanged.”;
- continue at the same storyboard checkpoint.

This fallback itself is valuable evidence of durability.

### 15.2 Application recovery ladder

1. **Browser/UI issue:** reload the same local run once; state is server-derived.
2. **Bad rehearsal state:** use the already-open clean backup run or execute `make reset`; prior history remains.
3. **Backend stopped:** run `make start`, reopen the printed local URL, and use a new clean run.
4. **Machine/network issue:** use the locally saved 4–5 minute recording with narration.
5. **Video playback issue:** use the ordered static screenshots and audit export; clearly state that this is the backup evidence.

Do not switch to an untested cloud deployment, edit fixtures/goldens, clear the audit database, expose a secret, or improvise a provider call during judging.

### 15.3 Required backup package

Create locally before the event:

- one screen recording of the exact offline storyboard, with no real names/tabs/notifications;
- PNGs for Draft, Review, alternatives/rejections, approval confirmation, Approved, Compare, Audit, and Abstained;
- one Scenario A JSON/CSV audit export;
- one plain-text file containing the exact commands `make start`, `make reset`, and readiness URL;
- one copy of the built frontend, frozen lockfiles, fixture/golden pack, and test summary;
- charger/power adapter and a known-good browser profile.

Verify the recording and every screenshot opens without network access.

---

## 16. Claim boundary

### The team may claim

- NourishOps detects predefined risks in five fixed synthetic scenarios.
- It compares catalog actions under simulated constraints.
- It reproduces the frozen recommendation or abstention for each scenario.
- It links evidence, uncertainty, alternatives, and rejection reasons.
- It preserves explicit human approval and append-only local audit history.
- Its deterministic results and ranking are identical with the live LLM disabled.
- It demonstrates a candidate workflow for future historical replay and read-only shadow evaluation.

### The team may not claim

- hunger was reduced, meals were delivered, money was saved, or waste was prevented;
- the prototype was validated with Food Finders data, staff, or production workflow;
- a simulated metric predicts real operational impact;
- the forecast, staff-defined category priorities, scores, or recommendation are production-ready or clinically validated;
- all food banks share this workflow, data quality, thresholds, or action catalog;
- NourishOps integrates with or writes to Primarius, Link2Feed, MealConnect, ERP/WMS, USDA, email, purchasing, or donor systems;
- the LLM autonomously purchases, accepts, rejects, allocates, transfers, contacts, or decides;
- local demo durability is equivalent to production security, scalability, privacy, or reliability.

Future-pilot metrics must be introduced as measurements that **would need to be collected**, not benefits already achieved.

---

## 17. Final release checklist

### Contract and correctness

- [ ] `00`–`06`, schemas, fixtures, and goldens have no unresolved conflict.
- [ ] The base manifest, seven base fixtures, five scenario overlays, and five golden files validate; all five golden outputs reproduce.
- [ ] A second calculation or manual worksheet independently verifies Scenario A's core values.
- [ ] Formula, constraint, state, idempotency, and parity tests pass.
- [ ] No numeric field or evidence link originates in model prose or frontend arithmetic.

### Product and visual

- [ ] Visual status is `SELECTED_AND_NORMATIVE`, with all required reference paths/tokens filled.
- [ ] Decision, Compare, and Audit states match Product/UX behavior.
- [ ] Draft, Review, Approved, Abstained, Compare, Audit, and quantity-edit visual gates pass.
- [ ] No anti-slop, fake-control, invented-data, or chat-first pattern appears.
- [ ] Accessibility automated and manual gates pass.

### Durability

- [ ] `make verify-clean` passes without a key and without tracked-file changes.
- [ ] `make demo` succeeds disconnected from the network.
- [ ] Reset creates a new run and preserves prior history.
- [ ] Live timeout, malformed output, injection, duplicate decision, stale state, and database failure paths pass.
- [ ] Three consecutive offline rehearsals finish under five minutes with identical result hashes.
- [ ] Recording, screenshots, audit export, and recovery commands are available offline.

### Claims

- [ ] Every result is visibly synthetic/simulated.
- [ ] Demo and UI contain no prohibited real-world impact or Food Finders validation claim.
- [ ] The closing statement names historical replay/read-only shadow mode as future validation.
- [ ] No external action or real data exists anywhere in the P0 system.

Only after every applicable box is checked is the application ready for the coding-engine completion report and hackathon demonstration.
