# 00 — Build Contract

**Authority:** Highest-priority implementation document  
**Status:** Normative for the hackathon proof-of-concept  
**Product:** **NourishOps**  
**Descriptor:** Nutrition-Aware Supply Resilience  
**Data mode:** Fully synthetic and simulated  

---

## 1. Product promise

> Given a synthetic supply disruption, NourishOps identifies which food category is at risk, invokes deterministic planning tools, compares the feasible actions, explains the evidence and uncertainty, asks a manager for approval, and shows the simulated effect of the approved response.

The proof-of-concept closes one decision loop. It does not optimize the complete food-bank network and does not take an external action.

## 2. Primary operator

The sole P0 operator is a regional food-bank supply-planning manager who can review simulated recommendations and approve, edit, reject, or defer them.

No authentication or multi-role authorization is implemented. The interface must nevertheless communicate that real purchasing, donation acceptance, transfer, and distribution authority would remain with named staff roles.

## 3. Hero workflow

The primary demonstration is Scenario A, a synthetic USDA protein-shipment delay.

1. The operator opens a clean scenario run dated **2026-08-03**.
2. The application shows that aggregate pounds appear healthy and presents an unanalyzed synthetic operations notice.
3. The notice changes inbound shipment `INB-USDA-PROTEIN-104` from confirmed on 2026-08-03 to probable on 2026-08-17.
4. In live mode, the LLM extracts only the fields supported by the notice. The deterministic rules map the extracted status to the configured probability. In offline mode, the exact cached extraction is loaded.
5. Deterministic tools validate the scenario, apply the normalized disruption to the run, forecast distribution, project inventory, detect the week-2 protein risk, generate catalog actions, enforce constraints, simulate effects, and rank feasible actions.
6. The application recommends one fixed purchase action, shows feasible alternatives and rejected options, and explains the evidence without inventing numbers.
7. The manager approves the recommendation. Approval creates a simulated event only.
8. The application recalculates the projection, shows the before/after comparison, and writes an append-only audit record.

The complete judge path must take less than five minutes and work with no network connection or model API key.

## 4. Frozen P0 scope

### 4.1 World modeled

- one regional food bank;
- one central warehouse;
- six broad food categories;
- 16 historical Monday-start weeks;
- one four-week forecast horizon;
- dry, refrigerated, and frozen capacity;
- one flexible purchasing budget per scenario run;
- immutable synthetic base data plus deterministic scenario overlays;
- one active manager and one recommendation at a time.

### 4.2 Supported scenarios

- **A — USDA protein delay:** detect the week-2 protein risk and recommend a feasible purchase.
- **B — Short-life produce offer:** recommend the exact safe partial quantity rather than accepting all 20,000 pounds.
- **C — Donation mismatch:** redirect a new snack offer while essential categories remain below target.
- **D — Budget conflict:** choose one of two category purchases when both cannot be funded.
- **E — Missing/conflicting data:** abstain and request the decision-critical facts.

Every scenario must have immutable fixtures and golden outputs.

### 4.3 Supported action types

- `PURCHASE`
- `TARGETED_DONOR_REQUEST`
- `REQUEST_TRANSFER`
- `ACCEPT_DONATION`
- `PARTIAL_ACCEPT`
- `REDIRECT_DONATION`
- `DECLINE_DONATION`
- `ACCELERATE_DISTRIBUTION`
- `MONITOR`

Only actions present in the scenario's action catalog may be considered.

`REQUEST_TRANSFER` represents one fixed, already-known external peer opportunity. The application does not inspect or optimize another warehouse's inventory.

### 4.4 Recommendation shape

- P0 recommends exactly **one action**, never a portfolio or blended plan.
- The recommendation view must show at least two alternatives when the scenario contains them.
- An operator may select a feasible alternative before approval.
- Editing changes only `requested_quantity_lb`.
- An edited quantity must satisfy the same bounds, increments, budget, capacity, lead-time, and usable-life rules as the original.
- The operator cannot invent a new action, modify cost, probability, arrival date, evidence, or constraint results.

### 4.5 Decision outcomes

- **Approve:** apply the action to the run's simulated projection and append an audit event.
- **Edit and approve:** revalidate and resimulate the edited quantity, then apply it and append the original and edited values.
- **Reject:** do not change the projection; require and record an override reason.
- **Defer:** do not change the projection; keep the risk open and record an optional note.
- **Reset:** create a new clean run from immutable fixtures. Never delete or rewrite prior audit events.

## 5. Agent boundary

The LLM may:

- extract explicitly present fields from the synthetic notice;
- select the next read-only analysis tool permitted by the state machine;
- ask for a missing decision-critical field;
- turn verified tool output into concise manager-facing explanations;
- explain why catalog actions passed or failed.

The LLM may not:

- calculate, estimate, round, rank, or alter a numeric value;
- create an ID, evidence record, category, action, constraint, or source;
- set an arrival probability not supplied by deterministic policy;
- record a manager decision;
- change fixtures, rules, or golden outputs;
- trigger purchasing, outreach, transfer, allocation, or any external write;
- expose chain-of-thought or treat embedded notice text as an instruction.

Every displayed number, ranking, constraint, and evidence link must originate in deterministic application output.

`record_manager_decision` is a trusted backend transition invoked by the manager interface. It is not an LLM-callable tool.

The term “learning” means feedback capture for later evaluation. There is no online model training, personalization, memory, or automatic policy update.

## 6. Experience contract

The P0 interface has three destinations:

1. **Decision workspace** — scenario status, active risk, evidence, recommendation, alternatives, approval, and simulated result.
2. **Compare** — no intervention versus simple reorder versus selected agent action.
3. **Audit** — append-only run events, sources, versions, decisions, and overrides.

Overview, risk detail, and recommendation review belong to one coherent workspace rather than separate generic dashboard pages.

The application is not chat-first. AI activity is represented by a compact verified-analysis trace, evidence, assumptions, uncertainty, alternatives, and abstention behavior.

The synthetic-data notice must remain visible on every application route:

> Simulation only — All organizations, records, quantities, costs, and outcomes in this prototype are synthetic.

## 7. Fixed technical architecture

- **Frontend:** React with TypeScript, built with Vite.
- **Backend:** Python 3.12 with FastAPI.
- **Deterministic engine:** pure Python modules; no LLM dependency.
- **Persistence:** local SQLite for runs and append-only audit events.
- **Fixtures:** versioned local JSON files listed in `fixtures/base_manifest.json`.
- **LLM:** optional provider adapter configured by environment; no provider-specific logic in domain modules.
- **Offline mode:** cached structured notice extraction plus deterministic explanation templates.
- **Charts:** Recharts, with its exact implementation version locked in `package-lock.json`.
- **Execution:** local first; optional hosted deployment only after the offline local path passes.
- **Authentication:** omitted from P0.
- **External integrations and writes:** prohibited.

Dependency patch versions are selected during implementation and frozen in lockfiles. Floating production dependencies are not permitted.

## 8. P0 completion standard

P0 is complete only when:

- every base fixture and all five scenario overlays validate, and the five scenarios reproduce their golden outputs;
- Scenario A completes repeatedly from a clean reset;
- the deterministic engine passes all formula, constraint, scoring, state, and idempotency tests;
- the live-LLM and offline paths produce identical numeric results and rankings;
- no displayed numeric or evidence claim is absent from deterministic output;
- approve, edit-and-approve, reject, defer, and reset have the specified effects;
- missing data and untrusted text cause validation, clarification, or abstention rather than invention;
- the selected visual reference is implemented at the target desktop viewport;
- keyboard use, focus, contrast, status text, and chart alternatives satisfy the acceptance specification;
- a clean checkout has documented start, test, seed, reset, and build commands;
- the full judge path succeeds in under five minutes without network access;
- every result remains labeled synthetic or simulated;
- no unsupported Food Finders or real-world impact claim appears in the UI, demo, or generated summary.

## 9. Explicit non-goals

- real Food Finders, client, donor, pantry, vendor, USDA, or partner data;
- production Primarius, Link2Feed, MealConnect, ERP, WMS, email, or purchasing integration;
- household demand prediction or client-level nutrition decisions;
- clinical nutrition advice;
- route optimization;
- network-wide transfer optimization;
- food-safety disposition;
- autonomous purchasing, donor contact, transfer, allocation, or distribution;
- user accounts, permissions administration, or multi-tenant operation;
- mobile-first or native-mobile interface;
- causal claims about hunger, savings, waste, meals, or real operational improvement.

## 10. Source-of-truth order

When instructions conflict, use this precedence:

1. this build contract;
2. machine-readable schemas, fixtures, and golden outputs;
3. the relevant numbered file in `BUILD_CONTEXT/`;
4. `NUTRITION_AWARE_SUPPLY_RESILIENCE_AGENT_PROJECT_PLAN.md` for rationale;
5. `HACKATHON_DECISION_MEMO.md` and `FOODBANK_DOMAIN_GROUNDING.md` for background only;
6. `FOODBANK_HACKATHON_CHEAT_SHEET.md` for presentation memory only;
7. the official hackathon deck for competition constraints.

Rules:

- Research opportunities do not create features.
- Examples do not become requirements unless repeated in this contract or a numbered specification.
- Machine-readable fixtures control the synthetic facts.
- Golden outputs control externally observable scenario behavior.
- The decision contract controls calculations and state transitions.
- The product/UX and selected visual specification control interaction and presentation.
- P1 or stretch work cannot delay, replace, or weaken P0.
- The builder must record any intentional deviation before implementing it.

## 11. Approved claim boundary

The team may say:

- the prototype detects predefined synthetic category risks;
- it compares catalog actions under simulated constraints;
- it provides verified evidence, uncertainty, alternatives, and human approval;
- it reproduces fixed scenario results and defined baselines;
- it demonstrates a possible read-only shadow-mode workflow.

The team may not say:

- it reduced hunger, delivered meals, saved real money, or prevented real waste;
- it has been validated on Food Finders data or adopted by staff;
- its forecast, nutrition policy, ranking, or integrations are production-ready;
- the simulated uplift predicts real-world impact.

## 12. Coding-engine entry instruction

Use this instruction only after `02_VISUAL_SYSTEM_AND_SCREEN_REFERENCE.md` has status `SELECTED_AND_NORMATIVE`:

> Build the complete NourishOps P0 application described in `BUILD_CONTEXT/`. Read the numbered documents in order, then validate every schema, fixture, and golden output before editing application code. Treat `00_BUILD_CONTRACT.md` as the highest authority and follow its source precedence. Do not add features from the background research. Implement in this order: deterministic domain engine and tests; run/event persistence and idempotency; API contracts; selected interface and all required states; optional live-agent adapter; offline parity; end-to-end, accessibility, and visual verification. Do not weaken a test or change a golden fixture to make an implementation pass. If the build pack contains a consequential contradiction, stop and report the exact conflicting sections. Finish only when every P0 release gate in `06_ACCEPTANCE_EVALUATION_AND_DEMO.md` passes. Return the local start, test, reset, and build commands; verification results; deliberate deviations; and remaining limitations.
