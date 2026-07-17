/* Browser-only demo fallback. It uses frozen golden outputs and mirrors the
   complete live contract; it never invents a new decision or re-ranks actions. */
import type {
  ActionIntent,
  AgentMetadata,
  DecisionAction,
  DecisionBrief,
  DecisionTrace,
  LiveDecision,
  LiveEvent,
  LiveExecution,
  LiveRun,
  KnowledgeSource,
  SolverView,
} from "./liveTypes";
import type { Decision, RunState } from "./runState";
import { readRunState, resetRun, setRunState } from "./runState";
import { letterFromRunId } from "./run";
import {
  getActionMap,
  getGolden,
  getNotice,
  getOverlay,
  getScenarioEvidence,
  syntheticRunId,
  type ActionRecord,
  type ScenarioLetter,
} from "./api";
import type { ActionEvaluation, Risk } from "../types/golden";

const ZERO_HASH = "0".repeat(64);
const scenarioKey = (letter: ScenarioLetter) => `scenario_${letter.toLowerCase()}`;
const recordKey = (runId: string) => `nourishops:offline-record:${runId}`;

interface OfflineRecord {
  parent_run_id: string | null;
  feedback: Record<string, unknown> | null;
  outcome_feedback: Record<string, unknown> | null;
}

function readRecord(runId: string): OfflineRecord {
  try {
    const stored = sessionStorage.getItem(recordKey(runId));
    if (stored) return JSON.parse(stored) as OfflineRecord;
  } catch {
    // A corrupt browser-only record should not break the frozen demo path.
  }
  return { parent_run_id: null, feedback: null, outcome_feedback: null };
}

function writeRecord(runId: string, record: OfflineRecord) {
  sessionStorage.setItem(recordKey(runId), JSON.stringify(record));
}

function knowledgeFor(letter: ScenarioLetter): LiveRun["knowledge"] {
  const notice = getNotice(letter);
  const overlay = getOverlay(letter);
  const inboundId = overlay.overlay.inbound_mutations[0]?.inbound_id ?? "INB-LEDGER";
  const current: KnowledgeSource[] = [];
  if (notice) {
    current.push(source("DOC-NOTICE", `notice-${letter}`, notice.title, notice.source_kind, notice.recorded_at));
  }
  current.push(source("DOC-INBOUND", inboundId, "Planned inbound ledger", "INBOUND_LEDGER", overlay.planning_date));
  const organizational = [
    source("DOC-POLICY", "POLICY-CATALOG", "Category stocking policies", "POLICY", overlay.planning_date),
    source("DOC-HISTORY", "FLOW-HISTORY", "Recent distribution history", "HISTORICAL_FLOW", overlay.planning_date),
  ];
  return { current, organizational, simulation: [] };
}

function source(
  document_id: string,
  source_id: string,
  display_name: string,
  source_kind: string,
  observed_at_utc: string,
): KnowledgeSource {
  return {
    document_id,
    source_id,
    display_name,
    source_kind,
    source_version: "1.0.0",
    observed_at_utc,
    payload_sha256: ZERO_HASH,
  };
}

const SOLVER: SolverView = {
  solver_id: "catalog-enumeration",
  method: "Exhaustive deterministic catalog evaluation",
  version: "1.0.0",
  deterministic: true,
  problem_types: ["SINGLE_ACTION_CATALOG"],
  capabilities: ["constraint evaluation", "feasible-action ranking", "safe abstention"],
  limitations: ["frozen synthetic snapshots", "single approved action"],
};

function agent(role: AgentMetadata["role"]): AgentMetadata {
  return {
    requested_mode: "offline",
    effective_mode: "offline_fallback",
    status: "fallback",
    role,
    provider: null,
    model: null,
    prompt_version: "agent-system/1.0.0",
    output_schema_version: "agent-output/1.0.0",
    tool_contract_version: "agent-tools/1.0.0",
    tool_calls: [],
    fallback_code: "FRONTEND_OFFLINE_DEMO",
  };
}

function actionView(evaluation: ActionEvaluation, catalog: Record<string, ActionRecord>): DecisionAction {
  const action = catalog[evaluation.action_id];
  return {
    evaluated_action_id: evaluation.evaluated_action_id,
    action_id: evaluation.action_id,
    display_name: action?.display_name ?? evaluation.action_id,
    action_type: action?.action_type ?? "OPERATIONS_TASK",
    category_id: action?.category_id ?? null,
    requested_quantity_lb: evaluation.requested_quantity_lb,
    cost_usd: evaluation.cost_usd,
    feasible: evaluation.feasible,
    rank: evaluation.rank,
    score: evaluation.score_unrounded ?? evaluation.score_display,
    failed_constraints: evaluation.failed_constraint_codes,
    failed_detail: (evaluation.failed_constraints ?? []) as unknown as Record<string, unknown>[],
    evidence_ids: evaluation.evidence_ids ?? action?.evidence_ids ?? [],
  };
}

function riskView(risk: Risk | undefined): DecisionBrief["primary_risk"] {
  if (!risk) return null;
  const raw = risk as unknown as Record<string, unknown>;
  const common = new Set(["risk_id", "risk_type", "category_id", "priority_score", "is_primary"]);
  return {
    risk_id: risk.risk_id,
    risk_type: risk.risk_type,
    category_id: risk.category_id ?? null,
    priority_score: risk.priority_score == null ? null : String(risk.priority_score),
    details: Object.fromEntries(Object.entries(raw).filter(([key]) => !common.has(key))),
  };
}

function buildBrief(letter: ScenarioLetter, runId: string): DecisionBrief {
  const golden = getGolden(letter);
  const overlay = getOverlay(letter);
  const catalog = getActionMap(golden.scenario_id);
  const actions = golden.action_evaluations.map((evaluation) => actionView(evaluation, catalog));
  const rec = golden.recommended_action;
  const selected = rec
    ? actions.find((item) => item.evaluated_action_id === rec.evaluated_action_id) ?? null
    : null;
  const recommendation = rec && selected ? {
    recommendation_id: rec.recommendation_id,
    risk_id: rec.risk_id,
    action: selected,
    confidence_label: rec.confidence,
    confidence_value: rec.confidence_value,
    requires_human_approval: true as const,
  } : null;
  const evidence = getScenarioEvidence(letter).map((item) => ({
    evidence_id: item.evidence_id,
    source_kind: item.source_kind,
    trust_level: item.trust_level,
    title: item.title,
    summary: item.body,
    structured_facts: item.structured_facts ?? [],
    record_version: item.record_version ?? 1,
  }));
  const explanationEvidence = Array.from(new Set([
    ...(selected?.evidence_ids ?? []),
    ...(evidence.map((item) => item.evidence_id)),
  ])).filter((id) => id.startsWith("EVD-"));
  const primary = golden.risks.find((risk) => risk.is_primary) ?? golden.risks[0];
  const rationale = recommendation ? {
    recommendation_id: recommendation.recommendation_id,
    headline: "Verified response ready for review",
    why_now: `The deterministic engine identified an active ${primary.risk_type.toLowerCase().replaceAll("_", " ")} risk.`,
    why_this_action: "This is the highest-ranked feasible catalog action under the frozen scenario constraints.",
    uncertainty: "The result uses synthetic snapshots, remains a simulation, and requires manager approval.",
    why_not: actions
      .filter((item) => item.evaluated_action_id !== selected?.evaluated_action_id)
      .map((item) => ({
        evaluated_action_id: item.evaluated_action_id,
        explanation: item.feasible
          ? "This feasible option ranks below the selected catalog action under the verified rules."
          : `This option is not feasible because it fails ${item.failed_constraints.join(", ") || "a hard constraint"}.`,
      })),
    evidence_ids: explanationEvidence,
    requires_human_approval: true as const,
    simulation_only: true as const,
  } : null;
  const selectedCatalog = selected ? catalog[selected.action_id] : undefined;

  return {
    schema_version: "decision-brief/1.0.0",
    run_id: runId,
    scenario_id: golden.scenario_id,
    scenario_name: overlay.display_name,
    decision_status: golden.decision_status,
    status_message: golden.decision_status === "ABSTAINED"
      ? "No recommendation was produced because decision-critical facts are unresolved."
      : "A verified recommendation is ready for manager review.",
    analysis_output_hash: ZERO_HASH,
    solver: SOLVER,
    primary_risk: riskView(primary),
    recommendation,
    rationale,
    alternatives: actions.filter((item) => item.feasible && item.evaluated_action_id !== selected?.evaluated_action_id)
      .sort((left, right) => (left.rank ?? 10_000) - (right.rank ?? 10_000)),
    rejected_options: actions.filter((item) => !item.feasible),
    blocking_issues: golden.blocking_issues as Record<string, unknown>[],
    evidence,
    approval: selectedCatalog ? {
      required: true,
      allowed_commands: ["APPROVE", "EDIT_AND_APPROVE", "REJECT", "DEFER"],
      editable: selectedCatalog.minimum_quantity_lb !== selectedCatalog.maximum_quantity_lb,
      minimum_quantity_lb: selectedCatalog.minimum_quantity_lb,
      maximum_quantity_lb: selectedCatalog.maximum_quantity_lb,
      quantity_increment_lb: selectedCatalog.quantity_increment_lb,
      external_writes_allowed: false,
    } : {
      required: false,
      allowed_commands: [],
      editable: false,
      external_writes_allowed: false,
    },
    agent: agent("DECISION_ORCHESTRATOR"),
    synthetic: true,
  };
}

function buildTrace(letter: ScenarioLetter, runId: string): DecisionTrace {
  const status = getGolden(letter).decision_status;
  return {
    schema_version: "decision-trace/1.0.0",
    trace_id: `TRC-${letter}OFFLINE`,
    run_id: runId,
    exposes_chain_of_thought: false,
    final_status: status === "ABSTAINED" ? "ABSTAINED" : "PASSED",
    stages: [
      stage("CONTEXT_FROZEN", "CONTEXT_LAYER", "PASSED", "Scenario inputs and knowledge snapshots were pinned for this run."),
      stage("DETERMINISTIC_SOLVER", "SOLVER", "PASSED", "The deterministic engine evaluated constraints and ranked the frozen action catalog.", { solver_id: SOLVER.solver_id }),
      stage("DECISION_ORCHESTRATOR", "AI_AGENT", "FALLBACK", "A verified template explanation was used because the live API was unavailable.", { effective_mode: "offline_fallback" }),
      stage("INDEPENDENT_REVIEWER", "AI_AGENT", "SKIPPED", "The browser fallback cannot call an independent model reviewer.", { effective_mode: "offline_fallback" }),
      stage("AUTHORITY_VALIDATOR", "POLICY_ENGINE", "PASSED", "The displayed recommendation still matches the frozen deterministic result."),
    ],
  };
}

function stage(
  name: string,
  actorName: string,
  status: "PASSED" | "FALLBACK" | "SKIPPED",
  summary: string,
  details: Record<string, unknown> = {},
) {
  return {
    stage: name,
    actor: actorName,
    status,
    duration_ms: 0,
    input_sha256: ZERO_HASH,
    output_sha256: status === "SKIPPED" ? null : ZERO_HASH,
    summary,
    details,
  };
}

function executionType(actionType: string): string {
  return ({
    PURCHASE: "PURCHASE_ORDER_REQUEST",
    REQUEST_TRANSFER: "PEER_TRANSFER_REQUEST",
    TARGETED_DONOR_REQUEST: "DONOR_OUTREACH_REQUEST",
    ACCEPT_DONATION: "DONATION_ACCEPTANCE_REQUEST",
    PARTIAL_ACCEPT: "PARTIAL_DONATION_ACCEPTANCE_REQUEST",
    REDIRECT_DONATION: "DONATION_REDIRECT_REQUEST",
    ACCELERATE_DISTRIBUTION: "DISTRIBUTION_TASK_REQUEST",
  } as Record<string, string>)[actionType] ?? "OPERATIONS_TASK_REQUEST";
}

function buildExecution(letter: ScenarioLetter, runId: string, state: RunState): {
  intent: ActionIntent | null;
  receipt: LiveExecution | null;
} {
  if (state.phase !== "APPROVED" || !state.decision) return { intent: null, receipt: null };
  const golden = getGolden(letter);
  const evaluation = golden.action_evaluations.find((item) =>
    item.action_id === state.decision?.actionId && item.requested_quantity_lb === state.decision.quantityLb
  );
  const action = getActionMap(golden.scenario_id)[state.decision.actionId];
  if (!evaluation || !action || !golden.recommended_action) return { intent: null, receipt: null };
  const decisionId = `DEC-${letter}OFFLINE`;
  const intentId = `INT-${letter}OFFLINE`;
  const type = executionType(action.action_type);
  const arrival = action.arrival_week_start || null;
  const intent: ActionIntent = {
    schema_version: "action-intent/1.0.0",
    action_intent_id: intentId,
    run_id: runId,
    decision_id: decisionId,
    recommendation_id: golden.recommended_action.recommendation_id,
    action_id: action.action_id,
    action_type: action.action_type,
    execution_type: type,
    adapter_id: "simulated-operations-v1",
    mode: "SIMULATED",
    quantity_lb: state.decision.quantityLb,
    cost_usd: evaluation.cost_usd,
    arrival_week_start: arrival,
    requires_human_approval: true,
    approved_by: "MANAGER_UI",
    external_write_allowed: false,
    authority_input_sha256: ZERO_HASH,
    created_at_utc: golden.fixed_clock_utc,
  };
  return {
    intent,
    receipt: {
      schema_version: "execution-receipt/1.0.0",
      execution_id: `SIM-${letter}OFFLINE`,
      action_intent_id: intentId,
      run_id: runId,
      action_id: action.action_id,
      execution_type: type,
      adapter_id: "simulated-operations-v1",
      mode: "SIMULATED",
      status: "SIMULATED_COMPLETED",
      target_system: "Synthetic operations gateway",
      quantity_lb: state.decision.quantityLb,
      cost_usd: evaluation.cost_usd,
      arrival_week_start: arrival,
      request_sha256: ZERO_HASH,
      external_write_performed: false,
      completed_at_utc: golden.fixed_clock_utc,
    },
  };
}

function buildRun(letter: ScenarioLetter, runId: string): LiveRun {
  const golden = getGolden(letter);
  const storedState = readRunState(runId);
  const state = storedState.phase === "ANALYZING" ? "DRAFT" : storedState.phase;
  const analyzed = state !== "DRAFT";
  const records = readRecord(runId);
  const execution = buildExecution(letter, runId, storedState);
  const decision: LiveDecision | null = storedState.decision ? {
    decision_id: `DEC-${letter}OFFLINE`,
    kind: storedState.decision.kind,
    action_id: storedState.decision.actionId,
    quantity_lb: storedState.decision.quantityLb,
    reason: storedState.decision.reason ?? null,
    recommendation_id: golden.recommended_action?.recommendation_id,
  } : null;
  const events = buildEvents(letter, runId, storedState, records);

  return {
    run_id: runId,
    scenario_key: scenarioKey(letter),
    scenario_id: golden.scenario_id,
    parent_run_id: records.parent_run_id,
    created_at_utc: golden.fixed_clock_utc,
    state,
    revision: events.length,
    analysis: analyzed ? (golden as unknown as Record<string, unknown>) : null,
    decision_brief: analyzed ? buildBrief(letter, runId) : null,
    decision,
    execution: execution.receipt,
    action_intent: execution.intent,
    execution_receipt: execution.receipt,
    feedback: records.feedback,
    outcome_feedback: records.outcome_feedback,
    decision_trace: analyzed ? buildTrace(letter, runId) : null,
    solver: analyzed ? SOLVER : null,
    agent: analyzed ? agent("DECISION_ORCHESTRATOR") : null,
    reviewer: analyzed ? agent("INDEPENDENT_REVIEWER") : null,
    knowledge: knowledgeFor(letter),
  };
}

export function oCreateRun(letter: ScenarioLetter, parentRunId?: string): LiveRun {
  const runId = `${syntheticRunId(letter)}-${crypto.randomUUID().slice(0, 8)}`;
  resetRun(runId);
  writeRecord(runId, {
    parent_run_id: parentRunId ?? null,
    feedback: null,
    outcome_feedback: null,
  });
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
  const golden = getGolden(letter);
  if (decision.kind === "approve" || decision.kind === "edit-approve") {
    const frozenEvaluation = golden.action_evaluations.find((item) =>
      item.action_id === decision.actionId && item.requested_quantity_lb === decision.quantityLb
    );
    if (!frozenEvaluation) {
      throw new Error("Offline demo mode can approve only a frozen evaluated quantity. Reconnect to recheck an edited plan.");
    }
    if (decision.actionId !== golden.recommended_action?.action_id && !decision.reason?.trim()) {
      throw new Error("Add a reason before approving a different action.");
    }
  }
  const phase = decision.kind === "reject" ? "REJECTED" : decision.kind === "defer" ? "DEFERRED" : "APPROVED";
  setRunState(runId, { phase, decision });
  return buildRun(letter, runId);
}

export function oSubmitFeedback(
  runId: string,
  rating: "HELPFUL" | "NOT_HELPFUL",
  reason?: string,
  survey: Record<string, string> = {},
): Record<string, unknown> {
  const record = readRecord(runId);
  const feedback = { feedback_id: `FDB-${crypto.randomUUID().slice(0, 8)}`, rating, reason: reason || null, survey };
  writeRecord(runId, { ...record, feedback });
  return feedback;
}

export function oSubmitOutcomeFeedback(
  runId: string,
  outcome: "SUCCESSFUL" | "PARTIAL" | "FAILED",
  reason?: string,
): Record<string, unknown> {
  const run = oGetRun(runId);
  if (!run.execution_receipt) throw new Error("Approve a simulated action before recording its outcome.");
  if (outcome !== "SUCCESSFUL" && !reason?.trim()) throw new Error("Describe a partial or failed outcome.");
  const record = readRecord(runId);
  const feedback = {
    outcome_feedback_id: `OUT-${crypto.randomUUID().slice(0, 8)}`,
    execution_id: run.execution_receipt.execution_id,
    outcome,
    reason: reason || null,
  };
  writeRecord(runId, { ...record, outcome_feedback: feedback });
  return feedback;
}

export function oGetEvents(runId: string): LiveEvent[] {
  const letter = letterFromRunId(runId) ?? "A";
  return buildEvents(letter, runId, readRunState(runId), readRecord(runId));
}

function buildEvents(
  letter: ScenarioLetter,
  runId: string,
  state: RunState,
  records: OfflineRecord,
): LiveEvent[] {
  const golden = getGolden(letter);
  const events: LiveEvent[] = [];
  const push = (event_type: string, actor_type: string, payload: Record<string, unknown> = {}) => {
    const sequence = events.length + 1;
    events.push({
      event_id: `EVT-${letter}OFFLINE-${sequence}`,
      sequence_no: sequence,
      event_type,
      actor_type,
      occurred_at_utc: golden.fixed_clock_utc,
      payload,
      payload_sha256: ZERO_HASH,
    });
  };
  push("RUN_CREATED", "SYSTEM", { state: "DRAFT", scenario_id: golden.scenario_id });
  const analyzed = state.phase !== "DRAFT" && state.phase !== "ANALYZING";
  if (analyzed) {
    for (const item of golden.audit_oracle) {
      if (["RUN_CREATED", "MANAGER_APPROVED", "SIMULATED_ACTION_APPLIED"].includes(item.event_type)) continue;
      if (item.event_type.startsWith("RECOMMENDATION_")) continue;
      push(item.event_type, "SYSTEM", { semantic_id: item.semantic_id });
    }
    push("DECISION_TRACE_RECORDED", "SYSTEM", { decision_trace: buildTrace(letter, runId) });
    push(golden.decision_status === "ABSTAINED" ? "RECOMMENDATION_ABSTAINED" : "RECOMMENDATION_PREPARED", "SYSTEM", {
      recommendation_id: golden.recommended_action?.recommendation_id ?? null,
    });
  }
  if (state.decision) {
    const eventType = ({
      approve: "MANAGER_APPROVED",
      "edit-approve": "MANAGER_EDITED_APPROVED",
      reject: "MANAGER_REJECTED",
      defer: "MANAGER_DEFERRED",
    } as const)[state.decision.kind];
    push(eventType, "MANAGER_UI", { decision: state.decision });
    const execution = buildExecution(letter, runId, state);
    if (execution.receipt) {
      push("SIMULATED_ACTION_COMPLETED", "SIMULATED_GATEWAY", {
        action_intent: execution.intent,
        execution: execution.receipt,
        execution_receipt: execution.receipt,
      });
    }
  }
  if (records.feedback) push("RECOMMENDATION_FEEDBACK", "MANAGER_UI", { feedback: records.feedback });
  if (records.outcome_feedback) push("OUTCOME_FEEDBACK_RECORDED", "MANAGER_UI", { outcome_feedback: records.outcome_feedback });
  return events;
}
