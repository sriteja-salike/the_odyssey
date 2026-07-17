import { getCannedAnswer } from "./cannedAnswers";
import { getWorkItems } from "./liveApi";
import type { OperationsAssistantResponse } from "./liveTypes";

const DEMO_THINKING_MS = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom") ? 0 : 900;

export async function guidedDemoResponse(prompt: string): Promise<OperationsAssistantResponse | null> {
  const canned = getCannedAnswer(prompt);
  if (!canned || !isProteinDemoPrompt(prompt)) return canned;
  try {
    const workItem = (await getWorkItems()).find((item) => item.case_key === "scenario_a") ?? null;
    if (!workItem) return canned;
    return { ...canned, response_type: "DECISION", work_item: workItem };
  } catch {
    return canned;
  }
}

export async function waitForGuidedDemo(startedAt: number) {
  const remaining = DEMO_THINKING_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

function isProteinDemoPrompt(prompt: string) {
  const normalized = prompt.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
  return normalized === "what needs my attention first"
    || normalized === "why is the protein shortage urgent"
    || normalized === "tell me more about protein";
}
