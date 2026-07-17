/* Hardcoded, demo-only answers for the Home suggested questions. These short-circuit
   the routing agent for a handful of exact prompts so the guided examples always show
   a realistic, well-formatted reply. All figures are synthetic. */
import type { AgentMetadata, OperationsAssistantResponse } from "./liveTypes";

const FOLLOW_UPS = [
  "What needs my attention first?",
  "Are any deliveries at risk?",
  "What are the expected shipments?",
];

const CANNED: Record<string, { answer: string; suggested?: string[] }> = {
  "what needs my attention first": {
    answer: [
      "Three things need your attention today, in priority order:",
      "",
      "1. Protein is about to fall below the safe minimum. A delayed USDA shipment leaves protein at ~1.3 weeks of supply by Aug 10 — under the 1.5-week floor. Nearest deadline, review by Aug 10.",
      "2. A short-life produce offer won't fit in cold storage. Accepting the full 50,000 lb offer would exceed the 40,000 lb refrigerated limit by 10,000 lb.",
      "3. A snack donation doesn't match current category needs and may need redirecting to a partner food bank.",
      "",
      "Start with the protein shortage — it has the closest deadline and the clearest impact on households served.",
    ].join("\n"),
    suggested: [
      "Are any deliveries at risk?",
      "What are the expected shipments?",
      "Show inventory concerns",
    ],
  },
  "are any deliveries at risk": {
    answer: [
      "Yes — one inbound delivery is currently at risk:",
      "",
      "• USDA protein shipment (PO-4471) — 18,000 lb frozen chicken, expected Aug 4, now delayed with no confirmed reschedule. This is what pushes protein coverage below the 1.5-week safety floor by Aug 10.",
      "",
      "Two other inbound loads are on track:",
      "• Midwest Food Bank produce transfer — Aug 5, confirmed.",
      "• Prairie Farms dairy resupply — Aug 7, confirmed.",
      "",
      "The protein delay is the only one threatening coverage right now, and it's already queued for review.",
    ].join("\n"),
    suggested: [
      "What are the expected shipments?",
      "What needs my attention first?",
      "Show inventory concerns",
    ],
  },
  "show inventory concerns": {
    answer: [
      "Current inventory by category, flagged against each category's safety floor:",
      "",
      "• Protein — 1.3 weeks of supply (below the 1.5-week minimum). Driven by the delayed USDA shipment. Needs action.",
      "• Produce — adequate on hand, but an incoming short-life offer would exceed refrigerated storage capacity.",
      "• Dairy — 2.1 weeks of supply. Within range; watching the Aug 7 resupply.",
      "• Dry / shelf-stable — 4+ weeks of supply. No concern.",
      "",
      "Protein is the only category below its safety floor today.",
    ].join("\n"),
    suggested: [
      "What are the expected shipments?",
      "Are any deliveries at risk?",
      "What needs my attention first?",
    ],
  },
  "what are the expected shipments": {
    answer: [
      "Expected inbound shipments over the next 10 days:",
      "",
      "1. USDA Protein (PO-4471) — 18,000 lb frozen chicken · USDA TEFAP · ETA Aug 4 · DELAYED (no confirmed reschedule)",
      "2. Produce transfer — 12,000 lb mixed produce · Midwest Food Bank · ETA Aug 5 · On track",
      "3. Dairy resupply — 9,000 lb milk & yogurt · Prairie Farms · ETA Aug 7 · Confirmed",
      "4. Dry goods — 15,000 lb canned & shelf-stable · Feeding America · ETA Aug 9 · Scheduled",
      "",
      "Only the USDA protein load is at risk — it's the driver behind the current protein coverage alert.",
    ].join("\n"),
    suggested: [
      "Are any deliveries at risk?",
      "What needs my attention first?",
      "Show inventory concerns",
    ],
  },
};

function normalize(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
}

function cannedAgent(): AgentMetadata {
  return {
    requested_mode: "offline",
    effective_mode: "offline",
    status: "verified",
    role: "OPERATIONS_ASSISTANT",
    provider: null,
    model: null,
    prompt_version: "operations-agent/1.0.0",
    output_schema_version: "operations-agent-output/1.0.0",
    tool_contract_version: "operations-agent-tools/1.0.0",
    tool_calls: [],
    fallback_code: null,
  };
}

/** Returns a fully-formed assistant response for a known guided prompt, or null. */
export function getCannedAnswer(prompt: string): OperationsAssistantResponse | null {
  const entry = CANNED[normalize(prompt)];
  if (!entry) return null;
  return {
    schema_version: "operations-assistant-response/2.0.0",
    response_type: "ANSWER",
    answer: entry.answer,
    work_item: null,
    suggested_questions: entry.suggested ?? FOLLOW_UPS,
    authority_note:
      "These figures are synthetic. The agent can explain and recommend from verified options; only a manager can approve a simulated action.",
    agent: cannedAgent(),
    guardrails: {
      facts: "Hardcoded synthetic demonstration data",
      constraints: "Illustrative only",
      approval: "Human manager required",
    },
    synthetic: true,
  };
}
