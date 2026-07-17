/* Client-side run phase machine (mock of the backend run state).

   No backend yet, so a run's phase lives in sessionStorage keyed by run id, so a
   refresh restores it (01 §3.4). When the real API lands this is replaced by
   GET /runs/{id} folding server events. The committed analysis outcome
   (READY_FOR_REVIEW / ABSTAINED / …) comes from the golden, not invented here. */
import { useCallback, useSyncExternalStore } from "react";

export type Phase =
  | "DRAFT"
  | "ANALYZING"
  | "READY_FOR_REVIEW"
  | "ABSTAINED"
  | "APPROVED"
  | "REJECTED"
  | "DEFERRED";

export type DecisionKind = "approve" | "edit-approve" | "reject" | "defer";

export interface Decision {
  kind: DecisionKind;
  actionId: string;
  quantityLb: number;
  reason?: string;
}

/** Pending manager selection in READY_FOR_REVIEW, before a decision is committed
    (01 §4.4/§4.5). Survives navigation to Compare so the manager row can render. */
export interface Selection {
  actionId: string;
  quantityLb: number;
  reason: string;
  edited: boolean; // true when quantity was changed via Edit quantity
}

export interface RunState {
  phase: Phase;
  decision?: Decision;
  selection?: Selection;
}

const KEY = (runId: string) => `nourishops:run:${runId}`;
const listeners = new Set<() => void>();

function read(runId: string): RunState {
  try {
    const raw = sessionStorage.getItem(KEY(runId));
    if (raw) return JSON.parse(raw) as RunState;
  } catch {
    /* ignore */
  }
  return { phase: "DRAFT" };
}

function write(runId: string, state: RunState) {
  sessionStorage.setItem(KEY(runId), JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function setRunState(runId: string, state: RunState) {
  write(runId, state);
}

export function readRunState(runId: string): RunState {
  return read(runId);
}

export function resetRun(runId: string) {
  write(runId, { phase: "DRAFT" });
}

/** Subscribe a component to a run's state. */
export function useRunState(runId: string): [RunState, (s: RunState) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  const getSnapshot = useCallback(() => sessionStorage.getItem(KEY(runId)) ?? "", [runId]);
  useSyncExternalStore(subscribe, getSnapshot, () => "");
  const state = read(runId);
  const set = useCallback((s: RunState) => write(runId, s), [runId]);
  return [state, set];
}
