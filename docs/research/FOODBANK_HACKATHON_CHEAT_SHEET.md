# Food-Bank AI Hackathon Cheat Sheet

**Research current through July 12, 2026.** Read the full evidence and citations in [FOODBANK_DOMAIN_GROUNDING.md](./FOODBANK_DOMAIN_GROUNDING.md).

## The seven things to remember

1. **A food bank is the wholesale coordinator; pantries are the last mile.** One bank may serve 100+ independent agencies with different storage, vehicles, volunteers, hours, software, and rules.
2. **Supply is uncertain and demand is censored.** Orders show what agencies could request from available stock—not everything households need. Visits omit people blocked by distance, hours, disability, language, stigma, or stockouts.
3. **The bottleneck is often conversion capacity, not gross food.** Pickup, dock, inspection, sorting, cold storage, repack, routing, partner capacity, and usable shelf life determine whether a “free” donation creates value.
4. **There is no single optimum.** Pounds, nutrition, freshness, preference, equity, miles, cost, waste, and compliance conflict.
5. **Technology is two-speed.** Food-bank warehouse systems may be mature; many pantries still use visual counts, paper, phones, and spreadsheets.
6. **AI is early.** Credible use exists in matching, notifications, feedback triage, invoice extraction, and forecasting pilots—not autonomous end-to-end operation.
7. **The winning first pattern is bounded:** LLM for messy documents, rules for safety/compliance, optimization for ranking, and a human for consequential approval.

## Latest numbers worth using

| Fact | Latest figure |
|---|---:|
| Food-insecure U.S. households, 2024 | 18.3 million / 13.7% |
| People in those households | 47.9 million, including 14.1 million children |
| Very-low-food-security households | 7.2 million / 5.4% |
| People receiving charitable free groceries, 2024 | 25.2 million |
| Feeding America FY2025 | 5.9 billion meal equivalents; 7.2 billion pounds sourced |
| Food Finders FY2025 | 12.1 million pounds; 10.1 million meal equivalents; 100+ agencies; 16 counties |
| National pantry survey using 2022 data | 62.3% visual inventory; 48.5% paper inventory |

Do not present the deck's “53 million” as a current statistic: it is a 2021 annual participation estimate. More than 50 million is the comparable Feeding America estimate for 2023; USDA's 2024 survey reports a different measure.

## Best local discovery targets

### 1. Donation intake and landed-value copilot

Parse an offer/photo/packing list, request missing fields, apply safety rules, and rank central receipt, partial receipt, direct agency match, transfer, or decline using shelf life, transport, handling, capacity, assortment, and demand. Staff approve.

### 2. Partner-capacity-aware perishable allocation

Combine a low-burden pantry capacity pulse with expiry, orders, service-area need, routes, and restrictions. Recommend FEFO transfers/allocation while explicitly protecting rural and low-capacity agencies.

### 3. Procurement gap copilot

Normalize quotes/invoices and units; compare predicted donations/USDA inventory with target assortment and nutrition floors; recommend purchases or cooperative buys under budget, storage, shelf-life, and funding restrictions. No automatic PO/payment.

### Strong narrow alternative: receiving-exception agent

Collect photos, BOL/seal/temperature evidence, create the correct federal/vendor case, route it, track timers, and preserve human accept/reject/quarantine/disposal authority.

## The dangerous hidden assumptions

- agency order = household demand;
- no order/visit = no need;
- historic service = fair future allocation;
- ERP on-hand = physically usable inventory;
- case/pound/date fields mean the same thing everywhere;
- lots remain traceable after mixed repack;
- gross donated pounds = net mission value;
- the food bank knows live pantry capacity;
- route software knows every physical constraint;
- scheduled volunteer hours = qualified attendance;
- online directory = open, stocked, accessible service;
- “rescued” = distributed = eaten;
- a nutrition score = culturally and practically useful food;
- lower miles = equitable service;
- a recommendation will be executed just because it is accurate.

## Questions that reveal the real problem

1. Show the last three bad loads, stockouts, late routes, or partner exceptions.
2. What five decisions consume the most staff time, and who has authority?
3. Where do calls, texts, email, paper, whiteboards, or memory override software?
4. Are offer declines and reasons captured? What is their frequency and landed cost?
5. Are request, allocation, pick, shipment, and agency receipt separate records?
6. What proportion of agencies has current item-level inventory and capacity?
7. Can one product lot be traced to every destination within two hours?
8. Which route, dock, vehicle, cold-space, or volunteer constraints are absent from software?
9. What changed after the last system migration or policy shock?
10. What would a successful 30-day pilot measurably improve, and who owns it afterward?

## System pattern

`existing records → evidence-linked extraction → deterministic rules → constrained ranking/optimization → human decision queue → approved action → actual outcome/override log`

Start read-only and in shadow mode. Measure unsafe recommendations, abstention, overrides, decision time, usable pounds, spoilage, fill rate, miles/cost, rural and need-adjusted coverage, staff burden, and actual field outcomes. Label simulation as simulation.

## Avoid first

- generic hunger chatbot with stale availability;
- duplicate of MealConnect/Food Drop;
- dashboard with no decision loop;
- point forecast without uncertainty/action;
- autonomous eligibility, client scoring, scarce-food allocation, food-safety judgment, payment, or inventory write-off;
- route optimization without actual execution data.

## One-sentence thesis

> Build one auditable agent that closes a fragmented operational decision loop and increases usable, appropriate food delivered—not an AI that claims to optimize hunger.

