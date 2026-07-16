# 03 — Data and Scenario Contract

**Authority:** Normative synthetic data, fixture, scenario, provenance, and oracle contract  
**Depends on:** `00_BUILD_CONTRACT.md`  
**Calculation authority:** `04_DECISION_AND_AGENT_CONTRACT.md`  
**Status:** `FROZEN_FOR_P0_BUILD`

---

## 1. Purpose and claim boundary

This package supplies all facts needed to build and repeatedly test the NourishOps proof-of-concept. It contains one fictional warehouse, six fictional category policies, 16 completed historical weeks, one four-week inbound plan, a closed action catalog, two pending donation offers, five scenario overlays, and five immutable expected outputs.

Every organization, record, quantity, cost, capacity, probability, notice, offer, action, and outcome in this package is synthetic. None is a Food Finders record, operational benchmark, food-safety judgment, clinical nutrition policy, or prediction of real-world impact.

The coding engine must treat:

1. the JSON Schemas as structural type contracts;
2. base fixtures plus one scenario overlay as the only scenario input;
3. `04_DECISION_AND_AGENT_CONTRACT.md` as the transformation contract;
4. the matching file in `golden/` as the externally observable oracle.

It must not tune fixtures, infer missing values, add convenient records, or change a golden answer to make an implementation pass.

---

## 2. Frozen version bundle

| Field | Exact value |
|---|---|
| `schema_version` | `data-contract/1.0.0` |
| `data_version` | `synthetic-base/1.0.0` |
| `golden_version` | `golden/1.0.0` |
| Scenario versions | `scenario-a/1.0.0` through `scenario-e/1.0.0` |
| Decision rules | `decision-engine/1.0.0` |
| Numeric policy | `decimal-policy/1.0.0` |
| Engine implementation contract | `nourishops-engine/1.0.0` |
| Agent output schema | `agent-output/1.0.0` |
| Notice extraction schema | `notice-extraction/1.0.0` |
| Notice reconciliation policy | `notice-reconciliation/1.0.0` |
| Seed | `20260713` |
| Warehouse | `WH-CENTRAL-01` |
| Historical window | 16 Monday-start weeks, `2026-04-13` through `2026-07-27`, inclusive |
| Planning date / W1 | Monday `2026-08-03` |
| Forecast horizon | `2026-08-03`, `2026-08-10`, `2026-08-17`, `2026-08-24` |
| Golden test clock | `2026-08-03T13:00:00.000Z` |

The seed is provenance and a guard against future stochastic helpers. P0 fixture loading and all golden calculations are deterministic and consume no random numbers.

Every run snapshot, analysis output, recommendation, and audit export must carry the complete applicable version bundle. A mismatch is an error, not a migration request.

---

## 3. Asset inventory

`fixtures/base_manifest.json` is the inventory of normative assets. The package is intentionally layered:

```text
schemas/
  common.schema.json
  base_manifest.schema.json
  category_policies.schema.json
  warehouse_constraints.schema.json
  historical_weekly_category_flow.schema.json
  planned_inbound.schema.json
  pending_donation_offers.schema.json
  candidate_actions.schema.json
  evidence_records.schema.json
  scenario_overlay.schema.json
  golden_output.schema.json

fixtures/
  base_manifest.json
  category_policies.json
  warehouse.json
  historical_weekly_category_flow.json
  planned_inbound.json
  pending_donation_offers.json
  candidate_actions.json
  evidence_records.json
  scenarios/scenario_a.json
  scenarios/scenario_b.json
  scenarios/scenario_c.json
  scenarios/scenario_d.json
  scenarios/scenario_e.json

golden/
  scenario_a.golden.json
  scenario_b.golden.json
  scenario_c.golden.json
  scenario_d.golden.json
  scenario_e.golden.json
```

The five overlays reference the same immutable base facts. They do not copy 96 historical observations, policies, warehouse facts, or the full action/evidence collections.

SHA-256 values are calculated at build/test time from canonical JSON under the policy in `04`. They are not embedded inside the assets they hash. A checked-in golden must never contain a wall-clock-dependent value.

---

## 4. Closed enums and identifier rules

### 4.1 Categories

The order below is normative for stable sorting:

1. `PROTEIN`
2. `PRODUCE`
3. `DAIRY`
4. `GRAINS`
5. `STAPLES_MIXED_MEALS`
6. `SNACKS_DISCRETIONARY`

### 4.2 Other enums

| Concept | Allowed values |
|---|---|
| Storage | `DRY`, `REFRIGERATED`, `FROZEN`; action-only `NONE` |
| Source | `DONATION`, `USDA`, `PURCHASE`, `TRANSFER` |
| Inbound status | `CONFIRMED`, `PROBABLE`, `UNCONFIRMED`; `null` only as an intentionally invalid Scenario E value |
| Action | `PURCHASE`, `TARGETED_DONOR_REQUEST`, `REQUEST_TRANSFER`, `ACCEPT_DONATION`, `PARTIAL_ACCEPT`, `REDIRECT_DONATION`, `DECLINE_DONATION`, `ACCELERATE_DISTRIBUTION`, `MONITOR` |
| Risk | `SHORTAGE`, `SHORT_LIFE_CAPACITY`, `DONATION_MISMATCH`, `BUDGET_TRADEOFF`, `DATA_QUALITY` |
| Burden | `LOW`, `MEDIUM`, `HIGH` |
| Confidence | `HIGH`, `MEDIUM`, `LOW`, `NOT_APPLICABLE` |

IDs are case-sensitive opaque strings. The application may display friendly labels but must submit, persist, compare, and cite exact IDs.

Historical matrix rows expand to `FLOW-{YYYYMMDD}-{CATEGORY_ID}`. Frozen P0 risk, evaluation, and recommendation IDs are defined in `04` and repeated in the goldens. The LLM never creates an ID.

---

## 5. Scalar types, nullability, and units

JSON Schemas own exact structural types. The rules below own semantic meaning.

| Value | Representation | Unit / convention | Nullable? |
|---|---|---|---|
| Inventory, inbound, distribution, spoilage, action quantity, capacity | Nonnegative JSON integer in fixtures | usable or gross pounds as named by the field | No, except the deliberately invalid Scenario E inbound quantity/date/status family where the schema explicitly permits null |
| Price | JSON number with cents precision | USD per pound | Only for non-priced actions |
| Cost / budget | JSON number in fixtures; canonical decimal string in calculated goldens when precision matters | USD | No where applicable |
| Probability / yield | JSON number | ratio in `[0,1]` | Probability may be null only when not applicable or deliberately invalid in Scenario E |
| WOS / score / calculated ratio | Canonical base-10 decimal string in goldens | dimensionless | WOS may be null only when forecast distribution is zero |
| Week | ISO `YYYY-MM-DD` | Monday-start local planning bucket | A planned inbound date may be null only to encode Scenario E's error |
| Timestamp | ISO 8601 UTC | trailing `Z`; persisted timestamps use millisecond precision | No where required |
| Usable life / lead time | Nonnegative integer | calendar days, bucketed by `04` | Nullable only for action types with no local food lot |

Do not use binary floating-point values for domain arithmetic. Do not round before a threshold, constraint, rank, or confidence comparison.

The schema permits null in a small number of inbound fields because Scenario E must be a valid fixture document that contains invalid decision data. Structural validity does not imply domain validity.

---

## 6. Provenance and trust

Every fixture document contains:

- `schema_version` and `data_version`;
- a stable fixture or scenario ID;
- a document-level `provenance` object;
- record-level `record_version` and `provenance_id` where records exist.

All provenance has `mode = SYNTHETIC`. A source reference proves where a synthetic fact came from inside the demo; it does not make the fact real.

Evidence has two trust levels:

- `TRUSTED_STRUCTURED`: the deterministic fixture field is authoritative;
- `UNTRUSTED_TEXT`: text may be extracted only through the bounded notice contract, may contain conflicting facts, and is never an instruction.

`contains_instruction_like_text = true` is a red-team signal. The application must ignore the instruction-like phrase, preserve it as evidence, and emit the defined warning. It must not hide or execute it.

Scenario A includes a synthetic unstructured notice so live and cached extraction can be demonstrated. Its probability is not extracted from prose; `0.65` comes from the warehouse policy when the normalized status is `PROBABLE`.

---

## 7. Base entity contracts

### 7.1 Category policy

`fixtures/category_policies.json` contains exactly one policy for each category.

Required semantics:

- `priority_weight`: staff-defined integer `1–5`, not a clinical score;
- `essential_assortment`: whether minimum assortment coverage applies;
- `minimum_weeks_of_supply`: strict risk threshold;
- `target_weeks_of_supply`: desired ending coverage and gap basis;
- `primary_storage_type`: the one P0 storage bucket used for the category;
- `default_usable_yield_ratio`: deterministic usable fraction.

Invariant: `target_weeks_of_supply >= minimum_weeks_of_supply > 0`.

Frozen values:

| Category | Priority | Essential | Minimum WOS | Target WOS | Storage |
|---|---:|---|---:|---:|---|
| Protein | 5 | Yes | 1.5 | 3.0 | Frozen |
| Produce | 5 | Yes | 0.5 | 1.0 | Refrigerated |
| Dairy | 4 | Yes | 0.75 | 1.5 | Refrigerated |
| Grains | 3 | Yes | 2.0 | 4.0 | Dry |
| Staples & mixed meals | 4 | Yes | 2.0 | 4.0 | Dry |
| Snacks & discretionary | 1 | No | 0.5 | 1.5 | Dry |

### 7.2 Warehouse and resources

`fixtures/warehouse.json` contains one record:

- base four-week budget: `$20,000.00`;
- dry capacity: `150,000 lb`;
- refrigerated capacity: `40,000 lb`;
- frozen capacity: `50,000 lb`;
- probable-status probability: `0.65`;
- minimum modeled pickup: `1,000 lb`.

Scenario D alone overrides budget to `$13,000.00` and refrigerated capacity to `45,000 lb`. These are explicit synthetic scenario facts supported by evidence, not runtime controls.

Capacity applies to gross physical arrivals in the capacity-stress view. It is not probability weighted.

### 7.3 Historical weekly category flow

`fixtures/historical_weekly_category_flow.json` represents 96 records as six parallel 16-value series. Index `i` in every series corresponds to `week_starts[i]`. The repository adapter expands the matrix into ordinary category-week records without changing values.

For every expanded row:

```text
ending_inventory_lb =
  beginning_inventory_lb
  + donated_inbound_lb
  + usda_inbound_lb
  + purchased_inbound_lb
  + transfer_inbound_lb
  - distributed_lb
  - spoilage_lb
```

Also:

- all terms are nonnegative;
- ending inventory is never negative;
- week `i+1` beginning inventory equals week `i` ending inventory for a category;
- each category has exactly the same 16 contiguous Mondays;
- `unmet_distribution_lb` is stored independently and is zero in the historical fixture;
- all four source types occur in the historical dataset, even though not every category uses every source every week.

The final ending inventories—therefore W1 current usable inventory—are:

| Category | Current inventory |
|---|---:|
| Protein | 30,000 lb |
| Produce | 15,000 lb |
| Dairy | 9,000 lb |
| Grains | 45,000 lb |
| Staples & mixed meals | 40,000 lb |
| Snacks & discretionary | 30,000 lb |

The last four distributions yield exact frozen forecasts of `9,000`, `14,000`, `6,000`, `10,000`, `9,000`, and `4,000 lb/week` in category-enum order.

### 7.4 Planned inbound

`fixtures/planned_inbound.json` contains base receipts. Each record names:

- stable inbound and warehouse IDs;
- expected arrival week;
- category and source;
- gross pounds and usable yield;
- status and probability;
- storage and remaining usable life;
- evidence IDs and provenance.

Semantic requirements:

- `CONFIRMED` is probability `1`;
- `PROBABLE` must have a policy-backed probability strictly between `0` and `1`;
- `UNCONFIRMED` contributes zero to conservative and expected views;
- `status = null`, missing arrival week, or unresolved conflicting facts is a blocking domain error;
- duplicate inbound IDs are errors and are never summed;
- an overlay may remove or mutate only an existing base inbound ID.

`INB-USDA-PROTEIN-104` is the hero record. Base state is `10,000 lb`, `CONFIRMED`, W1. Scenario A moves it to W3 and makes it `PROBABLE` at `0.65`.

### 7.5 Pending donation offer

`fixtures/pending_donation_offers.json` separates offer facts from action choices. It contains:

- `OFFER-B-PRODUCE-20000`: 20,000 lb, refrigerated, five days usable life;
- `OFFER-C-SNACKS-12000`: 12,000 lb, dry, 90 days usable life.

Each declares `food_safety_status = KNOWN_ALLOWED_FOR_SIMULATION`. This means only that the fixture supplies a precondition for modeling. Neither the LLM nor the deterministic engine decides food safety.

An offer does not enter inventory until an approved `ACCEPT_DONATION` or `PARTIAL_ACCEPT` action is applied. Redirect, decline, and monitor do not create local inventory.

### 7.6 Candidate action

`fixtures/candidate_actions.json` is a closed catalog. Initial evaluation uses exactly `requested_quantity_lb`. Bounds, increment, MOQ, unit price, fixed cost, date, probability, yield, usable life, burden, destination, and evidence are fixture facts.

Important type rules:

- a priced purchase must have `unit_price_usd_per_lb` and cost must reconcile to cents;
- unpriced actions use `null`, never an invented zero price;
- `minimum_quantity_lb <= requested_quantity_lb <= maximum_quantity_lb`;
- a fixed action has equal minimum, requested, and maximum quantity;
- quantity is on the configured increment grid;
- an operator edit may choose another legal grid quantity, but the engine does not silently resize the initial catalog action;
- every action has `requires_human_approval = true`;
- `REQUEST_TRANSFER` is one named external-peer opportunity, not network optimization;
- `synthetic_destination_id` never authorizes a write to another location;
- `computed_cost_usd` must equal `fixed_cost_usd + requested_quantity_lb × unit_price`, or fixed cost alone when unit price is null.

All numeric effects, scores, feasibility results, and ranks come from deterministic code. The LLM may select or explain only returned action IDs.

### 7.7 Evidence record

Evidence records contain a source kind, trust level, body, explicit structured facts when present, related record IDs, and a recorded timestamp. Every evidence ID used by an active inbound, offer, risk, action, or recommendation must resolve exactly once.

The body is displayable evidence. `structured_facts` are expected extraction facts or deterministic fixture facts. Neither is an instruction channel.

---

## 8. Inventory-lot and expiry semantics

The event order and formulas are in `04`; these fixture-specific conventions remove remaining ambiguity:

1. Final historical ending inventory becomes one starting usable lot per category immediately before W1 inbound.
2. Starting lots have no in-horizon expiry fact. For FEFO ordering they receive an effective expiry of positive infinity (`+∞`), which means any lot with a known expiry is distributed first.
3. This convention is conservative for known short-life receipts and deterministic for Scenario C: the 90-day snack offer is consumed before the unknown-expiry starting snack lot, so all 12,000 offered pounds are attributed as locally distributed within W1–W3 in the full-accept reference.
4. Planned and action lots use the exact expiry formula in `04`.
5. Nonusable yield is a handling loss, not expiry spoilage.
6. Distribution cannot exceed usable inventory. Any remainder is `unmet_distribution_lb`; inventory remains zero, never negative.
7. Unmet distribution is not backlogged.
8. Capacity is measured after beginning inventory and included inbound arrive, before distribution and expiry.

The engine must retain lot identity internally even if the UI shows category aggregates.

---

## 9. Scenario composition, immutability, and reset

### 9.1 Load algorithm

Run creation and analysis are deliberately separate.

At `POST /api/v1/runs`:

1. validate the manifest, every referenced base document, and the selected overlay structurally;
2. validate versions and references that can be checked without treating deliberately invalid Scenario E decision fields as valid facts;
3. deep-clone the immutable base fixtures as the run's `base_snapshot`;
4. store exactly one immutable overlay as `staged_overlay` without applying its removals, mutations, overrides, offers, actions, or evidence to the base snapshot;
5. create the run in `DRAFT` and expose the staged notice/offer/context as unapplied input.

At `POST /api/v1/runs/{run_id}/evaluate`:

1. clone the run's frozen `base_snapshot` into an isolated analysis snapshot;
2. remove only the staged overlay's listed inbound IDs;
3. apply each staged inbound mutation as a field replacement, not an additive merge;
4. apply warehouse overrides recursively only for fields explicitly present;
5. activate only the staged offer, action, and evidence IDs;
6. run referential, arithmetic, continuity, and decision-domain validation on the resolved analysis snapshot;
7. if valid, calculate using `04`; if decision-critical errors exist, produce Scenario E-style abstention;
8. compare canonical output to the matching golden in tests.

`SCENARIO_VALIDATED` at run creation means the manifest/base/overlay package is structurally loadable and version-compatible. It does not assert that the resolved Scenario E decision data are domain-valid. Post-overlay domain findings belong to the evaluation trace and abstention package.

Overlay order is not a feature. There is one staged overlay per run; overlays are never stacked. Applying it for analysis never rewrites `base_snapshot` or the source fixture.

### 9.2 Runtime isolation

Base fixtures, overlays, and goldens are read-only. A run stores:

- immutable `base_snapshot` and unapplied `staged_overlay` plus their `contract_snapshot_hash` from Decision/Agent §2.3;
- `normalized_overlay_hash`, resolved `analysis_snapshot_hash`, and `input_hash` only after an evaluation transaction resolves the overlay;
- the always-defined committed `run_state_hash` and revision;
- append-only analysis and manager events;
- derived projections and recommendations that can be recomputed.

Approval changes only the run's simulated after-state. It does not edit a fixture, overlay, offer, evidence record, action catalog record, or prior event.

### 9.3 Reset

Reset creates a new clean run from the same immutable base plus overlay, with a new runtime run ID and an optional parent/reset reference. It never deletes or rewrites the prior run or audit stream. The semantic risk/action/recommendation IDs and all numeric results remain identical.

---

## 10. Five frozen scenarios

### 10.1 Scenario A — `SCN-A-USDA-PROTEIN-DELAY`

Overlay:

- `INB-USDA-PROTEIN-104` moves from W1 to W3;
- status changes `CONFIRMED → PROBABLE`;
- expected probability becomes `0.65`;
- the cached extraction contains only inbound ID, old week, new week, and status.

Ground truth:

- protein forecast: `9,000 lb/week`;
- starting protein: `30,000 lb`;
- conservative ends: `21,000`, `12,000`, `12,000`, `12,000 lb`;
- first strict minimum breach: W2, `12,000 / 9,000 = 1.3333… WOS < 1.5`;
- W2 target: `27,000 lb`; gap: `15,000 lb`;
- top action: `ACT-A-PURCHASE-PROTEIN-15000`, W2, `$0.85/lb`, `$12,750.00`;
- after W2 conservative end: `27,000 lb / 3.0 WOS`;
- fixed peer transfer and donor request are lower-ranked feasible alternatives;
- oversized purchase fails budget and frozen capacity; late purchase misses the breach; monitor is unsafe.

### 10.2 Scenario B — `SCN-B-SHORT-LIFE-PRODUCE`

Overlay:

- removes ordinary W1 produce inbound `INB-DONATION-PRODUCE-201`;
- activates the 20,000 lb, five-day offer;
- base refrigerated capacity remains `40,000 lb`.

Ground truth:

- no-action produce end is `1,000 lb` each week;
- full acceptance creates a `50,000 lb` refrigerated peak, `10,000 lb` overflow, and `6,000 lb` offer-expiry spoilage;
- exact feasible partial quantity is `10,000 lb`, because W1 and later refrigerated peak become exactly `40,000 lb`;
- partial action produces no incremental offer spoilage and ends each week at `11,000 lb / 0.7857 WOS`;
- `ACT-B-PARTIAL-PRODUCE-10000` ranks first;
- confirmed redirect and decline are lower-ranked feasible dispositions;
- full acceptance fails both `STORAGE_CAPACITY` and `USABLE_LIFE`.

### 10.3 Scenario C — `SCN-C-SNACK-MISMATCH`

Overlay:

- leaves the base protein inbound intact;
- reduces W1 dairy inbound to `3,000 lb`;
- activates the 12,000 lb snack offer and one named redirect destination.

Ground truth:

- protein falls below target after W1 but never below minimum;
- dairy remains at `1.0 WOS`, below its `1.5` target but above its `0.75` minimum;
- snacks begin far above their `1.5 WOS` target;
- offer mismatch priority is `79.0` and no competing shortage risk exists;
- full local acceptance adds 12,000 local pounds while horizon weighted coverage remains exactly unchanged;
- `ACT-C-REDIRECT-SNACKS-12000` ranks first, with Synthetic Peer North as the only named destination;
- decline ranks second; local acceptance is feasible but lower value and must say `Does not address a current priority gap`.

### 10.4 Scenario D — `SCN-D-BUDGET-TRADEOFF`

Overlay:

- applies Scenario A's protein delay;
- removes W1 dairy inbound;
- sets budget to `$13,000.00`;
- sets refrigerated capacity to `45,000 lb` for this scenario only.

Ground truth:

- dairy breaches in W1 at `0.5 WOS` with a `6,000 lb` target gap;
- protein breaches in W2 at `1.3333… WOS` with a `15,000 lb` target gap;
- dairy purchase costs `$9,600.00` and protein purchase costs `$12,750.00`;
- both are individually feasible, but `$22,350.00 > $13,000.00`;
- the locked formula ranks `ACT-D-PURCHASE-DAIRY-6000` first because it addresses the W1 breach and yields the larger normalized expected coverage gain;
- protein purchase remains a feasible close alternative;
- after the dairy action, `RISK-D-PROTEIN-W2` remains explicitly open.

This result is formula-derived. Do not tune policy weights or inputs to make protein win.

### 10.5 Scenario E — `SCN-E-DATA-CONFLICT`

Overlay:

- sets `INB-USDA-PROTEIN-104.expected_week_start`, `status`, and `arrival_probability` to null;
- activates one notice saying 10,000 lb on Aug 17 and one receiving note saying 6,000 lb on Aug 10;
- includes instruction-like untrusted text.

Ground truth:

- missing arrival week and status are blocking errors;
- quantity and arrival evidence conflict are blocking errors;
- instruction-like text is ignored and logged as a warning;
- output state is `ABSTAINED` with `RISK-E-DATA-QUALITY`;
- projection, action evaluation, ranking, approval, and simulated action are not run;
- required facts are named; nothing is imputed.

Scenario E is structurally schema-valid by design. Domain validation must still reject its decision state.

---

## 11. Validation layers and stable findings

### 11.1 Structural validation

Use JSON Schema Draft 2020-12 with local reference resolution. Startup must not fetch a remote schema. Unknown properties fail because normative schemas use `additionalProperties: false` wherever the payload is closed.

The loader must read every file under `BUILD_CONTEXT/schemas/`, pre-register it in an in-memory registry by its exact `$id` (`https://nourishops.local/schemas/...`), and resolve all `$ref` values only through that registry. HTTP(S) retrieval is disabled even though the IDs resemble URLs. A missing/duplicate `$id` or unresolved reference is `CONTRACT_ASSET_INVALID`; it never triggers a network request.

### 11.2 Referential validation

Require:

- unique IDs within every entity collection;
- every overlay mutation/removal to resolve one inbound;
- every enabled action, offer, and evidence ID to resolve once and belong to the selected scenario where applicable;
- every action subject to resolve when non-null;
- every evidence link to resolve;
- category/storage mappings to agree with policy unless action storage is `NONE`;
- versions to match the manifest.

### 11.3 Arithmetic and temporal validation

Require:

- 16 unique contiguous historical Mondays per category;
- all vector lengths exactly 16;
- the historical flow equation and continuity invariant within `0.01 lb`;
- current inventory equal the final historical ending value;
- exactly four ordered forecast Mondays;
- cost arithmetic within `$0.01`;
- explicit arrival week consistent with a plausible lead-time bucket under the relaxed rule in `04`;
- no negative input, negative ending inventory, `NaN`, or infinity;
- target WOS not below minimum;
- confirmed/probable status-probability consistency;
- legal action quantity bounds and increments.

### 11.4 Data-quality behavior

An `ERROR` in a decision-critical field produces one `DATA_QUALITY` risk and abstention. A warning remains visible and influences confidence only where `04` says so. The adapter must not repair, coerce, default, choose between conflicting sources, or drop an error record.

Scenario E's exact findings are frozen in its golden:

- `DQ-E-ARRIVAL-WEEK-CONFLICT`;
- `DQ-E-ARRIVAL-WEEK-MISSING`;
- `DQ-E-INBOUND-STATUS-MISSING`;
- `DQ-E-QUANTITY-CONFLICT`;
- warning `DQ-E-UNTRUSTED-INSTRUCTION-IGNORED`.

Validation messages in the UI may add plain-language context but must preserve finding ID, severity, field, source record IDs, observed values, and why the fact changes the decision.

---

## 12. Golden output contract

Each golden records:

- version and deterministic test clock;
- exact six-category forecast;
- ordered risks and primary risk;
- affected projections and cross-category coverage metrics;
- every active evaluated action, failures, exact raw score components, score, and rank;
- the one recommendation or explicit abstention;
- no-intervention, simple-rule, and agent comparisons where applicable;
- blocking findings;
- stable expected audit-event sequence;
- synthetic provenance.

Calculated decimals that binary JSON parsing could change are strings. Integer fixture facts may remain JSON integers. Golden tests parse derived decimal strings as Decimal and apply the `1e-24` tolerance in `04`/`06`; discrete facts and cent-quantized currency remain exact. The UI applies only the display rules in `01` and `04`.

Golden files are immutable test oracles. Normal implementation work may not rewrite them. A deliberate contract change requires a coordinated version bump across schema, data, scenario, decision rules, affected documents, and tests, with a written explanation.

`decision_status` is the terminal committed analysis state before any manager action. `audit_oracle` is the subsequent canonical test path in which the top recommendation is approved and its simulated action is applied; it is not a simultaneous state snapshot.

Golden derived decimals are expected outputs, never inputs to a later calculation. The engine must recompute from fixtures under `decimal-policy/1.0.0`; it must not feed a stored coverage, component, score, or confidence string back into another formula merely to mimic reference path-rounding.

For non-abstaining scenarios, each frozen comparison policy row includes the same decision fields: `action_id`, `first_minimum_breach_week_start`, `essential_categories_above_minimum_by_week`, `stockout_weeks`, `cost_usd`, `projected_expiry_spoilage_lb`, `constraint_evaluation_status`, and `hard_constraint_violation_codes`, in addition to scenario-specific trajectories and metrics. The essential count is the number of the five `essential_assortment = true` categories whose conservative end WOS is at or above minimum in that week. No intervention uses constraint status `NOT_APPLICABLE`; an applied feasible policy uses `PASSED`.

Scenario headline table:

| Scenario | Required result | Top action | Quantity | Cost |
|---|---|---|---:|---:|
| A | W2 protein breach; gap 15,000 lb | `ACT-A-PURCHASE-PROTEIN-15000` | 15,000 lb | $12,750 |
| B | Full offer unsafe; partial correct | `ACT-B-PARTIAL-PRODUCE-10000` | 10,000 lb | $0 |
| C | Snack offer does not address current priority gaps | `ACT-C-REDIRECT-SNACKS-12000` | 12,000 lb | $250 |
| D | One budget can fund only one of two purchases | `ACT-D-PURCHASE-DAIRY-6000` | 6,000 lb | $9,600 |
| E | Missing/conflicting facts | none — `ABSTAINED` | — | — |

---

## 13. Required implementation tests

At minimum, automate:

1. every JSON asset parses and validates against its named schema locally;
2. the manifest paths and record counts reconcile;
3. all 96 historical expanded records satisfy arithmetic and continuity;
4. the last-four-week forecasts equal all six frozen values;
5. base plus each overlay resolves without mutating base objects;
6. Scenario A's conservative/expected/status/capacity views remain distinct;
7. Scenario A purchase W3 capacity stress is `46,000 lb <= 50,000 lb`;
8. Scenario B partial quantity has a `40,000 lb` refrigerated peak and 11,000 lb ending produce;
9. Scenario B full acceptance fails with 50,000 lb peak and 6,000 lb offer spoilage;
10. Scenario C weighted coverage is unchanged by full snack acceptance;
11. Scenario C known-expiry snack offer is allocated before the `+∞` starting lot;
12. Scenario D applies both scenario-specific overrides and ranks dairy first without hiding the protein risk;
13. Scenario E passes structural schema validation, fails domain validation, ignores untrusted instructions, and never reaches ranking;
14. all five recomputed canonical outputs match their golden files;
15. repeated evaluation and offline/live modes produce identical numeric output and ordering;
16. reset creates a new run without altering fixture hashes or prior events.

Do not weaken a test or change an oracle to accommodate an implementation defect.

---

## 14. Deliberately simplified modeling choices

These choices are intentional and must be visible rather than “improved” during P0:

- one warehouse and category-level pounds only;
- one primary storage type per category;
- no pallets, cases, dimensions, zones, trucks, routes, agency allocation, or client demand;
- four-week moving-average operational distribution forecast;
- current inventory has no in-horizon expiry and sorts after known-expiry lots;
- no stochastic simulation despite a recorded seed;
- one staff-defined priority policy, not individualized or clinical nutrition optimization;
- fixed external peer opportunities, not network inventory access;
- closed catalog and exactly one recommendation;
- direct modeled costs only;
- no external action or transaction;
- no claim that a redirect succeeded outside the one-warehouse model;
- synthetic outcomes demonstrate deterministic workflow behavior, not real effectiveness.

If a future build needs richer data, create a new versioned contract. Do not silently reinterpret this one.
