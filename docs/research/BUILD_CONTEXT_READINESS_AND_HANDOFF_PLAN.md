# Build Context Readiness and Handoff Plan

**Project:** Nutrition-Aware Supply Resilience Agent  
**Purpose:** Define what must be decided and documented before an AI coding engine is asked to build the complete hackathon application.  
**Current conclusion:** The project is ready to be specified, but not yet ready for a one-pass durable build.

---

## 1. Direct answer

The current documents contain enough context to build a convincing prototype, but not enough to tell a coding engine “build this completely and durably” without it inventing important product and technical decisions.

The project is roughly **55–65% build-handoff ready**. This is not a measure of code completion; no implementation exists yet. It is a measure of how much consequential ambiguity has been removed from the instructions.

The strongest parts are:

- domain and food-bank grounding;
- problem selection and rationale;
- the bounded MVP concept;
- safety and human-approval principles;
- the primary scenario and pitch narrative;
- honest limits on what synthetic data can prove.

The weakest parts are:

- frozen scenario data and known-correct outputs;
- exact calculation, constraint, ranking, confidence, and abstention behavior;
- tool and LLM contracts;
- application state transitions;
- screen-level interaction and copy specifications;
- a selected visual target and design system;
- one fixed technical stack and repository architecture;
- executable tests, local-run instructions, reset behavior, and demo fallback.

Directional readiness by area:

| Area | Approximate readiness | What remains |
|---|---:|---|
| Domain grounding | 90% | Local workflow validation only |
| Product scope and claim boundary | 85% | Freeze the remaining P0 choices |
| Demo narrative | 85% | Add exact clicks and expected values |
| Data contract and scenario truth | 25% | Typed schemas, fixtures, and golden outputs |
| Decision engine | 50% | Exact semantics, normalization, edge cases, and action effects |
| Agent runtime | 35% | Tool contracts, prompt, authority, errors, and fallback |
| UX behavior | 30% | Flows, transitions, content, and all states |
| Selected visual direction | 5% | Human-chosen reference screens and design system |
| Architecture and runbook | 30% | One stack, repo contract, environment, and commands |
| Executable acceptance coverage | 40% | Tests and scenario oracles |

These numbers are a gap-finding aid, not measured project metrics.

These gaps can be closed mainly with the context already collected. Another broad food-bank research phase is not required for the synthetic proof-of-concept.

However, two different claims must remain separate:

| Readiness question | Current answer |
|---|---|
| Can we specify and build a strong, honest synthetic demo? | **Yes.** The existing context is sufficient after a specification-closure pass. |
| Can we prove that it solves Food Finders' real operational problem or produces real impact? | **No.** That requires staff validation and de-identified operational data or past decisions. |
| Can the demo be durable for repeated judging and development? | **Yes.** This requires fixed fixtures, automated tests, offline fallback, and a one-command run/reset path. |
| Can it be called production-ready? | **No.** Real integrations, security review, data validation, field evaluation, and operational ownership are outside the hackathon scope. |

The application should therefore be described as a **durable proof-of-concept**, not a durable production system.

---

## 2. What the current documents should be used for

The existing files are valuable, but they play different roles:

| Document | Correct role in the build |
|---|---|
| `FOODBANK_DOMAIN_GROUNDING.md` | Domain reference and evidence; not a feature backlog. |
| `FOODBANK_HACKATHON_CHEAT_SHEET.md` | Team briefing and pitch memory aid; not an implementation contract. |
| `HACKATHON_DECISION_MEMO.md` | Records why this concept was selected and what alternatives were considered. Alternative concepts are non-normative. |
| `NUTRITION_AWARE_SUPPLY_RESILIENCE_AGENT_PROJECT_PLAN.md` | Main raw product plan and source for the final specification. It is not yet precise enough to be the sole coding instruction. |
| `AISCO Hackathon Deck 2026.pdf` | Competition requirements and judging context. |

The research layer explains **why** the project exists. The new build-context layer must state **exactly what the application does**.

---

## 3. Why the current plan is not yet a safe one-shot handoff

An AI coding engine would currently have to make choices that materially affect the result.

### 3.1 Product and scope ambiguities

- The decision memo describes a broader portfolio agent and offer-extraction wedge, while the project plan describes a narrower category-planning agent.
- The primary recommendation is allowed to be “blended or single,” while the current schema supports one recommended action.
- Transfers appear as a core action even though the MVP models one warehouse and multi-location transfers also appear as stretch work.
- The plan sometimes describes the loop as “learning,” although the MVP only records manager feedback.
- It is not decided whether the main agent demonstration begins with structured scenario data or an unstructured disruption notice that the LLM must interpret.

### 3.2 Decision-engine ambiguities

- Four-week moving average versus exponentially weighted average is unresolved.
- Conservative versus expected projection is not assigned a precise role in alerting and ranking.
- Score components are named, but their normalization formulas are absent.
- The current shortage-oriented score does not yet explain how surplus, spoilage, donation-mismatch, and capacity risks are compared; this needs either risk-specific scoring or one exact common utility model.
- Tie-breaking, rounding, numeric tolerances, and boundary behavior are absent.
- Confidence labels are not formally defined.
- Spoilage, partial acceptance, accelerated distribution, donor-request success, and manager-edited actions do not yet have complete state-change rules.
- It is not explicit whether actions restore the minimum threshold, the target threshold, or an optimized quantity between them.
- Inventory stockout, unmet distribution, duplicate inbound, and storage allocation semantics are incomplete.

### 3.3 Data and evaluation ambiguities

- Table schemas exist, but there are no final machine-readable schemas with types, enums, nullability, units, and invariants.
- No frozen scenario fixture contains the exact values used in the demo.
- No golden output declares the expected risk, feasible actions, rejected actions, winning action, and before/after metrics.
- Without golden outputs, the builder can accidentally tune the data or scoring until the desired recommendation appears.
- Scenario reset, run isolation, audit persistence, and idempotency are unspecified.

### 3.4 Agent ambiguities

- Tool names exist, but exact input/output schemas and error responses do not.
- Tool write authority is not separated; manager-decision recording should be owned by the trusted application backend, not called autonomously by the LLM.
- The LLM provider, model boundary, system instructions, maximum tool loop, timeout, and retry behavior are absent.
- It is not fully defined which decisions the LLM may make and which values must come from deterministic code.
- Offline/model-failure behavior is promised but not specified.
- Prompt-injection handling is a test idea, not yet an executable policy.

### 3.5 UX and visual ambiguities

- The five screen descriptions are content lists, not interaction specifications.
- Navigation, starting state, click path, edit permissions, confirmation, reset, undo, and rerun behavior are absent.
- Loading, empty, stale-data, contradictory-data, no-risk, no-feasible-action, abstention, offline, approved, rejected, deferred, and duplicate-submit states are not designed.
- Exact terminology, explanation copy, synthetic-data labels, units, date formats, and error messages are absent.
- Charts lack exact type, axes, uncertainty encoding, threshold treatment, tooltip content, and accessible fallback.
- There is no selected visual target, typography, spacing system, component language, or anti-pattern list.
- Streamlit versus React remains unresolved. This decision materially affects visual control and interaction quality.

### 3.6 Engineering ambiguities

- There is no fixed stack, repo structure, API boundary, persistence model, dependency policy, or environment contract.
- Authentication, even if explicitly omitted, is not addressed.
- There are no start, test, seed, reset, export, or deployment commands.
- There is no clean-machine verification or supported environment statement.
- Acceptance criteria are readable but are not mapped to automated tests.

---

## 4. The final build-context pack

Create a single normative directory named `BUILD_CONTEXT/`. Keep it intentionally small. It should contain seven authoritative documents plus machine-readable assets.

```text
BUILD_CONTEXT/
├── 00_BUILD_CONTRACT.md
├── 01_PRODUCT_AND_UX_SPEC.md
├── 02_VISUAL_SYSTEM_AND_SCREEN_REFERENCE.md
├── 03_DATA_AND_SCENARIO_CONTRACT.md
├── 04_DECISION_AND_AGENT_CONTRACT.md
├── 05_ARCHITECTURE_AND_RUNBOOK.md
├── 06_ACCEPTANCE_EVALUATION_AND_DEMO.md
├── schemas/
├── fixtures/
├── golden/
└── visual-references/
```

### 4.1 `00_BUILD_CONTRACT.md`

This is the first and highest-authority file the coding engine reads.

It must freeze:

- final product name and one-sentence promise;
- primary operator and decision owner;
- exact hero workflow;
- P0 scope and explicit non-goals;
- whether recommendations are single or portfolios;
- exact action types included in P0;
- whether unstructured notice extraction is included;
- fixed technical stack;
- live-LLM and offline-fallback behavior;
- document precedence;
- definition of done;
- rule that research files cannot silently add features.

### 4.2 `01_PRODUCT_AND_UX_SPEC.md`

It must define:

- the operator's trigger, frequency, device, time pressure, knowledge, and authority;
- demo-presenter behavior versus a real operator's behavior;
- top three jobs to be done;
- information architecture and route map;
- exact primary click-by-click journey;
- state-transition model for a scenario and recommendation;
- what approve, edit, reject, defer, reset, and rerun mean;
- every loading, empty, warning, error, abstention, offline, and completion state;
- exact user-facing terminology and important microcopy;
- number, date, probability, pound, currency, and confidence formatting;
- accessibility and keyboard expectations;
- target viewport and minimum supported width.

The interface should be consolidated around a focused **decision workspace**, with scenario comparison and audit history as supporting views. It should not become five disconnected dashboard pages or a chatbot-first product.

### 4.3 `02_VISUAL_SYSTEM_AND_SCREEN_REFERENCE.md`

This is the main defense against a generic AI-generated interface.

Before coding, create three visual directions and have a human select one. The selected direction must then specify:

- high-fidelity reference screens for overview, risk detail, recommendation review, edited/approved result, abstention, and audit history;
- typography, spacing, grid, color, status encoding, borders, radii, shadows, and icon policy;
- button, field, banner, table, evidence panel, dialog, card, and tab behavior;
- exact chart forms, labels, threshold lines, uncertainty treatment, tooltips, and table alternatives;
- projector readability and accessible contrast;
- visual QA screenshots and comparison viewports.

Anti-slop rules should be explicit:

- no oversized chatbot as the primary interface;
- no decorative AI sparkle iconography;
- no unnecessary gradients, glass effects, glowing borders, or excessive rounded cards;
- no wall of equally weighted KPI tiles;
- no fake controls or decorative data;
- no long AI prose where structured evidence is clearer;
- use calm operational hierarchy, restrained color, readable tables, and one obvious next decision.

### 4.4 `03_DATA_AND_SCENARIO_CONTRACT.md`

It must define:

- exact entity and event model;
- field types, enums, nullability, units, IDs, date/week convention, provenance, and validation messages;
- inventory-continuity and capacity invariants;
- immutable base fixtures and append-only run events;
- scenario clone/reset behavior;
- all five scenario inputs with fixed random seed;
- exact ground truth for each scenario;
- how missing, duplicated, conflicting, stale, and malicious text is represented.

Required machine-readable assets:

- JSON Schemas or equivalent typed schemas in `schemas/`;
- frozen input data in `fixtures/`;
- frozen expected risks, feasible actions, rejected actions, rankings, metrics, and audit events in `golden/`.

### 4.5 `04_DECISION_AND_AGENT_CONTRACT.md`

This is the mathematical and agentic source of truth.

It must lock:

- forecasting formula and exact input window;
- conservative and expected projections;
- risk threshold and gap calculation;
- storage, budget, lead-time, usable-life, authorization, and data-quality constraints;
- action-generation rules and mathematical effect of every action;
- score normalization, weights, tie-breaking, and quantity selection;
- confidence mapping and abstention rules;
- manager-edit validation;
- before/after simulation behavior;
- deterministic baseline policies;
- all tool request, success, warning, and error schemas;
- LLM system behavior, allowed authority, tool order, structured output, maximum iterations, retry/timeout, and fallback;
- rule that all numeric values, rankings, IDs, and evidence come from deterministic tools;
- handling of untrusted text and prompt-injection attempts.

The LLM-on and LLM-off paths must produce the same calculations and action ranking. The LLM's value should be interpretation, orchestration, missing-information handling, and concise explanation—not arithmetic invention.

### 4.6 `05_ARCHITECTURE_AND_RUNBOOK.md`

It must define:

- one chosen stack and why it fits the demo;
- repository tree and module ownership;
- frontend/backend interfaces;
- persistence and audit-event model;
- configuration and secret handling;
- exact dependency policy;
- deterministic seed and cache behavior;
- timeout, retry, logging, and error boundaries;
- local, offline, and optional deployed modes;
- one-command start, test, seed, reset, and build flows;
- supported operating environment;
- clean-checkout setup and troubleshooting;
- demo-safe reset and data export.

Recommended default if the team has no stronger existing preference:

- React with TypeScript for precise UI control;
- a small Python API for deterministic calculations and agent tools;
- SQLite for append-only decision/run events;
- frozen local JSON/CSV fixtures;
- an optional live LLM behind a provider adapter;
- a deterministic no-key/offline mode;
- local-first execution, with deployment only after the clean local path passes.

The final choice should optimize team familiarity and demo reliability, not architecture novelty.

### 4.7 `06_ACCEPTANCE_EVALUATION_AND_DEMO.md`

It must turn requirements into observable proof:

- Given/When/Then acceptance cases linked to each P0 requirement;
- numeric tolerances and golden-output comparisons;
- unit, integration, end-to-end, accessibility, and visual-regression coverage;
- all five scenario truth tables;
- red-team and failure cases;
- repeated clean-reset demo test;
- exact four-to-five-minute click sequence and expected values at each checkpoint;
- offline/model-failure fallback sequence;
- screenshot or recording backup checklist;
- claims the team may and may not make;
- distinction between simulated results and future pilot outcomes.

---

## 5. Source-of-truth order

The coding engine must use this precedence when instructions conflict:

1. `BUILD_CONTEXT/00_BUILD_CONTRACT.md`
2. machine-readable schemas, fixtures, and golden outputs;
3. the relevant numbered build-context specification;
4. `NUTRITION_AWARE_SUPPLY_RESILIENCE_AGENT_PROJECT_PLAN.md` for rationale;
5. the decision memo and domain research for background and evidence;
6. the hackathon deck for official competition constraints.

Additional rules:

- An example is not a requirement unless it appears in the build contract or a numbered specification.
- A research opportunity is not a feature.
- No P1 or stretch work begins until every P0 acceptance test passes.
- Unsupported fields, actions, or assumptions are rejected rather than inferred.
- Any intentional deviation from the pack must be recorded as a decision before implementation.
- Cached agent output must be keyed by scenario, data, rule, and prompt versions so stale explanations cannot be paired with new quantities.

---

## 6. Specification-closure sequence

### Phase A — Freeze the product contract

Resolve the decisions that change the rest of the system:

1. Keep the narrow Nutrition-Aware Supply Resilience Agent as the P0 product.
2. Select one hero input: structured shipment-status change, or an unstructured synthetic notice followed by verified extraction.
3. Choose single-action or multi-action recommendations. Single-action is the safer P0 default.
4. Decide whether transfers are a true P0 action with a fully modeled peer source, or an alternative shown but not executable.
5. Define “learning” as feedback capture only.
6. Select the stack and local execution model.
7. Lock P0, P1, and non-goals.

**Exit condition:** No “either,” “or,” “optional,” or “possible” decision remains in the P0 contract.

### Phase B — Freeze the synthetic world and decision truth

1. Finalize typed schemas and invariants.
2. Create the fixed base dataset.
3. Create all scenario deltas.
4. Specify every calculation and action effect.
5. Define exact constraints, ranking normalization, ties, confidence, and abstention.
6. Calculate and freeze golden outputs before frontend work.
7. Have a second implementation or manual worksheet independently verify the primary scenario.

**Exit condition:** Two independent evaluators obtain the same primary risk, feasible actions, recommendation, and before/after values.

### Phase C — Freeze the user experience

1. Write the operator and decision-workflow contract.
2. Reduce the information architecture to the smallest useful workspace.
3. Specify all state transitions and failure states.
4. Write the exact trust, evidence, uncertainty, and approval copy.
5. Create three visual directions.
6. Select one direction and complete reference screens.
7. Define the design system, charts, accessibility, and target viewport.

**Exit condition:** A frontend builder can reproduce the screens without deciding the hierarchy or visual style.

### Phase D — Freeze architecture and AI behavior

1. Define the repo and module boundaries.
2. Formalize tool inputs, outputs, errors, and provenance.
3. Formalize the agent loop and its authority boundary.
4. Define offline fallback and identical deterministic results.
5. Define persistence, reset, logging, and environment behavior.
6. Write exact run, test, and deployment commands.

**Exit condition:** A builder can explain how every displayed value moves from fixture to deterministic tool to UI, and how the app works without an LLM.

### Phase E — Convert requirements into proof

1. Map each P0 requirement to an automated or explicit manual acceptance check.
2. Add scenario golden tests and invariant tests.
3. Add edit/approval/audit state tests.
4. Add missing-data, no-feasible-action, prompt-injection, and offline tests.
5. Add accessibility and visual-reference checks.
6. Run a cold-handoff review: give only the build pack to a fresh coding agent and record every unanswered question.
7. Revise the pack until no consequential product decision is left to the builder.

**Exit condition:** The fresh agent's proposed implementation matches the intended product, data truth, UX, and test plan without consulting the team.

---

## 7. External validation that is useful but not blocking

The synthetic demo can be specified without new organizational data. A short Food Finders conversation would still materially strengthen its credibility.

Ask only the highest-value questions:

1. Who owns this weekly supply decision today?
2. What event actually triggers replanning?
3. Which exact terms do staff use for category gaps, inbound certainty, and approvals?
4. Which evidence would make a recommendation trustworthy enough to review?
5. Is a delayed USDA arrival, a new donation offer, or a purchasing-budget conflict the most realistic demo trigger?
6. What would make the proposed workflow obviously unrealistic?

Record each answer as `validated`, `staff-reported`, or `still assumed`. Do not wait for this call if it is unavailable; preserve the assumption labels.

Real operational data are needed later for:

- validating category definitions and thresholds;
- checking whether historical distributions are usable for planning;
- evaluating data quality and integration effort;
- historical replay and staff agreement;
- any claim about savings, waste reduction, improved availability, or Food Finders-specific performance.

---

## 8. Definition of “ready to hand to the coding engine”

The build context is ready only when all of the following are true:

- The product, hero workflow, P0 actions, and non-goals are frozen.
- One stack is selected; alternatives are removed from normative instructions.
- Every displayed field has a named source and format.
- Every formula, threshold, normalization, tie, and state mutation is explicit.
- Every scenario has immutable inputs and golden outputs.
- The LLM cannot create numbers, IDs, actions, or evidence.
- Live-model failure does not break the primary demo.
- Approve, edit, reject, defer, reset, and rerun have precise effects.
- The interface has a human-selected visual target and complete state coverage.
- P0 acceptance criteria are executable or objectively inspectable.
- A clean checkout has documented one-command start, test, and reset paths.
- The exact judge journey completes repeatedly in under five minutes.
- A fresh coding agent can produce a matching implementation plan without asking a consequential product question.

---

## 9. How the coding engine should be instructed

Do not ask for an unstructured one-shot generation. Give it the complete pack and require milestone-based execution inside one implementation task:

1. Read `00_BUILD_CONTRACT.md` and summarize the frozen requirements and source hierarchy.
2. Validate schemas, fixtures, and golden outputs before scaffolding the UI.
3. Implement the deterministic engine and tests first.
4. Implement persistence and scenario-reset behavior.
5. Implement the selected visual reference exactly.
6. Add the agent adapter without granting it numeric or transactional authority.
7. Run unit, integration, end-to-end, accessibility, and visual checks.
8. Exercise the full demo in live-LLM and offline modes.
9. Fix failures rather than weakening tests or changing golden data.
10. Return a completion report listing commands, test results, intentional deviations, and remaining limitations.

This still allows the coding engine to make low-consequence implementation choices. It does not allow it to invent the product.

---

## 10. Recommended next action

Do not start application coding from the current project-plan document alone.

The next work should be a **specification-closure sprint** that creates the `BUILD_CONTEXT/` pack in dependency order:

1. build contract;
2. frozen data and golden scenario truth;
3. exact decision and agent behavior;
4. UX states and selected visual direction;
5. architecture and runbook;
6. acceptance, evaluation, and demo contract;
7. cold-handoff audit.

Once that pack passes the readiness checklist, the project will be in the right state to hand to an AI coding engine for a durable, polished proof-of-concept.
