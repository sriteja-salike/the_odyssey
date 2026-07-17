import type { DecisionKind, Phase } from "./runState";
import type { ScenarioLetter } from "./api";

export interface KnowledgeSource {
  document_id: string;
  source_id: string;
  display_name: string;
  source_kind: string;
  source_version: string;
  observed_at_utc: string;
  payload_sha256: string;
}

export interface LiveExecution {
  execution_id: string;
  action_id: string;
  execution_type: string;
  status: string;
  target_system: string;
  quantity_lb: number;
  cost_usd: string;
  arrival_week_start: string | null;
  external_write_performed: boolean;
}

export interface LiveDecision {
  decision_id: string;
  kind: DecisionKind;
  action_id: string;
  quantity_lb: number;
  reason?: string;
}

export interface LiveRun {
  run_id: string;
  scenario_key: string;
  scenario_id: string;
  parent_run_id: string | null;
  created_at_utc: string;
  state: Exclude<Phase, "ANALYZING">;
  revision: number;
  analysis: Record<string, unknown> | null;
  decision_brief: {
    schema_version: "decision-brief/1.0.0";
    recommendation: { recommendation_id: string } | null;
  } | null;
  decision: LiveDecision | null;
  execution: LiveExecution | null;
  feedback: Record<string, unknown> | null;
  knowledge: {
    current: KnowledgeSource[];
    organizational: KnowledgeSource[];
    simulation: KnowledgeSource[];
  };
}

export interface LiveEvent {
  event_id: string;
  sequence_no: number;
  event_type: string;
  actor_type: string;
  occurred_at_utc: string;
  payload: Record<string, unknown>;
  payload_sha256: string;
}

interface Envelope<T> { data: T }
const idempotencyHeaders = () => ({ "Idempotency-Key": crypto.randomUUID() });

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message ?? body.detail ?? "The simulation service is unavailable.");
  }
  return (body as Envelope<T>).data;
}

const keyForLetter = (letter: ScenarioLetter) => `nourishops:active-run:${letter}`;
const activePromises: Partial<Record<ScenarioLetter, Promise<LiveRun>>> = {};

export async function createRun(letter: ScenarioLetter, parentRunId?: string): Promise<LiveRun> {
  const run = await request<LiveRun>("/runs", {
    method: "POST",
    headers: idempotencyHeaders(),
    body: JSON.stringify({ scenario_key: `scenario_${letter.toLowerCase()}`, parent_run_id: parentRunId }),
  });
  sessionStorage.setItem(keyForLetter(letter), run.run_id);
  return run;
}

export async function activeRun(letter: ScenarioLetter): Promise<LiveRun> {
  if (activePromises[letter]) return activePromises[letter];
  const load = loadActiveRun(letter);
  activePromises[letter] = load;
  try { return await load; } finally { delete activePromises[letter]; }
}

async function loadActiveRun(letter: ScenarioLetter): Promise<LiveRun> {
  const saved = sessionStorage.getItem(keyForLetter(letter));
  if (saved) {
    try { return await getRun(saved); } catch { sessionStorage.removeItem(keyForLetter(letter)); }
  }
  return createRun(letter);
}

export const getRun = (runId: string) => request<LiveRun>(`/runs/${runId}`);

export const evaluateRun = (runId: string) => request<LiveRun>(`/runs/${runId}/evaluate`, {
  method: "POST", headers: idempotencyHeaders(), body: "{}",
});

export async function decideRun(runId: string, decision: {
  kind: DecisionKind; actionId: string; quantityLb: number; reason?: string;
}): Promise<LiveRun> {
  const current = await getRun(runId);
  const recommendationId = current.decision_brief?.recommendation?.recommendation_id;
  if (!recommendationId) throw new Error("Refresh the recommendation before deciding.");
  return request<LiveRun>(`/runs/${runId}/decisions`, {
    method: "POST",
    headers: idempotencyHeaders(),
    body: JSON.stringify({
      kind: decision.kind,
      recommendation_id: recommendationId,
      expected_revision: current.revision,
      action_id: decision.actionId,
      quantity_lb: decision.quantityLb,
      reason: decision.reason ?? null,
    }),
  });
}

export const submitFeedback = (runId: string, rating: "HELPFUL" | "NOT_HELPFUL",
  reason?: string, survey: Record<string, string> = {}) =>
  request<Record<string, unknown>>(`/runs/${runId}/feedback`, {
    method: "POST", headers: idempotencyHeaders(),
    body: JSON.stringify({ rating, reason: reason || null, survey }),
  });

export const getEvents = (runId: string) => request<LiveEvent[]>(`/runs/${runId}/events`);
