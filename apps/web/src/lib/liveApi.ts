/* Durable run API with an explicit browser-only demo fallback. Domain errors
   from a reachable API are always surfaced; only connection failures/timeouts
   enter offline mode. */
import { getGolden, type ScenarioLetter } from "./api";
import { letterFromRunId } from "./run";
import type { Decision } from "./runState";
import type { DecisionKind } from "./runState";
import type { LiveEvent, LiveRun } from "./liveTypes";
import {
  oCreateRun,
  oDecideRun,
  oEvaluateRun,
  oGetEvents,
  oGetRun,
  oSubmitFeedback,
  oSubmitOutcomeFeedback,
} from "./offlineApi";

export type {
  ActionIntent,
  AgentMetadata,
  DecisionAction,
  DecisionBrief,
  DecisionRationale,
  DecisionTrace,
  DecisionTraceStage,
  KnowledgeSource,
  LiveDecision,
  LiveEvent,
  LiveExecution,
  LiveRun,
  SolverView,
} from "./liveTypes";

interface Envelope<T> { data: T }

class OfflineError extends Error {}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const idempotencyHeaders = () => ({ "Idempotency-Key": crypto.randomUUID() });

async function request<T>(path: string, init?: RequestInit, timeoutMs = 5000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new OfflineError("The decision API is unreachable.");
  } finally {
    clearTimeout(timer);
  }

  const body = await response.json().catch(() => null) as (Envelope<T> & {
    error?: { message?: string };
  }) | null;
  if (!response.ok) {
    if (response.status >= 500 && !body?.error && await healthCheckFailed()) {
      throw new OfflineError("The decision API health check failed.");
    }
    throw new ApiError(
      body?.error?.message ?? `The decision API returned ${response.status} ${response.statusText}.`,
      response.status,
    );
  }
  if (!body || !("data" in body)) {
    throw new ApiError("The decision API returned an invalid response envelope.", response.status);
  }
  return body.data;
}

async function healthCheckFailed(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch("/api/v1/health/ready", { signal: controller.signal });
    return !response.ok;
  } catch {
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export type ConnectionMode = "LIVE" | "OFFLINE_DEMO";
export let OFFLINE = false;
const connectivityListeners = new Set<() => void>();

function markOffline() {
  if (OFFLINE) return;
  OFFLINE = true;
  connectivityListeners.forEach((listener) => listener());
}

export function getConnectionMode(): ConnectionMode {
  return OFFLINE ? "OFFLINE_DEMO" : "LIVE";
}

export function subscribeConnectivity(listener: () => void): () => void {
  connectivityListeners.add(listener);
  return () => connectivityListeners.delete(listener);
}

const keyForLetter = (letter: ScenarioLetter) => `nourishops:active-run:${letter}`;
const activePromises: Partial<Record<ScenarioLetter, Promise<LiveRun>>> = {};

export async function createRun(letter: ScenarioLetter, parentRunId?: string): Promise<LiveRun> {
  if (OFFLINE) {
    const run = oCreateRun(letter, parentRunId);
    sessionStorage.setItem(keyForLetter(letter), run.run_id);
    return run;
  }
  try {
    const run = await request<LiveRun>("/runs", {
      method: "POST",
      headers: idempotencyHeaders(),
      body: JSON.stringify({ scenario_key: `scenario_${letter.toLowerCase()}`, parent_run_id: parentRunId }),
    });
    sessionStorage.setItem(keyForLetter(letter), run.run_id);
    return run;
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    const run = oCreateRun(letter, parentRunId);
    sessionStorage.setItem(keyForLetter(letter), run.run_id);
    return run;
  }
}

export async function activeRun(letter: ScenarioLetter): Promise<LiveRun> {
  if (activePromises[letter]) return activePromises[letter];
  const load = loadActiveRun(letter);
  activePromises[letter] = load;
  try {
    return await load;
  } finally {
    delete activePromises[letter];
  }
}

async function loadActiveRun(letter: ScenarioLetter): Promise<LiveRun> {
  const saved = sessionStorage.getItem(keyForLetter(letter));
  if (saved) {
    try {
      return await getRun(saved);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      sessionStorage.removeItem(keyForLetter(letter));
    }
  }
  return createRun(letter);
}

export async function getRun(runId: string): Promise<LiveRun> {
  if (OFFLINE) return oGetRun(runId);
  try {
    return await request<LiveRun>(`/runs/${runId}`);
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oGetRun(runId);
  }
}

export async function evaluateRun(runId: string): Promise<LiveRun> {
  if (OFFLINE) return oEvaluateRun(runId);
  try {
    return await request<LiveRun>(`/runs/${runId}/evaluate`, {
      method: "POST",
      headers: idempotencyHeaders(),
      body: "{}",
    }, 15_000);
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oEvaluateRun(runId);
  }
}

export interface ActionPreview {
  run_id: string;
  action_id: string;
  requested_quantity_lb: number;
  decision_status: string;
  feasible: boolean;
  evaluation: {
    evaluated_action_id?: string;
    cost_usd?: string;
    failed_codes?: string[];
    failed_constraints?: string[];
    [key: string]: unknown;
  };
  would_be_recommended: boolean;
  recommended_action: Record<string, unknown> | null;
  simulated: true;
}

function offlinePreview(runId: string, actionId: string, quantityLb: number): ActionPreview {
  const letter = letterFromRunId(runId) ?? "A";
  const golden = getGolden(letter);
  const evaluation = golden.action_evaluations.find((item) =>
    item.action_id === actionId && item.requested_quantity_lb === quantityLb
  );
  const feasible = Boolean(evaluation?.feasible);
  return {
    run_id: runId,
    action_id: actionId,
    requested_quantity_lb: quantityLb,
    decision_status: feasible ? "READY_FOR_REVIEW" : "ABSTAINED",
    feasible,
    evaluation: evaluation ? {
      evaluated_action_id: evaluation.evaluated_action_id,
      cost_usd: evaluation.cost_usd,
      failed_codes: evaluation.failed_constraint_codes,
    } : { failed_codes: ["OFFLINE_FROZEN_QUANTITY_ONLY"] },
    would_be_recommended: evaluation?.evaluated_action_id === golden.recommended_action?.evaluated_action_id,
    recommended_action: golden.recommended_action as unknown as Record<string, unknown> | null,
    simulated: true,
  };
}

export async function previewAction(runId: string, actionId: string, quantityLb: number): Promise<ActionPreview> {
  if (OFFLINE) return offlinePreview(runId, actionId, quantityLb);
  try {
    const current = await getRun(runId);
    if (OFFLINE) return offlinePreview(runId, actionId, quantityLb);
    const recommendationId = current.decision_brief?.recommendation?.recommendation_id;
    if (!recommendationId) throw new Error("Refresh the recommendation before changing the plan.");
    return await request<ActionPreview>(`/runs/${runId}/action-previews`, {
      method: "POST",
      body: JSON.stringify({
        recommendation_id: recommendationId,
        expected_revision: current.revision,
        action_id: actionId,
        quantity_lb: quantityLb,
      }),
    });
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return offlinePreview(runId, actionId, quantityLb);
  }
}

export async function decideRun(runId: string, decision: {
  kind: DecisionKind;
  actionId: string;
  quantityLb: number;
  reason?: string;
}): Promise<LiveRun> {
  if (OFFLINE) return oDecideRun(runId, decision as Decision);
  try {
    const current = await getRun(runId);
    if (OFFLINE) return oDecideRun(runId, decision as Decision);
    const recommendationId = current.decision_brief?.recommendation?.recommendation_id;
    if (!recommendationId) throw new Error("Refresh the recommendation before deciding.");
    return await request<LiveRun>(`/runs/${runId}/decisions`, {
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
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oDecideRun(runId, decision as Decision);
  }
}

export async function submitFeedback(
  runId: string,
  rating: "HELPFUL" | "NOT_HELPFUL",
  reason?: string,
  survey: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  if (OFFLINE) return oSubmitFeedback(runId, rating, reason, survey);
  try {
    return await request<Record<string, unknown>>(`/runs/${runId}/feedback`, {
      method: "POST",
      headers: idempotencyHeaders(),
      body: JSON.stringify({ rating, reason: reason || null, survey }),
    });
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oSubmitFeedback(runId, rating, reason, survey);
  }
}

export async function submitOutcomeFeedback(
  runId: string,
  outcome: "SUCCESSFUL" | "PARTIAL" | "FAILED",
  reason?: string,
): Promise<Record<string, unknown>> {
  if (OFFLINE) return oSubmitOutcomeFeedback(runId, outcome, reason);
  try {
    return await request<Record<string, unknown>>(`/runs/${runId}/outcome-feedback`, {
      method: "POST",
      headers: idempotencyHeaders(),
      body: JSON.stringify({ outcome, reason: reason || null, survey: {} }),
    });
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oSubmitOutcomeFeedback(runId, outcome, reason);
  }
}

export async function getEvents(runId: string): Promise<LiveEvent[]> {
  if (OFFLINE) return oGetEvents(runId);
  try {
    return await request<LiveEvent[]>(`/runs/${runId}/events`);
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    markOffline();
    return oGetEvents(runId);
  }
}
