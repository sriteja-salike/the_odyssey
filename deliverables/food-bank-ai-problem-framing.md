---
title: "Problem-First Opportunity Brief"
subtitle: "AI Agents for Food Bank Supply Chains"
author: "Prepared for the AISCO Food Banks + AI Hackathon team"
date: "July 15, 2026"
---

# Executive summary

## Recommended direction

Target one operational decision loop:

> **Perishable promise-to-placement exception management, initially limited to unrestricted retail-donated produce at Food Finders Food Bank.**

The core question is:

> When produce is offered or received, which lot requires intervention now, and where can it realistically be placed before its usable window closes?

This is not a proposal to build another food rescue marketplace, generic food-bank chatbot, warehouse platform, or climate calculator. It is a decision-support workflow for a receiving or inventory coordinator managing a time-sensitive exception.

The direction is grounded at two different levels:

- **Sector level: well supported.** ReFED, food-bank operations research, and the hackathon's own problem inventory identify perishable supply uncertainty, limited downstream capacity, fragmented information, expiry risk, refusals, and replanning as active challenges.[^refed-rescue] [^operations-review] [^donations-review]
- **Food Finders relevance: plausible and material.** Food Finders distributes 12.1 million pounds through more than 100 partners and several direct-distribution channels. Retail donations account for 30.7 percent of its food supply.[^fffb-2025]
- **Food Finders severity: not yet validated.** No public source establishes that Food Finders currently experiences significant produce spoilage, slow manual placement decisions, or inadequate software for this workflow.

The team should therefore present this as a **locally relevant, evidence-backed hypothesis** and validate it with an operator before committing substantial build time.

## One-sentence pitch

Food banks already have tools for rescuing food; we help ensure that already-rescued produce reaches a feasible destination before time runs out.

## Decision rule

Proceed only if an operator confirms that the problem:

1. Occurs regularly.
2. Costs measurable food, time, mileage, or service.
3. Has a named decision owner who can act differently.
4. Can be supported with available or low-burden data.
5. Is not already handled adequately by current systems.

# Purpose of this brief

This document provides a shareable, evidence-based foundation for selecting and pitching a food-bank supply-chain problem for the AISCO Food Banks + AI Hackathon. It is designed to prevent two common failure modes:

- Selecting a fashionable theme and forcing an AI agent into it.
- Treating a plausible industry problem as a proven local problem without validation.

The intended sequence is:

1. Identify a recurring operational failure.
2. Name the user, trigger, decision, deadline, consequence, and available action.
3. Establish a measurable baseline.
4. Determine whether software can improve the decision.
5. Use AI only where it adds value beyond rules, workflow design, or optimization.

# What the hackathon actually rewards

The official hackathon prompt asks teams to create a solution using AI agents that substantially improves or transforms food-bank supply-chain effectiveness. It explicitly includes donations, purchasing, warehousing, allocation, packing, distribution, and delivery.[^hackathon-deck]

The deck does not provide a formal scoring rubric, technical framework, required dataset, or mandatory list of themes. Its clearest guidance is problem-first:

- Research a real food-bank supply-chain team.
- Find a unique problem the team actually faces.
- Build an agent for that real problem.
- Quantify the problem and the proposed improvement.
- Ground the solution in a specific food bank when possible.

The two short context documents supplied with the challenge strengthen this interpretation. They describe seven opportunity areas and a 35-item operations backlog, including:

- Forecasting produce supply and actual truck arrivals.
- Comparing donor commitments with actual delivery.
- Capturing produce condition and remaining shelf life at receiving.
- Warning when inventory will expire before it moves.
- Rebuilding plans after an agency cancellation or vehicle failure.
- Detecting refused product and short receipts.
- Matching inbound product with community preferences and partner needs.

However, those documents contain no visible authorship, citations, methods, or source notes. Their figures and requests should be treated as organizer-provided problem hypotheses, not proof of prevalence, cost, or local severity.[^themes-context] [^build-list-context]

## Implication for the team

The safest interpretation of the challenge is not "choose one of seven themes." It is:

> Find one painful decision loop, demonstrate it end to end, and show why an agent improves the operator's ability to act.

# Why the apparent innovations have not solved the system

Modern food banks have adopted meaningful innovations. The mistake is assuming that the existence of a capability means the surrounding operating system is solved.

| Innovation | What it enables | What remains unresolved |
|---|---|---|
| Food rescue applications | Volunteer dispatch, donor coordination, pickup tracking, and rescue reporting | Actual quantity and condition, cold capacity, receiver hours, downstream need, failed pickups, sustainable transport, and integration with inventory and routes |
| Choice and mobile markets | Dignity, client preference, culturally relevant selection, and less unwanted food at the final distribution point | What to stock or load next, stockouts, leftovers, space, staffing, volunteer availability, transportation, and turning aggregate choices into sourcing decisions |
| Opportunity hubs | Co-location of food, healthcare, employment, benefits, and related services | Referral completion, staffing, appointment conflicts, cross-organization data sharing, privacy, transportation, and finite facility capacity |
| FRAME climate methodology | Standardized estimates of avoided methane and greenhouse-gas emissions | Daily operating decisions, low-burden data capture, uncertainty in inputs, and whether recovered food is ultimately consumed |

Food Rescue Hero, for example, already markets volunteer scheduling, donor coordination, rescue tracking, missed-rescue visibility, and reporting.[^food-rescue-hero] A generic volunteer pickup application would therefore be difficult to differentiate.

FRAME is a credible impact methodology, but it is principally an accounting and evidence system. It quantifies the environmental effect of recovery; it does not decide where an urgent pallet should go during the operating day.[^frame]

The unresolved layer is the connection between these capabilities:

> Can an unpredictable, short-dated donation be moved safely and fairly to a destination that is open, has capacity, needs that category, and can distribute it before quality deteriorates?

# Current food-bank operating challenges

## Uncertain supply

Donated food differs from conventional purchased inventory. Quantity, timing, product mix, remaining life, and condition may be uncertain until late in the process. A regular donation may arrive with an unexpected composition. An ad hoc donation may appear with little notice and a short pickup window.

ReFED identifies distribution and logistics as central reasons that many donations remain shelf-stable while fruits, vegetables, and other perishables are difficult to recover. It calls for expanded storage, transportation, and staffing; reliable high-frequency pickups; consistent donor handling; and real- or near-time data on product type, quantity, condition, and location.[^refed-rescue]

## Uncertain downstream capacity

The central food bank distributes through a decentralized partner network. Each partner may have different:

- Opening and receiving hours.
- Refrigerator and freezer capacity.
- Current inventory.
- Volunteer or staff coverage.
- Program eligibility.
- Client preferences and dietary needs.
- Ability to process a large or unusual donation.

Operations research describes partner capacity as an important and frequently uncertain constraint. Food banks may not have direct, real-time visibility into partner inventory, storage, or labor capacity.[^operations-review]

## Perishability and the cold chain

Produce and refrigerated food must move quickly. Storage and transport requirements are stricter, while usable quality declines over time. The operational question is not simply whether inventory exists. It is whether the lot will reach a useful destination before its remaining-life window closes.

Research reviews identify perishability, voluntary labor, and limited IT support as important food-bank challenges that remain under-addressed.[^donations-review]

## Physical constraints

Software cannot create:

- A refrigerated truck.
- Cold-room space.
- A driver.
- A dock slot.
- Sorting labor.
- A partner that is open.
- Packaging or processing capacity.

The useful software problem is therefore not "eliminate capacity constraints." It is "make better, faster, and more transparent use of scarce capacity during time-sensitive exceptions."

## Fragmented operating information

A donation offer may arrive by email, text, voice note, or phone call. Expected quantity may be stored in one system. Actual receipt and condition are discovered at the dock. Inventory may be in another system. Partner orders, hours, capacity, and routes may be elsewhere or held as staff knowledge.

This is not merely a small-organization issue. Feeding America began five Microsoft Dynamics 365 pilots in April 2026 to test a potential network-wide ERP approach and shared data and process standards.[^feeding-america-erp] GFN similarly reports that Excel and WhatsApp remain common starting tools and that growing food banks are still investing in more connected data infrastructure.[^gfn-data]

## Multiple, conflicting objectives

A food bank should not optimize only miles or pounds. Each allocation decision may trade off:

- Spoilage avoidance.
- Nutrition and quality.
- Partner and neighborhood need.
- Fairness across communities.
- Cultural relevance.
- Operating cost.
- Driver and volunteer burden.
- Food safety.
- Donor or government restrictions.

"Maximize pounds moved" is a dangerous objective by itself. It can push unsuitable food downstream and relocate the waste to a smaller partner.

## Persistent demand and external shocks

USDA estimated that 18.3 million U.S. households, or 13.7 percent, experienced food insecurity in 2024.[^usda-food-security] Food banks must support persistent need while responding to policy changes, disasters, inflation, funding uncertainty, and shifts in donated supply.

# Local grounding: Food Finders Food Bank

Food Finders is an appropriate grounding partner because its public data establish meaningful operating scale and network complexity.

Its FY2025 annual report states that the organization:[^fffb-2025]

- Distributed 12.1 million pounds of food.
- Provided 10.1 million meals.
- Worked with more than 100 agency partners.
- Served a 16-county area with nearly 90,000 residents facing food insecurity.
- Operated with 34 staff and 39,854 volunteer hours.

## Food source mix

| Source | FY2025 share |
|---|---:|
| Retail donations | 30.7% |
| Purchased product | 24.4% |
| USDA commodities | 21.1% |
| Feeding America and other food banks | 15.8% |
| Individuals and businesses | 7.1% |
| Food drives | 1.1% |

This mix matters because the sources differ in predictability, restrictions, product composition, and operating requirements.

## Distribution channels

| Channel | FY2025 share |
|---|---:|
| Agency partners | 47.1% |
| Fresh Market and Senior Grocery | 36.0% |
| Mobile Pantry | 12.3% |
| BackPack Program | 4.6% |

One incoming load may therefore have several potential destinations, each with different timing, storage, demand, and program constraints.

## Directional year-over-year signals

Food Finders' FY2024 and FY2025 reports suggest several changes worth investigating:[^fffb-2024] [^fffb-2025]

- Reported pounds distributed declined from 12.7 million to 12.1 million.
- Volunteer hours declined from 43,351 to 39,854.
- Retail donation share rose from 25.2 percent to 30.7 percent.
- The population described as food insecure rose from more than 84,000 to nearly 90,000.

These reports state that their numbers are unaudited. Definitions, timing, and methods may also differ. These changes are signals for interviews, not proof of a causal operating squeeze.

## What the public evidence does not establish

The public sources do not establish that Food Finders:

- Has a high produce spoilage rate.
- Lacks an effective receiving or allocation system.
- Depends primarily on calls or spreadsheets for placement.
- Takes too long to handle urgent lots.
- Considers this one of its most important operating problems.

This boundary is critical. The team can claim local relevance, but not local severity, until it speaks with an operator or reviews internal records.

# Evidence ladder and claim discipline

| Claim | Evidence status | Safe wording |
|---|---|---|
| Perishable donation allocation is a documented food-bank challenge | Supported | "Sector research identifies this as an active operating challenge." |
| Downstream partner capacity is difficult to observe across decentralized networks | Supported sector-wide | "Food-bank research reports limited real-time visibility into partner capacity." |
| Food Finders has sufficient scale and channel complexity for the issue to be plausible | Supported | "Food Finders' public operating profile makes this a relevant local hypothesis." |
| Food Finders currently experiences slow, manual placement decisions | Unverified | "We are validating the current Food Finders workflow." |
| The issue causes Food Finders a measurable amount of spoilage or rework | Unverified | Do not quantify until internal evidence is obtained. |
| Food Finders would adopt the proposed tool | Unverified | Present adoption as a test, not an assumption. |

The team should not say:

> Food Finders wastes produce because it cannot allocate donations quickly.

It can accurately say:

> Sector evidence identifies timely placement of unpredictable perishables as a persistent food-bank challenge. Food Finders' retail-donation volume, multiple distribution channels, and 100-plus partner network make it a relevant local hypothesis. We are validating its frequency, cost, and current workflow directly with operators.

# Recommended core problem

## Problem statement

> When unrestricted retail-donated produce is offered or received, a receiving or inventory coordinator must determine which lots need immediate intervention and which destination can actually accept and distribute them before the usable-quality window closes. Condition, inventory velocity, partner capacity, hours, and transportation constraints may not be visible together, making urgent placement slow and dependent on manual coordination.

The final sentence is a hypothesis until the Food Finders workflow is observed.

## Problem contract

| Element | Definition |
|---|---|
| Primary user | Receiving or inventory lead |
| Trigger | A retail-donated produce lot is offered, arrives, or differs materially from the commitment |
| Decision | Expedite, cross-dock, allocate, inspect, hold, redirect, or decline |
| Deadline | Before the product's usable-quality window or destination receiving window closes |
| Required state | Product, quantity, source, condition, inventory, movement rate, destination capacity and hours, and planned distributions |
| Desired outcome | A confirmed, feasible, human-approved placement |
| Primary metric | Percentage of urgent produce placed before its usable deadline |
| Guardrails | Human food-safety authority, transparent constraints, no client scoring, and no autonomous commitment |
| Critical unknown | Whether this occurs often enough and causes enough loss or rework at Food Finders |

## Root-cause chain

The likely failure chain is:

1. The offer or scheduled delivery is incomplete or changes.
2. Remaining life and actual condition are confirmed late.
3. Current inventory and downstream capacity are not visible together.
4. Staff coordinate across several people or systems under time pressure.
5. A feasible option closes while the decision is being made.
6. Product is rehandled, redirected, refused, downgraded, or discarded.

Every link in this chain must be tested locally. The solution should target the earliest link at which better information can change an action.

# Why this slice is stronger than the alternatives

| Candidate | Advantage | Main weakness | Recommendation |
|---|---|---|---|
| Perishable receiving-to-placement triage | Clear user, deadline, consequence, and action; measurable in food and time | Local loss rate and workflow still need validation | Leading hypothesis |
| Donor commitment reliability and ETA | Clean evaluation against promised versus actual receipts | Less visible mission story; may produce alerts without a downstream action | Best upstream pivot |
| Same-day routing disruption | Actionable and demonstrable | Primarily an optimization problem and dependent on clean route constraints | Strong secondary option |
| Choice-to-mobile-load feedback | Connects client choice to tomorrow's load plan without individual profiling | Requires reliable loaded, selected, stockout, and return records | Strong if mobile data exists |
| Access-friction or hidden-demand prediction | High mission relevance | Ground truth is difficult; substantial bias and privacy risk | Not suitable for a 48-hour first build |
| Generic operations chatbot | Easy to demonstrate | Weak connection to one consequential decision; difficult to quantify | Avoid |
| Full operations intelligence hub | Broad strategic value | Too large, integration-heavy, and difficult to validate | Avoid for the hackathon |

# Where AI belongs

The problem should be valuable even if the word "AI" is removed. Begin with the simplest reliable decision support, then assign technology according to the task.

| Task | Appropriate mechanism |
|---|---|
| Food-safety, source, and program restrictions | Hard rules plus trained human authority |
| First-expiring-first-out priority | Deterministic rule |
| Parse donor texts, emails, voice notes, or packing slips | Language model |
| Estimate arrival, quantity, or move-before-spoilage risk | Simple predictive model, only if historical data exists |
| Identify feasible destinations | Constraint engine or optimizer |
| Gather state, request approval, communicate, and retry after failure | Agent |
| Final acceptance and food-safety decision | Human |

## What makes the workflow agentic

A dashboard displays state. A prediction produces a score. The proposed agent would:

1. Observe an offer, receipt, or exception event.
2. Convert messy input into structured fields.
3. Query inventory, destination capacity, hours, and scheduled distributions.
4. Apply hard constraints.
5. Rank feasible options and explain the tradeoffs.
6. Ask a human to approve the recommendation.
7. Prepare or send approved confirmations.
8. Record the outcome.
9. Replan if a receiver, vehicle, or driver becomes unavailable.

If the prototype only produces a freshness score, it should not be described as an agent.

## Safety and human authority

The system must not:

- Certify food safety from an image.
- Override temperature, handling, or program rules.
- Promise food to a partner without approval.
- Infer individual client deservingness or eligibility.
- Hide an equity decision inside an unexplained score.

Uncertainty, missing data, excluded options, and reasons for the recommendation should be visible.

# Minimum viable prototype

## Scope included

- Unrestricted retail-donated produce.
- One Food Finders receiving workflow.
- Same-day or next-day placement.
- Three destination types: agency partner, Fresh Market, and mobile pantry.
- Human-approved recommendations.
- One cancellation and fallback scenario.
- Outcome logging.

## Scope excluded

- Meat, dairy, and prepared meals.
- Automated food-safety clearance.
- Full USDA or TEFAP allocation logic.
- Complete fleet routing.
- Individual client data.
- A warehouse-management or ERP replacement.
- Autonomous acceptance or rejection.
- Cross-food-bank exchanges.
- A multi-agent swarm.

## Minimum data objects

The demonstration can use de-identified or synthetic records shaped by a real workflow:

- **Donation offer:** donor, category, expected quantity, pickup window, declared date or urgency, and temperature class.
- **Receipt:** actual quantity, arrival time, condition band, receiving notes, and source restrictions.
- **Inventory:** lot, quantity on hand, receipt date, quality deadline, and current movement rate.
- **Destination pulse:** location, open or closed status, receiving cutoff, cold capacity, maximum quantity, category needs, and last update time.
- **Outbound plan:** channel, departure time, vehicle capacity, refrigeration, and planned stops.
- **Outcome:** approved placement, received quantity, refusal, redirect, disposal, and reason.

# Demonstration scenario

A clear demo can use the following synthetic case, explicitly labeled as a simulation:

1. A retailer offers 1,000 pounds of berries with a short usable window.
2. The delivery arrives late and is larger than expected.
3. One partner wants produce but closes soon.
4. A second partner is open tomorrow but lacks enough refrigeration.
5. Fresh Market has limited available space.
6. A mobile distribution is scheduled the next morning.
7. The initially recommended partner cancels.

The demo should show:

- The original message becoming a structured offer.
- The difference between expected and actual receipt.
- Hard feasibility checks.
- A ranked placement plan with deadlines and reason codes.
- Human approval.
- The cancellation event.
- A fallback plan and revised communication.
- Comparison with a basic first-expiring-first-out or manual-review baseline.

Synthetic results must be described as simulated or modeled. They should not be presented as measured Food Finders impact.

# Metrics and quantification

## Operational metrics

The strongest primary metric is:

> **Safe, wanted food successfully placed within its usable window.**

Supporting measures include:

- Median offer-to-decision or receipt-to-placement time.
- Urgent pounds delivered divided by urgent pounds offered or received.
- Remaining usable life at destination.
- Partner rejection or second-redistribution rate.
- Pounds discarded by reason.
- Number of calls, messages, or staff touches per exception.
- Human override rate and override reason.
- Constraint or safety violations.
- Distribution across counties or partner groups.
- Miles per successfully delivered pound, if route data is available.

## Quantification without inventing impact

Food Finders reported distributing approximately 3 million pounds of fresh produce in FY2024.[^fffb-impact]

This supports a sensitivity calculation:

- One percentage point of that volume equals 30,000 pounds.
- Feeding America's standard estimate is approximately 1.2 pounds per meal.[^feeding-america-erp]
- Therefore, 30,000 pounds is approximately 25,000 meal-equivalents.

This is not a claim about Food Finders' current waste rate or the expected performance of the proposed tool. It only shows how to translate an observed percentage-point improvement into mission scale after a real baseline is available.

## Evaluation design

In order of credibility:

1. Replay past, de-identified incidents against the current rule or process.
2. Run shadow-mode recommendations during real operations without changing decisions.
3. Compare approved recommendations with current decisions and outcomes.
4. Conduct a limited pilot with explicit human approval.

For the hackathon, a replay or simulation is likely the appropriate level. The team should state which level it has achieved.

# Local validation plan

## Critical-incident interview

Ask a receiving, inventory, transportation, agency-relations, or mobile-program operator to walk through one recent incident:

1. What was the last produce load that surprised you?
2. What was promised, and what actually arrived?
3. When did the difference become visible?
4. Who owned the decision about where the product should go?
5. What information did that person need?
6. Where was the information stored?
7. How many calls, messages, or system checks were required?
8. What actions were still available, and when did each option close?
9. Was any product rehandled, redirected, refused, downgraded, or discarded?
10. How often does a similar event occur?
11. Could earlier warning have changed the result?
12. Is this among the team's top three recurring operational problems?
13. What must a system never decide without a trained person?

## Evidence to request

Ask for one or two redacted examples of:

- Donation emails, texts, or packing slips.
- Receiving records.
- Expected-versus-actual receipts.
- Partner orders or capacity sheets.
- Temperature or inspection records.
- Rejection or short-receipt records.
- Disposal, shrink, or write-off records.
- Mobile load and leftover records.
- Route or distribution schedules.

## Go or no-go criteria

Proceed only if:

- The issue occurs at least weekly or has high consequence when it occurs.
- Failure costs measurable food, time, mileage, or service.
- A named user has authority to act differently.
- The needed state exists or can be captured with low burden.
- The current process has a clear baseline.
- The proposed alert leads to a feasible action.
- The system does not duplicate an existing effective tool.

Stop or pivot if:

- Produce loss is negligible.
- Urgent placement is already fast and reliable.
- Exceptions are rare and low consequence.
- The relevant data cannot be obtained or maintained.
- Contractual or safety rules leave no meaningful decision flexibility.
- Operators identify another problem as materially more important.

# Pivot options

## Upstream pivot: commitment reliability

If perishable spoilage is low but receiving surprises are common, move one step upstream:

> Identify when a donor's promised quantity, product mix, or arrival time is likely to differ from actual receipt, and give planners enough lead time to adjust purchases, labor, space, or allocation.

This uses expected-versus-actual receipts, which may be easier to evaluate objectively.

## Downstream pivot: choice-to-load feedback

If inbound data is unavailable but mobile pantry records exist:

> Use aggregate loaded, selected, declined, stocked-out, and returned quantities to recommend the category-level mix for the next mobile distribution.

This should use aggregate data and avoid individual profiling.

## Disruption pivot: same-day replanning

If cancellations or vehicle failures are the dominant pain:

> Rebuild the feasible delivery and placement plan when an agency, driver, or truck becomes unavailable.

This is likely to rely more heavily on transparent optimization than on a language model.

# What not to build

- A generic "AI hunger assistant."
- Another broad food-rescue marketplace.
- A full ERP or warehouse-management replacement.
- A camera that claims to certify food safety or exact remaining life.
- A route optimizer described as an agent without an exception workflow.
- A climate calculator duplicating FRAME.
- Client fraud, eligibility, or deservingness scoring.
- A demand model based only on county-level food-insecurity estimates.
- A platform attempting all 35 sponsor-provided requests.
- A multi-agent demonstration without real operating state or decision authority.
- A pitch claiming that software solves the root causes of hunger.

# Forty-eight-hour execution plan

## July 15: validate and choose

- Secure one operator conversation through Food Finders or the organizers.
- Capture one critical incident and its current workaround.
- Ask for one redacted artifact or a realistic example.
- Establish frequency, consequence, decision owner, baseline, and action.
- Decide whether the leading hypothesis passes the go or no-go criteria.

## July 16: build the smallest credible workflow

- Build the deterministic baseline first.
- Define the minimum donation, inventory, destination, and route data.
- Add language-model extraction only for messy inputs.
- Add the agent loop for state gathering, recommendation, approval, communication, logging, and fallback.
- Test normal, incomplete-data, cancellation, and no-feasible-destination cases.
- Record assumptions and limitations.
- Build the presentation around one operational incident.

## July 17: present evidence and judgment

- Lead with the operator and decision, not the technology.
- Show the current failure and its consequence.
- Demonstrate the bounded agent workflow.
- Compare it with a clear baseline.
- Distinguish measured, modeled, and hypothetical results.
- Make human authority, constraints, and failure behavior visible.
- End with a realistic pilot and data-validation plan.

# Suggested pitch structure

1. **The moment:** A short-dated produce load changes unexpectedly.
2. **The operator:** A receiving or inventory lead has minutes, not days, to place it.
3. **The problem:** The information needed to act is fragmented across the donation, warehouse, partner network, and delivery plan.
4. **The consequence:** Delay can create rehandling, rejection, spoilage, or unsuitable downstream allocation.
5. **The evidence:** ReFED, operations research, the sponsor backlog, and Food Finders' public operating scale establish a credible problem space.
6. **The product:** A human-in-the-loop agent that constructs and maintains a feasible placement plan.
7. **The proof:** A transparent comparison with a deterministic baseline.
8. **The safety case:** Hard rules and trained humans retain food-safety and final allocation authority.
9. **The next step:** Validate on past incidents and operate in shadow mode before any live automation.

# Final recommendation

The team should not claim that Food Finders currently has a produce-spoilage or manual-allocation crisis. That claim is not supported by public evidence.

The team can responsibly claim that:

- Perishable supply uncertainty and downstream capacity coordination are documented food-bank problems.
- The hackathon's own operations backlog highlights the same decision failures.
- Food Finders' scale, retail-donation exposure, multiple channels, and partner network make the issue locally plausible.
- A narrow promise-to-placement workflow is measurable, bounded, and appropriate for human-in-the-loop agent support.
- Local frequency, consequence, workflow, and adoption must be validated before committing to the build or claiming impact.

The strongest strategic framing is:

> Food banks already have tools for rescue, choice, services, and impact reporting. They still need a lightweight decision layer that connects volatile, short-dated supply with real downstream capacity. Solve that operating handoff first; add AI only where it demonstrably improves the decision.

# Source notes

The footnotes attached to individual claims provide full context and page guidance. The source set below is the compact reading list the team can use when defending the problem choice.

## Challenge materials

- *AISCO Hackathon Deck 2026* - the official prompt and its problem-first guidance; available in the shared workspace.
- *AI in Food Banking: Seven Themes* - a sponsor-provided opportunity map; useful as ideation context, but not independent proof.
- *The Build List: 35 Requests for an Operations Intelligence Hub* - a sponsor-provided operational backlog; useful as a hypothesis inventory, but not independent proof.

## Core external evidence

- [Food Finders Food Bank FY2025 Annual Report](https://www.food-finders.org/wp-content/uploads/2026/04/2025-Annual-Report-Final-5-1.pdf) - current public scale, source mix, distribution channels, staffing, volunteer hours, and service footprint.
- [Food Finders Food Bank FY2024 Annual Report](https://www.food-finders.org/wp-content/uploads/2025/03/2024-Annual-Report-Final-2.pdf) - prior-year comparison and fresh-produce context.
- [ReFED: Strengthen Food Rescue](https://refed.org/action-areas/strengthen-food-rescue/) - documented rescue constraints involving storage, transportation, staffing, reliable pickups, and data sharing.
- [Food Bank Supply Chain and Operations in a Data-Driven World](https://par.nsf.gov/servlets/purl/10639835) - operations-research synthesis covering supply, inventory, partner capacity, labor, routing, equity, and data.
- [Dealing with donations: Supply chain management challenges for food banks](https://www.sciencedirect.com/science/article/pii/S0925527323001585) - peer-reviewed review of donation-driven food-bank supply chains.
- [Feeding America Spring 2026 Impact Report](https://www.feedingamerica.org/sites/default/files/2026-04/Spring%20Impact%20Report_2026_Digital_final_0.pdf) - current network context, the meal-equivalent convention used in this brief, and 2026 ERP pilots.
- [Global FoodBanking Network: data-system funding trends](https://www.foodbanking.org/blogs/three-trends-shaping-how-food-banks-use-grant-funding/) - evidence that Excel, WhatsApp, and fragmented systems remain common starting points globally.
- [Food Rescue Hero product overview](https://foodrescuehero.org/our-product/) - confirms the capabilities already covered by a mature rescue-coordination platform.
- [FRAME Methodology Summary](https://www.foodbanking.org/wp-content/uploads/2024/08/FRAME-Methodology-Summary_GFN.pdf) - establishes what climate-impact accounting can measure and why it is distinct from daily placement decisions.
- [USDA Household Food Security in the United States in 2024](https://www.ers.usda.gov/publications/113622) - national demand context, not a substitute for local operational data.

[^hackathon-deck]: *AISCO Hackathon Deck 2026*, especially pp. 4 and 7. A copy is available in the workspace as `AISCO Hackathon Deck 2026.pdf`.

[^themes-context]: *AI in Food Banking: Seven Themes*, pp. 1-2, supplied with the hackathon context. The document contains no visible authorship, citations, or methodology.

[^build-list-context]: *The Build List: 35 Requests for an Operations Intelligence Hub*, pp. 1-2, supplied with the hackathon context. The document contains no visible authorship, citations, or methodology.

[^refed-rescue]: ReFED, [Strengthen Food Rescue](https://refed.org/action-areas/strengthen-food-rescue/), accessed July 15, 2026. See especially its discussion of storage, transportation, staffing, reliable pickups, data sharing, and product type, quantity, condition, and location.

[^operations-review]: Irem Sengul Orgut, Lauren B. Davis, and Julie S. Ivy, [Food Bank Supply Chain and Operations in a Data-Driven World: Objectives, Challenges, and Opportunities](https://par.nsf.gov/servlets/purl/10639835), NSF Public Access Repository.

[^donations-review]: Renzo Akkerman et al., [Dealing with donations: Supply chain management challenges for food banks](https://www.sciencedirect.com/science/article/pii/S0925527323001585), *International Journal of Production Economics*, Vol. 262, 2023.

[^fffb-2025]: Food Finders Food Bank, [FY2025 Annual Report](https://www.food-finders.org/wp-content/uploads/2026/04/2025-Annual-Report-Final-5-1.pdf), especially pp. 2, 4-7. Reported impact figures are marked unaudited.

[^fffb-2024]: Food Finders Food Bank, [FY2024 Annual Report](https://www.food-finders.org/wp-content/uploads/2025/03/2024-Annual-Report-Final-2.pdf), especially pp. 2, 5-6. Reported impact figures are marked unaudited.

[^fffb-impact]: Food Finders Food Bank, [Mission in Action - FY2024 impact](https://www.food-finders.org/impact/), reporting 3 million pounds of fresh produce distributed.

[^food-rescue-hero]: Food Rescue Hero, [Our Product](https://foodrescuehero.org/our-product/), accessed July 15, 2026.

[^frame]: The Global FoodBanking Network and Carbon Trust, [FRAME Methodology Summary](https://www.foodbanking.org/wp-content/uploads/2024/08/FRAME-Methodology-Summary_GFN.pdf), August 2024.

[^feeding-america-erp]: Feeding America, [Spring 2026 Impact Report](https://www.feedingamerica.org/sites/default/files/2026-04/Spring%20Impact%20Report_2026_Digital_final_0.pdf), especially pp. 5 and 8, including the 1.2-pounds-per-meal convention and the April 2026 ERP pilots.

[^gfn-data]: The Global FoodBanking Network, [Three Trends Shaping How Food Banks Use Grant Funding](https://www.foodbanking.org/blogs/three-trends-shaping-how-food-banks-use-grant-funding/), May 4, 2026.

[^usda-food-security]: U.S. Department of Agriculture, Economic Research Service, [Household Food Security in the United States in 2024](https://www.ers.usda.gov/publications/113622), published December 30, 2025.
