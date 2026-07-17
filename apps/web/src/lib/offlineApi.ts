/* Offline fallback for the run API.

   The backend (FastAPI + Postgres) owns the real lifecycle, but the build
   contract requires the judge path to run offline. When the API is unreachable,
   liveApi routes here and synthesizes a run from the frozen golden data + the
   browser-local run phase, so the whole flow (analyze → decide → result) still
   works with no backend. Numbers still come only from the golden. */
import type { LiveRun, LiveEvent, LiveDecision, KnowledgeSource } from "./liveTypes";
import type { Decision } from "./runState";
import { readRunState, setRunState, resetRun } from "./runState";
import { letterFromRunId } from "./run";
import {
  getGolden, getOverlay, getNotice, syntheticRunId, type ScenarioLetter,
} from "./api";

const scenarioKey = (letter: ScenarioLetter) => `scenario_${letter.toLowerCase()}`;

function knowledgeFor(letter: ScenarioLetter): LiveRun["knowledge"] {
  const notice = getNotice(letter);
  const overlay = getOverlay(letter);
  const inboundId = overlay.overlay.inbound_mutations[0]?.inbound_id ?? "INB-LEDGER";
  const current: KnowledgeSource[] = [];
  if (notice) {
    current.push(src("DOC-NOTICE", "EVD-USDA-DELAY-NOTICE", notice.title, "SYNTHETIC_NOTICE", notice.recorded_at));
  }
  current.push(src("DOC-INBOUND", inboundId, "Planned inbound ledger", "INBOUND_LEDGER", overlay.planning_date));
  const organizational: KnowledgeSource[] = [
    src("DOC-POLICY", "POLICY-CATALOG", "Category stocking policies", "POLICY", overlay.planning_date),
    src("DOC-HISTORY", "FLOW-HISTORY", "Recent distribution history", "HISTORICAL_FLOW", overlay.planning_date),
  ];
  return { current, organizational, simulation: [] };
}
function src(document_id: string, source_id: string, display_name: string, source_kind: string, observed_at_utc: string): KnowledgeSource {
  return { document_id, source_id, display_name, source_kind, source_version: "1.0.0", observed_at_utc, payload_sha256: "offline" };
}

function buildRun(letter: ScenarioLetter, runId: string): LiveRun {
  const golden = getGolden(letter);
  const st = readRunState(runId);
  const phase = st.phase;
  const analyzed = phase !== "DRAFT" && phase !== "ANALYZING";
  const isReady = phase === "READY_FOR_REVIEW";

  const decision: LiveDecision | null = st.decision
    ? { decision_id: `DEC-${letter}-offline`, kind: st.decision.kind, action_id: st.decision.actionId, quantity_lb: st.decision.quantityLb, reason: st.decision.reason }
    : null;

  const execution = phase === "APPROVED" && st.decision
    ? { execution_id: `EXE-${letter}-offline`, action_id: st.decision.actionId, execution_type: "SIMULATED", status: "SIMULATED", target_system: "SIMULATION", quantity_lb: st.decision.quantityLb, cost_usd: "0.00", arrival_week_start: null, external_write_performed: false }
    : null;

  const recId = golden.recommended_action?.recommendation_id ?? `REC-${letter}-001`;

  return {
    run_id: runId,
    scenario_key: scenarioKey(letter),
    scenario_id: golden.scenario_id,
    parent_run_id: null,
    created_at_utc: golden.fixed_clock_utc,
    state: (phase === "ANALYZING" ? "DRAFT" : phase) as LiveRun["state"],
    revision: analyzed ? 1 : 0,
    analysis: analyzed ? (golden as unknown as Record<string, unknown>) : null,
    decision_brief: isReady ? { schema_version: "decision-brief/1.0.0", recommendation: { recommendation_id: recId } } : null,
    decision,
    execution,
    feedback: null,
    knowledge: knowledgeFor(letter),
  };
}

export function oCreateRun(letter: ScenarioLetter): LiveRun {
  const runId = syntheticRunId(letter);
  resetRun(runId);
  return buildRun(letter, runId);
}

export function oGetRun(runId: string): LiveRun {
  const letter = letterFromRunId(runId) ?? "A";
  return buildRun(letter, runId);
}

export function oEvaluateRun(runId: string): LiveRun {
  const letter = letterFromRunId(runId) ?? "A";
  const status = getGolden(letter).decision_status;
  setRunState(runId, { phase: status === "ABSTAINED" ? "ABSTAINED" : "READY_FOR_REVIEW" });
  return buildRun(letter, runId);
}

export function oDecideRun(runId: string, decision: Decision): LiveRun {
  const letter = letterFromRunId(runId) ?? "A";
  const phase = decision.kind === "reject" ? "REJECTED" : decision.kind === "defer" ? "DEFERRED" : "APPROVED";
  setRunState(runId, { phase, decision });
  return buildRun(letter, runId);
}

export function oGetEvents(runId: string): LiveEvent[] {
  const letter = letterFromRunId(runId) ?? "A";
  const golden = getGolden(letter);
  return (golden.audit_oracle ?? []).map((e) => ({
    event_id: `EVT-${e.sequence}`,
    sequence_no: e.sequence,
    event_type: e.event_type,
    actor_type: "SYSTEM",
    occurred_at_utc: golden.fixed_clock_utc,
    payload: { semantic_id: e.semantic_id },
    payload_sha256: "offline",
  }));
}
