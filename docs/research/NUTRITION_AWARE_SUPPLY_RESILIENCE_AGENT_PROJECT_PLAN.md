# Nutrition-Aware Supply Resilience Agent

## Hackathon Project Plan and Reference Document

**Working title:** Nutrition-Aware Supply Resilience Agent  
**Alternative product names:** NourishOps, SupplyGuard, Resilience Copilot  
**Hackathon:** AI Supply Chain Observatory Hackathon: Food Banks + AI  
**Primary user:** Food-bank supply planning or operations manager  
**Prototype mode:** Fully simulated, category-level food-bank data  
**Core principle:** Recommend actions; preserve human approval  

---

## 1. Executive summary

Food banks can possess substantial food inventory while still being unable to provide a useful, balanced assortment. They may have excess quantities of some foods while facing shortages of protein, produce, dairy, staple grains, or culturally relevant foods. Supply is also volatile: retail donations, USDA commodities, manufacturer donations, food drives, and purchased products arrive with different levels of predictability, shelf life, restrictions, and nutritional usefulness.

The Nutrition-Aware Supply Resilience Agent is a human-approved decision-support system that monitors category-level inventory, expected inbound supply, recent distribution, nutrition priorities, storage capacity, lead times, and purchasing budget. It identifies impending supply gaps and recommends the most feasible response:

- purchase a priority category;
- launch a targeted donor request;
- accept or decline a simulated donation offer;
- transfer or rebalance food between locations;
- accelerate distribution of a likely surplus;
- wait and monitor when no action is justified.

The agent does not attempt to optimize the entire food-bank ecosystem. The hackathon MVP closes one bounded decision loop:

> Detect a category-level supply risk, compare feasible responses, recommend an action with evidence and uncertainty, obtain manager approval, and show the expected effect in a simulation.

Because no real operational data are available, the prototype will use a transparent synthetic dataset. The data will represent one central food bank, six food categories, four supply sources, 16 weeks of history, four weeks of planned inbound supply, a small set of candidate interventions, and simple storage and budget constraints. Every simulated value, assumption, and result will be labeled as simulated.

The prototype will demonstrate functional behavior and decision quality under controlled scenarios. It will not claim that it has reduced hunger, delivered additional meals, saved actual money, or improved a real food bank's performance.

---

## 2. Alignment with the official hackathon prompt

The official prompt asks teams to create a solution using AI agents to substantially improve or transform food-bank supply chains in areas including accepting donations, purchasing, warehousing, allocating, packing, distributing, and delivering food.

This project directly addresses:

- **Accepting donations:** determine whether an offer fills a current priority or creates an avoidable surplus.
- **Purchasing:** recommend what category to purchase, how much, and when.
- **Warehousing:** account for dry, refrigerated, and frozen storage limits.
- **Allocating and distributing:** detect imbalance and recommend targeted movement or accelerated distribution.
- **Supply-chain effectiveness:** improve the availability of useful food rather than maximizing gross pounds alone.

The project also follows the deck's practical winning guidance:

- it solves a recognizable food-bank supply-chain problem;
- it uses an AI agent rather than presenting only a dashboard;
- it quantifies the problem and the simulated solution;
- it supports a clear live demonstration;
- it can be presented onsite by a team member;
- it separates working prototype claims from future real-world impact.

### Hackathon compliance checklist

| Hackathon expectation | Project response |
|---|---|
| AI-agent solution | Agent observes state, identifies risks, invokes analysis tools, proposes actions, checks constraints, and records approved outcomes. |
| Food-bank supply-chain relevance | Focused on supply planning, purchasing, donation acceptance, storage, and distribution decisions. |
| Real operational problem | Volatile supply and mismatched food categories can leave important needs unfilled despite adequate total pounds. |
| Quantified problem and solution | Uses weeks of supply, weighted fill rate, gap size, cost, spoilage risk, feasibility, and simulated scenario comparisons. |
| Strong demo | A supply shock is introduced, the agent recommends a response, the manager approves it, and projected metrics update. |
| Human objectives | Nutrition priorities and operational constraints are staff-defined; consequential actions require approval. |
| Honest evaluation | All data and results are clearly marked as synthetic or simulated. |

---

## 3. Problem definition

### 3.1 The operational problem

Food-bank supply is not equivalent to a conventional retail replenishment system. Important inputs are uncertain and partially controllable:

- donations may arrive with little notice;
- donated categories may not match current community needs;
- USDA supply may change or arrive unpredictably;
- purchased food is more controllable but consumes limited flexible funds;
- fresh and refrigerated items have short usable lives;
- storage and transportation capacity constrain what can be accepted;
- partner agencies differ in their ability to receive and distribute food;
- historical distributions reflect both community need and past supply limitations.

Staff therefore face a recurring decision:

> Given what is currently available, what is expected to arrive, what has recently been distributed, and what resources remain, which action best protects the food bank's priority assortment over the next several weeks?

This decision is frequently fragmented across inventory reports, purchase records, donation information, emails, spreadsheets, staff knowledge, and changing operational conditions.

### 3.2 Why total pounds are insufficient

A warehouse may appear well supplied in aggregate while facing a serious category imbalance. For example:

- cereal and canned vegetables may represent many pounds but cannot replace protein;
- large quantities of produce may spoil before distribution capacity catches up;
- a dairy shortage may be hidden by excess shelf-stable inventory;
- a donation may be free but have high pickup, handling, refrigeration, or spoilage costs;
- agencies may request less of an unavailable category, causing historical shipments to understate true need.

The project therefore evaluates supply in terms of **usable category coverage**, not only total weight.

### 3.3 Root problem addressed by the MVP

The MVP addresses three connected failures:

1. **Visibility failure:** staff cannot quickly see which categories are likely to become constrained.
2. **Decision fragmentation:** possible responses are considered separately rather than compared consistently.
3. **Actionability failure:** reports describe inventory but do not generate a reviewable next action.

### 3.4 Formal problem statement

> Food-bank supply planners need to protect a staff-defined minimum assortment under volatile inbound supply, limited purchasing funds, storage constraints, and uncertain future distribution. Current reports may show inventory but do not consistently identify category-level risk, compare alternative interventions, explain tradeoffs, and produce an auditable human-approved action queue.

---

## 4. Project thesis and value proposition

### One-sentence thesis

> An evidence-linked AI agent can convert fragmented supply signals into timely, constrained, nutrition-aware recommendations while leaving purchasing, donation acceptance, and allocation authority with food-bank staff.

### User value proposition

For a supply planning manager who must decide what food to purchase, request, accept, or rebalance, the agent provides:

- a prioritized risk queue;
- evidence for every identified gap;
- feasible alternatives rather than a single unexplained answer;
- expected effects on category coverage, budget, storage, and spoilage;
- explicit uncertainty and missing information;
- a review-and-approval workflow;
- an audit trail of recommendations and overrides.

### Mission value proposition

The intended mission effect is to increase the consistency and usefulness of available food. The prototype measures intermediate operational outcomes rather than claiming direct reductions in hunger.

---

## 5. End goal

### Hackathon end goal

Deliver a working prototype that can:

1. load a clearly labeled synthetic food-bank scenario;
2. calculate category-level supply coverage;
3. identify a likely shortage or surplus within a four-week horizon;
4. explain the evidence and uncertainty;
5. generate at least three possible actions;
6. eliminate actions that violate budget, storage, lead-time, or acceptance constraints;
7. rank the remaining actions;
8. present a manager with a recommendation and alternatives;
9. require approval before committing the simulated action;
10. update projected outcomes and preserve an audit log.

### Longer-term end goal

In a real deployment, the agent would operate in read-only shadow mode against recurring exports from inventory, purchasing, donation, and distribution systems. After validation, approved recommendations could create tasks or draft transactions in existing systems. The long-term product would not replace the food bank's ERP, warehouse management system, or human decision owners.

---

## 6. Scope

### 6.1 MVP scope

The MVP models:

- one regional food bank;
- one central warehouse;
- six food categories;
- weekly planning periods;
- 16 historical weeks;
- a four-week planning horizon;
- four source types;
- dry, refrigerated, and frozen storage capacity;
- a single flexible purchasing budget;
- a small candidate-action catalog;
- staff-defined nutrition and coverage priorities;
- simulated supply shocks and donation offers;
- one manager approval queue.

### 6.2 Recommended food categories

Use six understandable categories:

1. **Protein:** canned meat, beans, nut butter, eggs, or equivalent products.
2. **Produce:** fresh, frozen, or canned fruits and vegetables.
3. **Dairy:** milk, shelf-stable milk, cheese, yogurt, or substitutes.
4. **Grains:** rice, pasta, oats, cereal, bread, and flour.
5. **Staples and mixed meals:** soups, canned meals, oil, sauces, and shelf-stable meal components.
6. **Snacks and discretionary items:** lower-priority donated items used to demonstrate category imbalance.

These categories are deliberately broad. The MVP does not require UPC-level nutrition classification.

### 6.3 Supply sources

Model only four source types:

- retail or community donations;
- USDA commodities;
- purchased product;
- transfers from another food bank or partner location.

### 6.4 Actions available to the agent

The agent may recommend:

- **Purchase:** buy a specific category from a simulated vendor.
- **Targeted donor request:** initiate outreach for a specific category and quantity range.
- **Transfer:** request product from a simulated peer location.
- **Accept donation:** accept a simulated offer when it fills a gap and is feasible.
- **Accept partially:** accept only the useful or feasible portion of an offer.
- **Decline or redirect:** reject a poor-fit offer or recommend another destination.
- **Accelerate distribution:** prioritize an oversupplied, short-life category.
- **Monitor:** take no immediate action when uncertainty is too high or existing inbound supply is sufficient.

### 6.5 Explicit non-goals

Do not build the following during the hackathon:

- individual household demand forecasting;
- medical or personalized nutrition recommendations;
- client eligibility, fraud, or deservingness scoring;
- full truck-routing optimization;
- SKU-, lot-, pallet-, or case-level warehouse management;
- automated food-safety decisions;
- autonomous purchase orders or payments;
- autonomous acceptance or rejection of donations;
- optimization across hundreds of partner agencies;
- real social-media scraping or donor outreach;
- integration with Primarius, Link2Feed, MealConnect, or other production systems;
- claims about actual meals delivered or hunger reduced.

These boundaries protect feasibility and make the demo more credible.

---

## 7. Primary users and decision ownership

### Primary user: supply planning or operations manager

Responsibilities represented in the prototype:

- reviews category risks;
- validates assumptions;
- compares recommended actions;
- approves, edits, postpones, or rejects a recommendation;
- records an override reason.

### Secondary users

- **Buyer or procurement lead:** reviews purchase recommendations and budget impact.
- **Sourcing or donor-relations lead:** receives targeted category requests.
- **Warehouse lead:** validates capacity and handling constraints.
- **Agency-relations lead:** validates distribution or transfer feasibility.
- **Leadership:** views aggregate resilience metrics and unresolved risks.

### Human authority

The following decisions always remain human-approved:

- financial commitments;
- acceptance or rejection of a donation;
- food-safety disposition;
- transfer commitments;
- allocation of scarce food;
- external outreach.

---

## 8. What makes the system agentic

The project should not describe a forecast or dashboard as an agent. The system is agentic because it follows a goal-directed, multi-step loop and can use different tools depending on the situation.

### Agent objective

> Maintain staff-defined minimum category coverage over the planning horizon while respecting budget, storage, shelf-life, lead-time, and human-approval constraints.

### Agent loop

1. **Observe:** read the current scenario state and identify new or changed information.
2. **Validate:** check data completeness, units, arithmetic consistency, and stale records.
3. **Forecast:** estimate weekly distribution and expected inbound supply by category.
4. **Diagnose:** identify shortages, surpluses, volatility, and capacity risks.
5. **Plan:** generate candidate responses using available simulated tools.
6. **Constrain:** remove options that violate hard rules.
7. **Compare:** estimate the impact, cost, lead time, and confidence of each feasible action.
8. **Explain:** provide evidence, assumptions, alternatives, and uncertainty.
9. **Escalate:** ask for missing information or abstain when no safe recommendation exists.
10. **Request approval:** place the proposed action in the manager queue.
11. **Learn:** record approval, override, and simulated outcome for later evaluation.

### Appropriate division of labor

| Component | Responsibility |
|---|---|
| LLM agent | Interprets the decision goal, selects tools, synthesizes evidence, generates explanations, asks for missing information, and creates the review package. |
| Deterministic calculations | Inventory arithmetic, weeks of supply, rolling averages, budget checks, capacity checks, lead-time checks, and scoring. |
| Simple forecasting model | Estimates near-term weekly distribution and uncertainty. |
| Rules engine | Enforces hard constraints and prevents unauthorized actions. |
| Human manager | Makes the final consequential decision. |

Do not ask the LLM to perform arithmetic that can be calculated deterministically.

---

## 9. End-to-end workflow

### Step 1: Load scenario

The user selects a synthetic scenario such as “USDA protein delay” or “unexpected produce donation.” The interface displays a visible banner:

> Demonstration environment — all organizations, quantities, costs, and outcomes are synthetic.

### Step 2: Validate the data

The system checks:

- missing categories or weeks;
- negative quantities;
- inconsistent beginning and ending inventory;
- duplicate inbound records;
- storage assignments;
- quantities exceeding physical capacity;
- candidate actions missing cost, lead time, or availability.

If required information is absent, the agent reports what is missing and either requests a simulated value or abstains.

### Step 3: Establish the baseline

For each category, calculate:

- current usable inventory;
- average weekly distribution;
- forecast weekly distribution;
- confirmed inbound supply;
- expected but uncertain inbound supply;
- weeks of supply;
- projected ending inventory by week;
- minimum and target coverage;
- storage utilization;
- recent spoilage;
- source concentration.

### Step 4: Detect risks

Examples:

- protein falls below 1.5 weeks of supply in week two;
- produce exceeds refrigerated capacity in week one;
- dairy depends on one delayed source;
- snacks are oversupplied while staples are below target;
- an offered donation is unlikely to be distributed before its usable-life limit.

### Step 5: Generate candidate actions

For a protein shortage, the agent might generate:

- purchase 5,000 pounds of canned beans;
- request 4,000–6,000 pounds of shelf-stable protein from targeted donors;
- request a 3,000-pound transfer from a peer food bank;
- accept an available mixed-protein donation;
- take no action and monitor the delayed USDA shipment.

### Step 6: Apply constraints

Hard constraints include:

- purchase cost cannot exceed remaining budget;
- arrival must occur before the projected shortage;
- storage utilization cannot exceed capacity;
- unacceptable food types cannot be recommended;
- an action requiring refrigeration must have refrigerated capacity;
- an uncertain donation cannot be represented as confirmed inventory;
- no external or financial action can be automatically executed.

### Step 7: Compare actions

For each feasible action, calculate:

- projected gap reduction;
- nutrition-priority contribution;
- cost;
- lead time;
- storage effect;
- spoilage exposure;
- expected usable quantity;
- confidence;
- operational burden.

### Step 8: Present the recommendation

The manager sees:

- the detected risk;
- the recommended response;
- why it ranks first;
- source records used;
- assumptions;
- confidence level;
- hard constraints satisfied;
- alternatives and tradeoffs;
- expected metric changes;
- missing information;
- approve, edit, reject, or defer controls.

### Step 9: Simulate approval and outcome

Once approved, the system applies the simulated action to the planning state and recalculates the next four weeks. The interface shows “before” and “after” values without presenting them as real-world results.

### Step 10: Record the audit trail

Store:

- timestamp;
- scenario and data version;
- risk identified;
- candidate actions considered;
- constraints applied;
- recommendation;
- model or rule version;
- manager action;
- override reason;
- simulated outcome.

---

## 10. Simulation strategy

### 10.1 Simulation philosophy

The synthetic data should be plausible, understandable, internally consistent, and deliberately limited. It should not attempt to imitate an entire real food bank.

The simulation is used to demonstrate:

- whether the workflow functions;
- whether the agent detects known synthetic risks;
- whether recommendations obey constraints;
- how different actions change simulated outcomes;
- how the agent responds to uncertainty and missing information.

It cannot demonstrate:

- actual donation conversion;
- actual food-bank savings;
- real household demand;
- real staff adoption;
- causal mission impact.

### 10.2 Recommended simulation size

Use:

- 16 historical weeks;
- 4 forecast weeks;
- 6 food categories;
- 4 supply sources;
- 3 storage types;
- 5–8 candidate actions per scenario;
- 5 core scenarios;
- approximately 100–150 weekly category rows.

This is large enough to appear operationally meaningful but small enough to inspect manually.

### 10.3 Synthetic data generation rules

For every category:

1. Define a baseline weekly distribution level.
2. Add mild weekly variation, such as ±10%.
3. Define the normal share of supply from each source.
4. Add small inbound variation.
5. Calculate inventory deterministically.
6. Add spoilage only to plausible short-life categories.
7. Introduce one explicit shock per scenario.
8. Ensure the shock has at least two feasible responses and one infeasible response.

Use fixed random seeds so every demo run produces the same data.

### 10.4 Suggested baseline values

Illustrative weekly distribution ranges:

| Category | Typical weekly distribution | Minimum coverage | Target coverage | Storage type |
|---|---:|---:|---:|---|
| Protein | 8,000–10,000 lb | 1.5 weeks | 3.0 weeks | Dry/frozen |
| Produce | 12,000–16,000 lb | 0.5 weeks | 1.0 week | Refrigerated |
| Dairy | 5,000–7,000 lb | 0.75 weeks | 1.5 weeks | Refrigerated |
| Grains | 9,000–12,000 lb | 2.0 weeks | 4.0 weeks | Dry |
| Staples/mixed meals | 8,000–11,000 lb | 2.0 weeks | 4.0 weeks | Dry |
| Snacks/discretionary | 3,000–6,000 lb | 0.5 weeks | 1.5 weeks | Dry |

These are demonstration assumptions, not assertions about a real food bank.

### 10.5 Storage model

Keep storage modeling simple:

- dry capacity;
- refrigerated capacity;
- frozen capacity.

Each category is assigned a primary storage type. Capacity is measured in pounds. The simulator checks projected capacity by week; it does not model pallet positions, dimensions, zones, or handling equipment.

### 10.6 Budget model

Use one four-week flexible purchasing budget. Each purchase candidate includes:

- category;
- available quantity;
- price per pound;
- lead time;
- usable yield;
- minimum order quantity.

No grant restrictions, invoice terms, taxes, or complex procurement rules are required for the MVP.

### 10.7 Uncertainty model

Use three inbound statuses:

- **Confirmed:** included fully in the base projection.
- **Probable:** included only in an optimistic scenario or multiplied by an expected-arrival probability.
- **Unconfirmed:** excluded from the base projection.

This prevents the prototype from requiring complicated probability models while still demonstrating uncertainty-aware decisions.

### 10.8 Nutrition model

Nutrition awareness should be staff-defined and transparent. Assign each category:

- a priority weight from 1 to 5;
- minimum weeks of supply;
- target weeks of supply;
- optional “essential assortment” flag.

Do not claim clinical nutrition optimization. The system protects a staff-defined assortment policy.

---

## 11. Synthetic data schema

CSV files or equivalent SQLite tables are sufficient.

### 11.1 `weekly_category_flow`

| Field | Description |
|---|---|
| week | Week start date or sequential week number |
| category | One of the six food categories |
| beginning_inventory_lb | Beginning usable inventory |
| donated_inbound_lb | Donation receipts |
| usda_inbound_lb | USDA receipts |
| purchased_inbound_lb | Purchased receipts |
| transfer_inbound_lb | Inter-location transfers |
| distributed_lb | Quantity distributed |
| spoilage_lb | Quantity lost or written off |
| ending_inventory_lb | Calculated ending inventory |

Validation equation:

`ending inventory = beginning inventory + all inbound - distributed - spoilage`

### 11.2 `planned_inbound`

| Field | Description |
|---|---|
| inbound_id | Stable synthetic identifier |
| expected_week | Expected arrival week |
| category | Food category |
| quantity_lb | Expected quantity |
| source_type | Donation, USDA, purchase, or transfer |
| status | Confirmed, probable, or unconfirmed |
| probability | Optional expected-arrival probability |
| storage_type | Dry, refrigerated, or frozen |
| usable_life_days | Simplified remaining usable life |

### 11.3 `category_policy`

| Field | Description |
|---|---|
| category | Food category |
| priority_weight | Integer from 1 to 5 |
| essential_flag | Whether the category is part of the minimum assortment |
| minimum_weeks_supply | Risk threshold |
| target_weeks_supply | Desired coverage |
| storage_type | Primary storage requirement |
| default_usable_yield | Expected usable portion |

### 11.4 `resource_constraints`

| Field | Description |
|---|---|
| planning_budget_usd | Flexible budget for the horizon |
| dry_capacity_lb | Maximum dry inventory |
| refrigerated_capacity_lb | Maximum refrigerated inventory |
| frozen_capacity_lb | Maximum frozen inventory |
| minimum_pickup_lb | Optional operational threshold |
| planning_horizon_weeks | Four for the MVP |

### 11.5 `candidate_action`

| Field | Description |
|---|---|
| action_id | Stable synthetic identifier |
| action_type | Purchase, donor request, transfer, offer, accelerate, or monitor |
| category | Category affected |
| maximum_quantity_lb | Maximum available quantity |
| expected_usable_yield | Percentage expected to be usable |
| cost_usd | Direct simulated cost |
| lead_time_days | Time before availability |
| success_probability | Used for unconfirmed actions |
| storage_type | Required storage |
| operational_burden | Low, medium, or high |
| source_evidence | Synthetic evidence text or document reference |

### 11.6 `decision_log`

| Field | Description |
|---|---|
| decision_id | Stable identifier |
| timestamp | Decision time |
| scenario_id | Synthetic scenario |
| risk_id | Identified risk |
| recommended_action_id | Top recommendation |
| alternatives | Other feasible actions |
| confidence | Low, medium, or high |
| manager_decision | Approved, edited, rejected, or deferred |
| override_reason | Human explanation |
| simulated_outcome | Projected result after decision |

---

## 12. Core calculations

### 12.1 Forecast weekly distribution

For hackathon simplicity, use either:

- a four-week moving average; or
- exponentially weighted moving average.

The moving average is easier to explain and sufficient for the demo.

`forecast weekly distribution = mean of the previous four comparable weeks`

Optionally apply a small scenario multiplier for a simulated seasonal increase.

### 12.2 Weeks of supply

`weeks of supply = usable available inventory / forecast weekly distribution`

Calculate both current weeks of supply and projected weeks of supply for each future week.

### 12.3 Projected weekly inventory

`projected ending inventory = projected beginning inventory + confirmed inbound + probability-adjusted probable inbound - forecast distribution - expected spoilage`

Show the manager both:

- a conservative view excluding probable inbound; and
- an expected view using probability-adjusted inbound.

### 12.4 Category gap

`target inventory = target weeks of supply × forecast weekly distribution`

`gap quantity = max(0, target inventory - projected available inventory)`

### 12.5 Nutrition-weighted coverage

For each category:

`coverage ratio = min(1, projected weeks of supply / target weeks of supply)`

Then:

`weighted coverage = sum(priority weight × coverage ratio) / sum(priority weights)`

This metric rewards balanced category coverage without pretending to calculate individual nutrition outcomes.

### 12.6 Expected usable quantity

`expected usable quantity = offered quantity × usable yield × success probability`

For confirmed purchases or transfers, success probability may be 1.0. For donor requests, use a lower simulated probability and clearly label it as an assumption.

### 12.7 Action score

Use a transparent normalized score rather than a black-box model:

`action score = gap reduction benefit + nutrition priority benefit + timing benefit - cost penalty - spoilage risk - operational burden`

A possible weighting for the MVP:

- 35% projected gap reduction;
- 25% nutrition-priority contribution;
- 15% arrival before shortage;
- 10% confidence or reliability;
- 10% cost efficiency;
- 5% operational burden and spoilage exposure.

Hard constraints are applied before scoring. A high score can never override a safety, capacity, budget, or authorization rule.

---

## 13. Core simulated scenarios

### Scenario A: USDA protein shipment delay — primary demo scenario

**Setup:** A confirmed 10,000-pound protein shipment changes to probable and is delayed by two weeks.

**Expected agent behavior:**

- identify that protein will fall below minimum coverage;
- quantify the gap and timing;
- compare purchase, transfer, targeted donor request, and monitoring;
- reject a slow or oversized option;
- recommend a blended or single feasible action;
- show budget and coverage impact;
- request manager approval.

**Why this is the best main demo:** It is easy to understand, directly connected to supply resilience, and provides multiple meaningful alternatives.

### Scenario B: Large short-life produce offer

**Setup:** A donor offers 20,000 pounds of produce with five days of usable life, but refrigerated capacity and expected distribution are limited.

**Expected behavior:** Recommend partial acceptance, accelerated distribution, redirection, or decline rather than accepting all free food.

### Scenario C: Donation mismatch

**Setup:** Snacks are oversupplied while protein and dairy are below target. A new snack donation is offered.

**Expected behavior:** Explain why additional pounds do not necessarily improve mission value and recommend decline, redirect, or donor conversion to a priority category.

### Scenario D: Purchasing budget constraint

**Setup:** Protein and dairy are both below target but the budget can fully address only one.

**Expected behavior:** Compare weighted coverage, lead time, source reliability, and partial interventions; expose the tradeoff for human approval.

### Scenario E: Missing or conflicting data

**Setup:** A planned inbound quantity lacks an arrival status or a donation offer lacks usable life.

**Expected behavior:** Ask for the missing information or abstain rather than fabricating a confident recommendation.

### Optional stretch scenario: Refrigeration outage

Use only if the core prototype is complete. The agent reevaluates refrigerated inventory and recommends accelerated distribution or transfer. Do not add complex routing.

---

## 14. Functional requirements

### Must-have requirements

1. Load at least five deterministic synthetic scenarios.
2. Display a simulation disclaimer at all times.
3. Validate input arithmetic and required fields.
4. Calculate current and projected category coverage.
5. Detect minimum-threshold violations.
6. Generate at least three candidate actions for the main scenario.
7. enforce budget, capacity, lead-time, and authorization constraints.
8. Show evidence and assumptions for recommendations.
9. Display at least one alternative action.
10. Support approve, edit, reject, and defer decisions.
11. Recalculate projected metrics after a simulated approval.
12. Preserve a decision and override log.

### Should-have requirements

- conservative and expected projections;
- scenario comparison;
- confidence labels;
- a “why not?” explanation for rejected actions;
- downloadable decision summary;
- adjustable category priorities and target coverage;
- before-and-after charts.

### Could-have requirements

- natural-language manager questions;
- upload of a synthetic CSV;
- generated targeted donor brief;
- multi-location transfer scenario;
- notifications for unresolved risks;
- scenario authoring interface.

### Will-not-have requirements

- production integrations;
- autonomous external actions;
- real PII;
- real donor or client information;
- full route planning;
- clinically validated nutrition recommendations.

---

## 15. User experience and screens

### Screen 1: Resilience overview

Show:

- simulation banner;
- category risk cards;
- weighted coverage;
- total pounds as secondary context;
- budget remaining;
- storage utilization;
- unresolved recommendations;
- four-week risk timeline.

Avoid making the homepage a generic dashboard. Every risk card should open an actionable decision.

### Screen 2: Category risk detail

Show:

- historical and projected inventory;
- minimum and target coverage lines;
- inbound sources and confidence;
- forecast distribution;
- gap quantity and expected week;
- source concentration;
- evidence records.

### Screen 3: Recommendation review

Show:

- recommended action;
- expected quantity and timing;
- projected effect;
- cost and capacity effect;
- assumptions;
- confidence;
- constraints passed;
- alternative actions;
- reasons other actions were rejected;
- approve, edit, reject, and defer buttons.

### Screen 4: Scenario comparison

Compare:

- no action;
- simple baseline rule;
- agent recommendation;
- manager-edited action.

Show category coverage, cost, projected spoilage, and constraint violations.

### Screen 5: Audit log

Show each recommendation, evidence, version, manager decision, override, and simulated outcome.

---

## 16. Technical architecture

### Recommended hackathon stack

Use a simple stack that prioritizes a reliable demo:

- **Frontend:** Streamlit for fastest development, or React if the team already has a reusable interface.
- **Backend:** Python.
- **Data:** CSV files loaded into pandas and optionally SQLite for logs.
- **Forecasting:** moving average implemented in Python.
- **Constraint and scoring engine:** deterministic Python functions.
- **LLM:** agent orchestration, explanation, tool selection, and missing-information handling.
- **Charts:** Plotly or native frontend charts.
- **Deployment:** local laptop first; lightweight cloud deployment only after the offline demo works.

### Logical architecture

```text
Synthetic scenario files
        |
        v
Data validation and normalization
        |
        v
Forecast + inventory projection tools
        |
        v
Risk and gap detection
        |
        v
Agent orchestrator
   |         |          |
   v         v          v
Action   Constraint   Impact
catalog    checker    simulator
   \         |          /
        Recommendation
              |
              v
       Human approval UI
              |
              v
     Simulated outcome + audit log
```

### Agent tools

Expose narrow deterministic tools such as:

- `validate_scenario()`
- `forecast_distribution(category, horizon)`
- `project_inventory(category, scenario)`
- `detect_supply_risks()`
- `list_candidate_actions(category, gap)`
- `check_action_constraints(action)`
- `simulate_action_impact(action)`
- `rank_feasible_actions(actions)`
- `record_manager_decision()`

The agent should cite returned tool data in its explanation. It should not invent quantities or actions outside the action catalog.

### Reliability behavior

- Use structured outputs for recommendations.
- Validate every LLM response against a schema.
- Recalculate all quantities server-side.
- Treat tool results as authoritative for arithmetic.
- Require source IDs for evidence claims.
- Reject an agent response that proposes an unavailable action.
- Provide a deterministic fallback recommendation view if the LLM is unavailable.

---

## 17. Recommendation output schema

Each recommendation should contain:

```json
{
  "risk_id": "RISK-PROTEIN-W18",
  "category": "Protein",
  "risk_summary": "Projected to fall below 1.5 weeks of supply in week 2",
  "recommended_action_id": "ACT-PURCHASE-BEANS-01",
  "recommended_quantity_lb": 5000,
  "expected_arrival_week": 2,
  "expected_gap_reduction_lb": 5000,
  "cost_usd": 4250,
  "confidence": "high",
  "constraints_passed": [
    "budget",
    "dry_storage",
    "lead_time",
    "accepted_category"
  ],
  "assumptions": [
    "Four-week moving-average distribution",
    "Delayed USDA shipment excluded from conservative projection"
  ],
  "alternatives": [
    "ACT-TRANSFER-PROTEIN-02",
    "ACT-DONOR-REQUEST-PROTEIN-03"
  ],
  "requires_human_approval": true,
  "source_ids": [
    "FLOW-W14-W17-PROTEIN",
    "INBOUND-USDA-104",
    "POLICY-PROTEIN"
  ]
}
```

---

## 18. Metrics and evaluation

### 18.1 Evaluation principle

Measure the prototype against known synthetic ground truth. Separate system correctness, decision quality, operational effect, and future field metrics.

### 18.2 Data and system correctness

| Metric | Definition | MVP target |
|---|---|---:|
| Inventory arithmetic accuracy | Correct ending-inventory calculations | 100% |
| Constraint enforcement | Infeasible actions correctly blocked | 100% on test scenarios |
| Evidence coverage | Recommendations containing source IDs | 100% |
| Unsupported numeric claims | Numbers not produced by deterministic tools | 0 |
| Scenario reproducibility | Same inputs produce same calculated results | 100% |

### 18.3 Forecast and risk-detection metrics

| Metric | Definition | Use |
|---|---|---|
| WAPE or MAE | Error on held-out synthetic weeks | Demonstrates basic forecast behavior |
| Gap-detection recall | Known synthetic shortages detected | Avoid missed risks |
| Gap-detection precision | Flagged risks that are true synthetic risks | Avoid alert overload |
| Warning lead time | Weeks between alert and threshold breach | Demonstrates actionability |

Do not overemphasize forecast accuracy. The core value is the decision workflow.

### 18.4 Recommendation-quality metrics

| Metric | Definition |
|---|---|
| Feasible recommendation rate | Top recommendations satisfying all hard constraints |
| Expected gap reduction | Synthetic shortage reduced by the approved action |
| Nutrition-weighted coverage | Improvement in weighted category coverage |
| Budget adherence | Recommendations staying within simulated budget |
| Capacity adherence | Recommendations staying within storage limits |
| Abstention correctness | Missing-data cases where the agent appropriately asks or abstains |
| Alternative quality | Whether at least one feasible alternative is presented |

### 18.5 Simulated operational metrics

- category stockout weeks;
- percentage of essential categories above minimum coverage;
- weighted coverage score;
- projected spoilage pounds;
- purchase cost;
- cost per expected usable pound;
- excess inventory above target;
- source concentration;
- number of unresolved risks;
- simulated time to decision.

### 18.6 Human-in-the-loop metrics

For a hackathon usability test with teammates or volunteers:

- recommendation approval rate;
- override rate and reason;
- time required to understand a risk;
- time required to select an action;
- explanation usefulness rating;
- trust calibration: whether users accept high-confidence recommendations and question low-confidence recommendations appropriately.

These testers are evaluating interface usability, not food-bank effectiveness.

### 18.7 Future real-world pilot metrics

Only present these as future measures:

- stockout days by category;
- order fill or cut rate;
- emergency purchases;
- purchase cost per usable pound;
- donation acceptance and decline reasons;
- percentage of incoming food in priority categories;
- spoilage by category and stage;
- staff planning hours;
- recommendation acceptance and override rate;
- partner-agency category fulfillment;
- usable food distributed.

Do not equate pounds with meals consumed or hunger reduced without a valid study.

---

## 19. Evaluation design for simulated data

### Baseline comparison

Compare three policies:

1. **No intervention:** continue using confirmed inbound only.
2. **Simple reorder rule:** purchase when a category falls below its minimum threshold.
3. **Agent policy:** compare purchase, donor request, transfer, acceptance, acceleration, and monitoring under constraints.

This shows whether the agent adds value beyond a dashboard or simple spreadsheet rule.

### Test procedure

1. Generate a fixed baseline dataset.
2. Hold back the final four historical weeks for forecast testing.
3. Inject a known scenario shock.
4. Run all three policies from the same starting state.
5. Compare weighted coverage, stockout weeks, cost, spoilage, and constraint violations.
6. Inspect the agent's evidence and explanations.
7. Run missing-data and adversarial cases.

### Ground-truth scenario labels

For each scenario, define in advance:

- which category is at risk;
- when the risk begins;
- which actions are feasible;
- which actions violate constraints;
- at least one acceptable recommendation;
- conditions under which the agent should abstain.

This prevents evaluating the system using subjective post-hoc judgments.

### Red-team cases

- negative inventory value;
- duplicated shipment;
- donation quantity with wrong units;
- “free” offer that exceeds refrigerated capacity;
- purchase arriving after the stockout;
- unconfirmed donation represented as guaranteed;
- conflicting target and minimum thresholds;
- no feasible action;
- prompt-injection text inside a simulated email or offer;
- request to bypass manager approval.

---

## 20. Demo plan

### Recommended 4–5 minute demonstration

**0:00–0:30 — Establish the problem**  
Show that total inventory appears healthy while protein coverage is at risk.

**0:30–1:00 — Introduce the shock**  
Change a USDA protein shipment from confirmed to delayed/probable.

**1:00–1:45 — Agent investigation**  
The agent validates the state, projects inventory, and identifies the week-two protein gap.

**1:45–2:45 — Recommendation**  
Show the recommended purchase or transfer, two alternatives, evidence, confidence, budget, storage, and rejected options.

**2:45–3:30 — Human decision**  
The manager edits or approves the action. Demonstrate that no purchase or outreach occurs without approval.

**3:30–4:15 — Simulated effect**  
Compare no action, simple reorder, and the approved agent plan. Show improved protein coverage without capacity or budget violations.

**4:15–5:00 — Trust and future path**  
Open the audit log and briefly explain how the same system could run in shadow mode on real weekly exports.

### Backup demo

Prepare:

- a locally runnable application;
- fixed local scenario files;
- screenshots or a short recording only as backup;
- no dependency on live scraping or third-party production systems;
- a deterministic fallback if the LLM call fails.

---

## 21. Pitch narrative

### Core story

> Food banks do not only face a shortage of pounds. They face uncertainty about whether the right categories will be available when needed. Our agent turns category-level supply signals into human-approved actions that protect a useful assortment.

### Suggested deck structure

1. **Mission problem:** plenty in aggregate can still hide a critical food-category gap.
2. **Operational decision:** staff must decide whether to purchase, request, accept, transfer, or wait.
3. **Why current tools are insufficient:** reports show state; they do not close the decision loop.
4. **Solution:** Nutrition-Aware Supply Resilience Agent.
5. **How it works:** observe, forecast, diagnose, plan, constrain, approve, learn.
6. **Live demonstration:** USDA protein-delay scenario.
7. **Evaluation:** synthetic ground truth, baseline comparison, constraint compliance, and honest limitations.
8. **Deployment path:** synthetic demo → historical replay → read-only shadow mode → bounded approved action.
9. **Vision:** a more resilient food supply that optimizes usable category coverage rather than gross pounds alone.

### Claims to make

- The prototype detects synthetic category gaps.
- It compares multiple action types.
- It obeys simulated constraints.
- It provides evidence and uncertainty.
- It preserves human approval.
- It improves simulated category coverage relative to defined baselines, if the experiment shows that result.

### Claims not to make

- “We reduced hunger.”
- “We delivered additional meals.”
- “Food banks currently waste X% because they lack AI,” unless supported by a valid source.
- “Our forecast is production-ready.”
- “The agent makes food-safety decisions.”
- “The simulated savings represent actual savings.”
- “All food banks have this exact workflow.”

---

## 22. Implementation backlog

### Priority 0: Must work before presentation

- synthetic data generator with a fixed seed;
- five saved scenarios;
- category policy configuration;
- input validation;
- inventory projection;
- weeks-of-supply calculation;
- threshold risk detection;
- candidate action catalog;
- hard constraint checker;
- impact simulator;
- recommendation view;
- human approval flow;
- decision log;
- offline/local demo reliability.

### Priority 1: Strong differentiators

- LLM tool orchestration;
- evidence-linked explanation;
- alternatives and “why not” explanations;
- conservative versus expected projection;
- no-action versus baseline-rule versus agent comparison;
- missing-data abstention.

### Priority 2: Polish

- scenario selector;
- editable category priorities;
- clear visual risk timeline;
- download decision summary;
- explanatory tooltips;
- professional naming and visual identity.

### Priority 3: Stretch only

- multi-location transfers;
- natural-language scenario creation;
- targeted donor outreach draft;
- outage scenario;
- recurring alert simulation.

Do not begin Priority 3 until the end-to-end primary demo works reliably.

---

## 23. Hackathon execution plan

### Before kickoff

- agree on the problem statement and scope boundary;
- select Streamlit or React;
- assign team roles;
- prepare the synthetic schema;
- predefine the five scenarios and their expected answers;
- collect authoritative background sources;
- prepare a one-minute problem explanation.

### Day 1: Foundation

- generate and inspect the synthetic baseline data;
- implement validation and inventory calculations;
- implement coverage and risk metrics;
- build the overview and category-detail screens;
- confirm that the primary scenario produces the intended risk.

**Day 1 exit criterion:** The application loads data and correctly identifies the protein gap without an LLM.

### Day 2: Agent and actions

- implement the candidate-action catalog;
- implement hard constraints;
- implement impact simulation and ranking;
- connect the LLM agent to deterministic tools;
- build recommendation review and approval;
- add decision logging;
- implement the baseline comparison.

**Day 2 exit criterion:** The full primary scenario works from shock through approved simulated outcome.

### Day 3: Verification and presentation

- test all five scenarios;
- test red-team and missing-data cases;
- fix unsupported claims and inconsistent numbers;
- finalize the deck;
- rehearse the 4–5 minute demo;
- prepare the offline backup;
- ensure one team member is ready to present onsite.

**Day 3 exit criterion:** The primary demo succeeds repeatedly from a clean start and the pitch uses only defensible claims.

### Suggested team roles

For a four-person team:

- **Product/domain lead:** problem definition, constraints, pitch, and evaluation.
- **Data/optimization lead:** simulation, calculations, scoring, and tests.
- **Agent/backend lead:** tools, orchestration, schemas, and audit behavior.
- **Frontend/demo lead:** interface, visualizations, deployment, and demo reliability.

For a smaller team, combine product with frontend and data with backend.

---

## 24. Acceptance criteria

The MVP is complete when:

- all data are explicitly labeled synthetic;
- the primary scenario can be run from start to finish;
- the system detects the known synthetic risk;
- at least three candidate actions are generated;
- at least one infeasible action is correctly rejected;
- the top recommendation cites its inputs and assumptions;
- the manager can approve, edit, reject, or defer;
- an approved action updates the simulated projection;
- the decision is stored in an audit log;
- no consequential action occurs without approval;
- the prototype can run locally without external data;
- results are compared to a defined baseline;
- the team makes no unsupported real-world impact claim.

---

## 25. Risks and mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Synthetic data looks arbitrary | Judges may discount the results | Publish assumptions, equations, fixed seeds, and scenario ground truth. |
| Project appears to be a dashboard | Weak agentic differentiation | Show tool use, candidate generation, constraint checking, approval, and learning loop. |
| LLM invents quantities | Damages trust | All calculations and action availability come from deterministic tools. |
| Nutrition claim is overstated | Could imply clinical validity | Use broad staff-defined category priorities, not individualized dietary advice. |
| Scope expands into full supply-chain optimization | Threatens delivery | Maintain the explicit non-goals and prioritize one decision loop. |
| Recommendation is just a reorder rule | Limited novelty | Compare multiple action types and benchmark against a simple reorder baseline. |
| Forecast becomes the entire project | Forecast may be weak on synthetic data | Position forecast as one tool; emphasize constrained action planning. |
| Simulated improvement is presented as impact | Misleading | Label every result as simulated and describe field metrics separately. |
| Autonomous action creates safety concerns | Consequential decisions require authority | Require manager approval and provide an audit trail. |
| Demo depends on internet or model availability | Live failure risk | Cache scenario outputs or provide deterministic fallback behavior. |

---

## 26. Ethical, safety, and governance requirements

- Use no client PII in the prototype.
- Do not infer individual household need.
- Do not score people, pantries, or communities by “deservingness.”
- Treat past distribution as an imperfect operational signal, not complete demand.
- Let staff define minimum category and fairness policies.
- Display uncertainty and missing information.
- Allow the agent to abstain.
- Preserve source evidence and timestamps.
- Keep rules and scoring weights visible.
- Record overrides without penalizing staff.
- Never automate food-safety disposition, payment, purchasing, or scarce-food allocation.
- Provide an exportable audit trail.

---

## 27. Real-world deployment pathway

### Stage 0: Synthetic prototype

Demonstrate behavior and technical feasibility only.

### Stage 1: Historical replay

Use de-identified weekly category exports. Compare risks and recommendations with past outcomes and staff judgment.

### Stage 2: Read-only shadow mode

Generate weekly recommendations without changing operations. Measure false alerts, staff usefulness, review time, overrides, and missing data.

### Stage 3: Approved task creation

After manager approval, create internal procurement, donor-relations, transfer, or distribution tasks. No automated purchasing.

### Stage 4: Limited system integration

Use recurring read-only exports or APIs and approved write-back for low-risk workflow states.

### Stage 5: Multi-location resilience network

Coordinate transfers and targeted sourcing across locations while maintaining local decision authority.

---

## 28. Questions to validate with a real food bank after the hackathon

1. Which food categories are considered essential?
2. What minimum and target coverage does staff use, formally or informally?
3. Which categories experience the most frequent gaps?
4. Are receipts, inventory, distribution, purchases, and spoilage available by category and week?
5. How reliable are expected inbound records?
6. How are USDA delays or canceled deliveries handled today?
7. How are purchase quantities selected?
8. What portion of purchasing funds is flexible versus restricted?
9. What storage and handling constraints are absent from current reports?
10. What types of donations are most often declined or redirected?
11. Are request, allocated, shipped, and received quantities stored separately?
12. What does staff currently use as a proxy for demand?
13. Which decisions must remain human-approved?
14. What would make a recommendation trustworthy?
15. What maximum review burden is acceptable each week?
16. What would a successful 30-day shadow pilot prove?

---

## 29. Recommended final project definition

### Final name

**Nutrition-Aware Supply Resilience Agent**

### Final problem statement

> Food banks receive food through volatile donations, government supply, purchases, and transfers. Aggregate inventory can hide category-level shortages, while existing reports do not consistently compare the actions available to prevent those gaps. Supply planners need an evidence-linked, human-approved way to identify upcoming assortment risks and choose the best feasible intervention under budget, storage, lead-time, and usable-life constraints.

### Final solution statement

> The Nutrition-Aware Supply Resilience Agent monitors category-level supply signals, projects four-week coverage, identifies shortages and surpluses, generates feasible responses, compares their mission and operational effects, and presents a manager with an evidence-backed recommendation and alternatives. Approved actions are applied only in simulation and logged for evaluation.

### Final MVP promise

> Given a simulated disruption, the prototype will detect which food category is at risk, explain why, compare purchase, targeted donation, transfer, acceptance, and monitoring options, enforce operational constraints, and show the projected result of the manager-approved response.

### Final impact framing

> The hackathon prototype demonstrates a safer and more actionable supply-planning workflow. It does not demonstrate actual reductions in hunger. A real shadow pilot would measure whether the workflow improves category availability, decision time, purchasing efficiency, spoilage, and usable food distribution.

---

## 30. Concise judge-facing summary

> Food banks can have thousands of pounds in inventory and still lack essential categories. Our Nutrition-Aware Supply Resilience Agent looks four weeks ahead, detects category-level risks, and compares the actions a manager can actually take: purchase, request a targeted donation, transfer food, accept an offer, accelerate distribution, or wait. It checks budget, storage, lead time, shelf life, and staff-defined priorities, then presents an evidence-backed recommendation for human approval. Our hackathon evaluation uses transparent synthetic scenarios and measures decision correctness, constraint compliance, category coverage, cost, spoilage exposure, and abstention—not invented real-world impact.

---

## 31. Background and evidence sources

Use these sources to establish sector context. Do not use them to imply that the synthetic prototype has achieved field impact.

- **Official hackathon requirements:** `AISCO Hackathon Deck 2026 - Updated 7-8-26.pdf` in this project folder.
- **USDA Economic Research Service:** [Food Banks in the United States: Systems, USDA Programs, and Participation](https://www.ers.usda.gov/publications/115053), July 2026. Use for the structure of U.S. food-bank supply and USDA participation.
- **U.S. Government Accountability Office:** [Charitable Food Assistance: USDA Can Enhance Guidance and Improve Program Performance Assessment](https://www.gao.gov/products/gao-24-106539). Use for documented delivery-exception, guidance, and performance-measurement problems.
- **Feeding America:** [FY2025 Annual Report](https://www.feedingamerica.org/sites/default/files/2025-12/FA_25AnnReport_DIGITAL_final.pdf). Use for current network scale and food-rescue context.
- **Nationwide pantry technology study:** [Current Use and Demand for Digital Tools to Enhance Food Pantry Management](https://pmc.ncbi.nlm.nih.gov/articles/PMC11810111/). Use carefully: its findings describe participating pantries and should not be generalized to every regional food-bank warehouse.
- **Project research:** `FOODBANK_DOMAIN_GROUNDING.md`, `FOODBANK_HACKATHON_CHEAT_SHEET.md`, and `HACKATHON_DECISION_MEMO.md` in this folder. Use these as internal synthesis, then trace important pitch claims to their original sources.

### Evidence discipline

For every number used in the final presentation, label it as one of:

- **Published sector evidence:** cited to an original source.
- **Food-bank-specific evidence:** provided directly by an identified food-bank representative.
- **Synthetic assumption:** invented for the demonstration and clearly labeled.
- **Simulated result:** calculated by the prototype from synthetic inputs.
- **Future pilot metric:** something that has not yet been measured.

This labeling is part of the product's trust and auditability story, not merely a presentation disclaimer.
