/* Run API client. Talks to the FastAPI service under /api/v1 (Vite proxies to
   the backend). When the API is unreachable (no backend running), each call
   falls back to the golden-backed offline implementation so the demo still runs
   with no server. HTTP error responses from a reachable API are surfaced as-is —
   only a network failure triggers the fallback. */
import type { DecisionKind } from "./runState";
import type { Decision } from "./runState";
import type { ScenarioLetter } from "./api";
import type { LiveRun, LiveEvent } from "./liveTypes";
import { oCreateRun, oGetRun, oEvaluateRun, oDecideRun, oGetEvents } from "./offlineApi";

export type { KnowledgeSource, LiveExecution, LiveDecision, LiveRun, LiveEvent } from "./liveTypes";

/** Thrown when the API host can't be reached at all (vs. an HTTP error). */
class OfflineError extends Error {}

interface Envelope<T> { data: T }
const idempotencyHeaders = () => ({ "Idempotency-Key": crypto.randomUUID() });

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Network failure, refused connection, or timeout — backend unreachable.
    throw new OfflineError();
  } finally {
    clearTimeout(timer);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    // Our API always returns a structured {error:{...}} envelope — surface those.
    // Anything else (a proxy/default 404, a 5xx, HTML, or an unrelated service on
    // the port) means our backend isn't really reachable → fall back to offline.
    if (body?.error) throw new Error(body.error.message ?? "Request failed");
    throw new OfflineError();
  }
  return (body as Envelope<T>).data;
}

/** True when the whole app is running without a backend (set on first fallback). */
export let OFFLINE = false;
function markOffline() { OFFLINE = true; }

const keyForLetter = (letter: ScenarioLetter) => `nourishops:active-run:${letter}`;
const activePromises: Partial<Record<ScenarioLetter, Promise<LiveRun>>> = {};

export async function createRun(letter: ScenarioLetter, parentRunId?: string): Promise<LiveRun> {
  try {
    const run = await request<LiveRun>("/runs", {
      method: "POST",
      headers: idempotencyHeaders(),
      body: JSON.stringify({ scenario_key: `scenario_${letter.toLowerCase()}`, parent_run_id: parentRunId }),
    });
    sessionStorage.setItem(keyForLetter(letter), run.run_id);
    return run;
  } catch (e) {
    if (e instanceof OfflineError) {
      markOffline();
      const run = oCreateRun(letter);
      sessionStorage.setItem(keyForLetter(letter), run.run_id);
      return run;
    }
    throw e;
  }
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

export async function getRun(runId: string): Promise<LiveRun> {
  try {
    return await request<LiveRun>(`/runs/${runId}`);
  } catch (e) {
    if (e instanceof OfflineError) { markOffline(); return oGetRun(runId); }
    throw e;
  }
}

export async function evaluateRun(runId: string): Promise<LiveRun> {
  try {
    return await request<LiveRun>(`/runs/${runId}/evaluate`, { method: "POST", headers: idempotencyHeaders(), body: "{}" });
  } catch (e) {
    if (e instanceof OfflineError) { markOffline(); return oEvaluateRun(runId); }
    throw e;
  }
}

export async function decideRun(runId: string, decision: {
  kind: DecisionKind; actionId: string; quantityLb: number; reason?: string;
}): Promise<LiveRun> {
  try {
    const current = await getRun(runId);
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
  } catch (e) {
    if (e instanceof OfflineError) { markOffline(); return oDecideRun(runId, decision as Decision); }
    throw e;
  }
}

export const submitFeedback = (runId: string, rating: "HELPFUL" | "NOT_HELPFUL",
  reason?: string, survey: Record<string, string> = {}) =>
  request<Record<string, unknown>>(`/runs/${runId}/feedback`, {
    method: "POST", headers: idempotencyHeaders(),
    body: JSON.stringify({ rating, reason: reason || null, survey }),
  }).catch((e) => { if (e instanceof OfflineError) { markOffline(); return {}; } throw e; });

export async function getEvents(runId: string): Promise<LiveEvent[]> {
  try {
    return await request<LiveEvent[]>(`/runs/${runId}/events`);
  } catch (e) {
    if (e instanceof OfflineError) { markOffline(); return oGetEvents(runId); }
    throw e;
  }
}
