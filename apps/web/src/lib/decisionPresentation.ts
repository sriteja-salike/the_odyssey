/* Frozen-fixture adapter for offline mode. The product UI consumes the semantic
   DecisionPresentation contract and never branches on scenario letters. */
import { getActionMap, getGolden, type ScenarioLetter } from "./api";
import type {
  DecisionBrief,
  DecisionPresentation,
  DecisionVisualDatum,
  DecisionVisualPresentation,
} from "./liveTypes";
import { dateShort, lb, usd } from "./format";

type Raw = Record<string, any>;

const datum = (
  label: string,
  value: string | number,
  unit: "weeks" | "lb" | "usd",
  tone: DecisionVisualDatum["tone"] = "neutral",
): DecisionVisualDatum => ({
  label,
  value: String(value),
  formatted_value: unit === "weeks" ? `${Number(value).toFixed(1)} weeks` : unit === "lb" ? lb(value) : usd(value),
  tone,
});

function visual(
  kind: DecisionVisualPresentation["kind"],
  title: string,
  summary: string,
  unit: DecisionVisualPresentation["unit"],
  data: DecisionVisualDatum[] = [],
  referenceValue: string | null = null,
  referenceLabel: string | null = null,
): DecisionVisualPresentation {
  return { kind, title, summary, unit, data, reference_value: referenceValue, reference_label: referenceLabel, conflicts: [] };
}

function actionTitle(actionType: string, category: string, quantity: number): string {
  const amount = lb(quantity);
  const item = category.toLowerCase();
  return ({
    PURCHASE: `Purchase ${amount} of ${item}`,
    REQUEST_TRANSFER: `Request a transfer of ${amount} of ${item}`,
    TARGETED_DONOR_REQUEST: `Request ${amount} of ${item} from donors`,
    PARTIAL_ACCEPT: `Accept ${amount} of the ${item} offer`,
    REDIRECT_DONATION: `Redirect ${amount} of ${item} to a partner food bank`,
  } as Record<string, string>)[actionType] ?? `Apply the ${item} response`;
}

export function buildDecisionPresentation(letter: ScenarioLetter, brief?: DecisionBrief | null): DecisionPresentation {
  if (brief?.presentation) return brief.presentation;

  const golden = getGolden(letter) as unknown as Raw;
  const risk = (golden.risks.find((item: Raw) => item.is_primary) ?? golden.risks[0] ?? {}) as Raw;
  const riskType = String(risk.risk_type ?? "DATA_QUALITY");
  const rec = golden.recommended_action as Raw | null;
  const evaluation = rec
    ? golden.action_evaluations.find((item: Raw) => item.evaluated_action_id === rec.evaluated_action_id)
    : null;
  const catalogAction = rec ? getActionMap(String(golden.scenario_id))[String(rec.action_id)] : undefined;
  const category = String(risk.category_id ?? catalogAction?.category_id ?? "inventory")
    .replaceAll("_", " ").toLowerCase();
  const recommendation = rec && evaluation ? {
    title: actionTitle(String(catalogAction?.action_type ?? actionTypeFromId(rec.action_id)), category, Number(rec.requested_quantity_lb)),
    quantity_label: lb(rec.requested_quantity_lb),
    cost_label: usd(rec.cost_usd),
    timing_label: rec.arrival_week_start ? `By ${dateShort(rec.arrival_week_start)}` : null,
    effect: "",
    caution: null as string | null,
  } : null;
  const shared = {
    schema_version: "decision-presentation/1.0.0" as const,
    detail_facts: [] as { label: string; value: string }[],
    suggested_questions: ["Why is this urgent?", "What information was checked?", "What other responses are feasible?"],
  };

  if (riskType === "SHORTAGE") {
    const before = String(risk.conservative_end_wos_at_breach);
    const minimum = String(risk.minimum_weeks_of_supply);
    const target = String(risk.target_weeks_of_supply);
    const weekly = golden.projections.baseline[risk.category_id]?.conservative ?? [];
    const afterValues = golden.projections.recommended_action_after?.[risk.category_id]?.conservative_end_wos ?? [];
    const breachIndex = Math.max(Number(risk.first_breach_week_index ?? 1) - 1, 0);
    const after = String(afterValues[breachIndex] ?? target);
    const summary = `Coverage reaches ${Number(before).toFixed(1)} weeks around ${dateShort(risk.first_breach_week_start)}, below the ${Number(minimum).toFixed(1)}-week minimum.`;
    const effect = `Raises ${category} coverage from ${Number(before).toFixed(1)} to ${Number(after).toFixed(1)} weeks.`;
    if (recommendation) Object.assign(recommendation, { effect, timing_label: "Order this week" });
    const data = weekly.map((week: Raw, index: number) => datum(
      week.week_start ? dateShort(week.week_start) : `Week ${index + 1}`,
      week.end_wos,
      "weeks",
      week.week_start === risk.first_breach_week_start ? "attention" : "neutral",
    ));
    return {
      ...shared, archetype: "INBOUND_DISRUPTION",
      issue: { label: "Needs attention", title: `${titleCase(category)} coverage may fall below the safe minimum.`, summary },
      recommendation,
      visual: visual("coverage", `Four-week ${category} coverage`, summary, "weeks", data, minimum, `Minimum ${Number(minimum).toFixed(1)} weeks`),
      result_visual: visual("coverage", "Expected operational effect", effect, "weeks", [datum("Before", before, "weeks", "attention"), datum("After", after, "weeks", "positive")], minimum, `Minimum ${Number(minimum).toFixed(1)} weeks`),
      detail_facts: [{ label: "Expected breach", value: dateShort(risk.first_breach_week_start) }, { label: "Target coverage", value: `${Number(target).toFixed(1)} weeks` }],
    };
  }

  if (riskType === "SHORT_LIFE_CAPACITY") {
    const peak = risk.full_accept_peak_refrigerated_lb;
    const capacity = risk.refrigerated_capacity_lb;
    const overflow = risk.overflow_lb;
    const recommendedPeak = golden.projections.recommended_action_after.maximum_refrigerated_peak_lb ?? capacity;
    const summary = `Accepting the full offer would use ${lb(peak)}—${lb(overflow)} above the ${lb(capacity)} limit.`;
    const effect = "Uses available refrigerated space without overflow or added spoilage.";
    if (recommendation) Object.assign(recommendation, { effect, timing_label: "Respond this week" });
    return {
      ...shared, archetype: "PERISHABLE_CAPACITY",
      issue: { label: "Needs attention", title: "The full produce offer will not fit in refrigerated storage.", summary },
      recommendation,
      visual: visual("capacity", "Refrigerated storage", summary, "lb", [datum("Accept all", peak, "lb", "attention"), datum("Capacity", capacity, "lb"), datum("Recommended", recommendedPeak, "lb", "positive")], String(capacity), `Capacity ${lb(capacity)}`),
      result_visual: visual("capacity", "Expected operational effect", effect, "lb", [datum("Accept all", peak, "lb", "attention"), datum("Approved", recommendedPeak, "lb", "positive")], String(capacity), `Capacity ${lb(capacity)}`),
      detail_facts: [{ label: "Potential spoilage", value: lb(risk.full_accept_expiry_spoilage_lb) }, { label: "Storage limit", value: lb(capacity) }],
      suggested_questions: ["Why not accept the full offer?", "What information was checked?", "What other responses are feasible?"],
    };
  }

  if (riskType === "DONATION_MISMATCH") {
    const offered = risk.offered_gross_lb;
    const target = risk.offered_category_target_inventory_lb;
    const redirected = rec?.expected_useful_disposition_lb ?? offered;
    const summary = `The ${lb(offered)} offer is larger than the ${lb(target)} local target while essential categories remain below target.`;
    const effect = `Redirects all ${lb(redirected)} to a partner food bank that can use it.`;
    if (recommendation) Object.assign(recommendation, { effect, timing_label: "Coordinate this week" });
    return {
      ...shared, archetype: "DONATION_DISPOSITION",
      issue: { label: "Needs attention", title: "This donation is not the best fit for local needs.", summary },
      recommendation,
      visual: visual("mismatch", "Offer compared with local need", summary, "lb", [datum("Offered", offered, "lb", "attention"), datum("Local target", target, "lb"), datum("Useful redirect", redirected, "lb", "positive")]),
      result_visual: visual("mismatch", "Expected operational effect", effect, "lb", [datum("Offered", offered, "lb", "attention"), datum("Redirected", redirected, "lb", "positive")]),
      detail_facts: [{ label: "Offer", value: lb(offered) }, { label: "Local target", value: lb(target) }],
      suggested_questions: ["Why is a redirect better?", "Which local needs were considered?", "What other responses are feasible?"],
    };
  }

  if (riskType === "BUDGET_TRADEOFF") {
    const available = risk.remaining_budget_usd;
    const combined = risk.required_combined_cost_usd;
    const shortfall = risk.budget_shortfall_usd;
    const remaining = golden.projections.recommended_action_after.remaining_budget_usd;
    const cost = rec?.cost_usd ?? "0";
    const summary = `${usd(available)} is available; addressing both shortages would require ${usd(combined)}, a ${usd(shortfall)} shortfall.`;
    const effect = `Addresses the earlier dairy shortage and leaves ${usd(remaining)} available.`;
    if (recommendation) Object.assign(recommendation, { effect, timing_label: "Order this week", caution: "A second category risk remains open and still needs follow-up." });
    return {
      ...shared, archetype: "RESOURCE_TRADEOFF",
      issue: { label: "Needs attention", title: "The current budget cannot cover both shortages.", summary },
      recommendation,
      visual: visual("budget", "Budget tradeoff", summary, "usd", [datum("Available", available, "usd"), datum("Both needs", combined, "usd", "attention"), datum("Recommended", cost, "usd", "positive")], String(available), `Available ${usd(available)}`),
      result_visual: visual("budget", "Expected operational effect", effect, "usd", [datum("Available", available, "usd"), datum("Approved", cost, "usd", "positive"), datum("Remaining", remaining, "usd")], String(available), `Available ${usd(available)}`),
      detail_facts: [{ label: "Available budget", value: usd(available) }, { label: "Combined need", value: usd(combined) }, { label: "Remaining after response", value: usd(remaining) }],
      suggested_questions: ["Why address this shortage first?", "What risk remains open?", "What other responses are feasible?"],
    };
  }

  const conflicts = (golden.blocking_issues as Raw[])
    .filter((item) => item.severity === "ERROR")
    .map((item) => {
      const field = String(item.field_name ?? item.field ?? "record");
      const fieldLabel = ({ expected_week_start: "Expected arrival", gross_quantity_lb: "Shipment quantity", status: "Shipment status" } as Record<string, string>)[field] ?? titleCase(field.replaceAll("_", " "));
      const values = item.observed_values ?? [];
      const message = item.message ?? (values.length > 1 ? `${fieldLabel} differs across sources.` : `${fieldLabel} is missing.`);
      return {
        field_label: fieldLabel,
        message: String(message),
        sources: (item.record_ids ?? []).map(String),
        observed_values: values.map((value: unknown) => value == null ? "Missing" : field === "expected_week_start" ? dateShort(String(value)) : field.endsWith("_lb") ? lb(String(value)) : String(value)),
      };
    });
  const summary = "Arrival timing, shipment status, or quantity do not agree across the available records.";
  return {
    ...shared, archetype: "DATA_RECONCILIATION",
    issue: { label: "Action paused", title: "The records conflict, so a safe recommendation is not possible.", summary },
    recommendation: null,
    visual: { ...visual("conflict", "Records that need attention", summary, "records"), conflicts },
    result_visual: null,
    detail_facts: [{ label: "Blocking record issues", value: String(conflicts.length) }],
    suggested_questions: ["Which records conflict?", "What needs to be corrected?", "Why did the system stop?"],
  };
}

function actionTypeFromId(actionId: string): string {
  if (actionId.includes("PARTIAL")) return "PARTIAL_ACCEPT";
  if (actionId.includes("REDIRECT")) return "REDIRECT_DONATION";
  if (actionId.includes("TRANSFER")) return "REQUEST_TRANSFER";
  if (actionId.includes("DONOR")) return "TARGETED_DONOR_REQUEST";
  return "PURCHASE";
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
