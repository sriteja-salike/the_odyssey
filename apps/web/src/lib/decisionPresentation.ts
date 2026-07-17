import { getGolden, getOverlay, type ScenarioLetter } from "./api";
import type { DecisionBrief } from "./liveTypes";
import { dateShort, lb, usd } from "./format";

export type DecisionVisualKind = "coverage" | "capacity" | "mismatch" | "budget" | "conflict";

export interface DecisionPresentation {
  issue: {
    label: string;
    title: string;
    summary: string;
  };
  recommendation: null | {
    title: string;
    quantity: string;
    cost: string;
    timing: string | null;
    effect: string;
    caution?: string;
  };
  visual: {
    kind: DecisionVisualKind;
    title: string;
    summary: string;
  };
  scenarioName: string;
}

function rawRisk(letter: ScenarioLetter): Record<string, unknown> {
  const golden = getGolden(letter);
  const risk = golden.risks.find((item) => item.is_primary) ?? golden.risks[0];
  return (risk ?? {}) as unknown as Record<string, unknown>;
}

export function buildDecisionPresentation(
  letter: ScenarioLetter,
  brief?: DecisionBrief | null,
): DecisionPresentation {
  const golden = getGolden(letter);
  const overlay = getOverlay(letter);
  const risk = rawRisk(letter);
  const recommended = golden.recommended_action as unknown as Record<string, unknown> | null;
  const action = brief?.recommendation?.action;
  const recommendationTitle = action?.display_name ?? String(recommended?.action_id ?? "");
  const quantity = Number(action?.requested_quantity_lb ?? recommended?.requested_quantity_lb ?? 0);
  const cost = String(action?.cost_usd ?? recommended?.cost_usd ?? "0");
  const arrival = String(recommended?.arrival_week_start ?? "");

  const shared = {
    scenarioName: overlay.display_name,
    recommendation: action || recommended ? {
      title: recommendationTitle,
      quantity: lb(quantity),
      cost: usd(cost),
      timing: arrival ? `By ${dateShort(arrival)}` : null,
      effect: "",
    } : null,
  } satisfies Pick<DecisionPresentation, "scenarioName" | "recommendation">;

  if (letter === "A") {
    return {
      ...shared,
      issue: {
        label: "Needs attention",
        title: "Protein coverage may drop below the safe minimum next week.",
        summary: "Coverage is projected to fall to 1.3 weeks, below the 1.5-week minimum.",
      },
      recommendation: shared.recommendation ? {
        ...shared.recommendation,
        timing: "Order this week",
        effect: "Restores protein coverage from 1.3 to 3.0 weeks.",
      } : null,
      visual: {
        kind: "coverage",
        title: "Four-week protein coverage",
        summary: "Protein coverage reaches 1.3 weeks in the week of Aug 10, below the 1.5-week minimum.",
      },
    };
  }

  if (letter === "B") {
    const peak = Number(risk.full_accept_peak_refrigerated_lb ?? 50_000);
    const capacity = Number(risk.refrigerated_capacity_lb ?? 40_000);
    const overflow = Number(risk.overflow_lb ?? 10_000);
    return {
      ...shared,
      issue: {
        label: "Needs attention",
        title: "The full produce offer will not fit in refrigerated storage.",
        summary: `Accepting it all would require ${lb(peak)} of space—${lb(overflow)} above the ${lb(capacity)} limit.`,
      },
      recommendation: shared.recommendation ? {
        ...shared.recommendation,
        timing: "Accept this week",
        effect: `Uses the available ${lb(capacity)} without overflow or added spoilage.`,
      } : null,
      visual: {
        kind: "capacity",
        title: "Refrigerated storage",
        summary: `Full acceptance reaches ${lb(peak)} against ${lb(capacity)} capacity; the recommended partial acceptance stays within the limit.`,
      },
    };
  }

  if (letter === "C") {
    const offered = Number(risk.offered_gross_lb ?? 12_000);
    const target = Number(risk.offered_category_target_inventory_lb ?? 6_000);
    return {
      ...shared,
      issue: {
        label: "Needs attention",
        title: "This snack offer is larger than the local target.",
        summary: `The ${lb(offered)} offer is twice the ${lb(target)} snack-inventory target while essential categories remain below target.`,
      },
      recommendation: shared.recommendation ? {
        ...shared.recommendation,
        timing: "Coordinate this week",
        effect: `Redirects all ${lb(offered)} to a food bank that can use it.`,
      } : null,
      visual: {
        kind: "mismatch",
        title: "Offer compared with local target",
        summary: `${lb(offered)} of snacks is offered against a ${lb(target)} local target; the recommendation redirects the full offer.`,
      },
    };
  }

  if (letter === "D") {
    const available = Number(risk.remaining_budget_usd ?? 13_000);
    const required = Number(risk.required_combined_cost_usd ?? 22_350);
    const shortfall = Number(risk.budget_shortfall_usd ?? 9_350);
    return {
      ...shared,
      issue: {
        label: "Needs attention",
        title: "The current budget cannot cover both shortages.",
        summary: `${usd(available)} is available; the two lowest-cost responses require ${usd(required)}, leaving a ${usd(shortfall)} shortfall.`,
      },
      recommendation: shared.recommendation ? {
        ...shared.recommendation,
        timing: "Order this week",
        effect: "Addresses the earlier dairy shortage and leaves $3,400 available.",
        caution: "The protein risk remains open and still needs follow-up.",
      } : null,
      visual: {
        kind: "budget",
        title: "Budget tradeoff",
        summary: `${usd(available)} is available, compared with ${usd(required)} needed to address both shortages.`,
      },
    };
  }

  return {
    ...shared,
    recommendation: null,
    issue: {
      label: "Action paused",
      title: "Supply records conflict, so a safe recommendation is not possible.",
      summary: "Arrival week, shipment status, and quantity do not agree across the available source records.",
    },
    visual: {
      kind: "conflict",
      title: "Records that need attention",
      summary: "Decision-critical fields are missing or conflict across the source records.",
    },
  };
}
