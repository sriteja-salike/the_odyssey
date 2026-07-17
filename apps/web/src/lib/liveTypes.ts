/* Shared contracts for the durable API and the browser-only demo fallback.
   Keeping one complete shape prevents offline mode from becoming a second,
   weaker product path. */
import type { DecisionKind, Phase } from "./runState";

export interface KnowledgeSource {
  document_id: string;
  source_id: string;
  display_name: string;
  source_kind: string;
  source_version: string;
  observed_at_utc: string;
  payload_sha256: string;
}

export interface SolverView {
  solver_id: string;
  method: string;
  version: string;
  deterministic: boolean;
  problem_types: string[];
  capabilities: string[];
  limitations: string[];
}

export interface AgentMetadata {
  requested_mode: "offline" | "live";
  effective_mode: "offline" | "live" | "offline_fallback";
  status: "verified" | "live_configured" | "live_verified" | "fallback";
  role: "DECISION_ORCHESTRATOR" | "INDEPENDENT_REVIEWER";
  provider: string | null;
  model: string | null;
  prompt_version: string;
  output_schema_version: string;
  tool_contract_version: string;
  tool_calls: string[];
  fallback_code: string | null;
}

export interface DecisionAction {
  evaluated_action_id: string;
  action_id: string;
  display_name: string;
  action_type: string;
  category_id: string | null;
  requested_quantity_lb: number;
  cost_usd: string;
  feasible: boolean;
  rank: number | null;
  score: string | null;
  failed_constraints: string[];
  failed_detail: Record<string, unknown>[];
  evidence_ids: string[];
}

export interface DecisionRationale {
  recommendation_id: string;
  headline: string;
  why_now: string;
  why_this_action: string;
  uncertainty: string;
  why_not: { evaluated_action_id: string; explanation: string }[];
  evidence_ids: string[];
  requires_human_approval: true;
  simulation_only: true;
}

export interface DecisionVisualDatum {
  label: string;
  value: string;
  formatted_value: string;
  tone: "attention" | "positive" | "neutral";
}

export interface DecisionConflictDatum {
  field_label: string;
  message: string;
  sources: string[];
  observed_values: string[];
}

export interface DecisionVisualPresentation {
  kind: "coverage" | "capacity" | "mismatch" | "budget" | "conflict";
  title: string;
  summary: string;
  unit: "weeks" | "lb" | "usd" | "records";
  data: DecisionVisualDatum[];
  reference_value: string | null;
  reference_label: string | null;
  conflicts: DecisionConflictDatum[];
}

export interface DecisionPresentation {
  schema_version: "decision-presentation/1.0.0";
  archetype: "INBOUND_DISRUPTION" | "PERISHABLE_CAPACITY" | "DONATION_DISPOSITION" | "RESOURCE_TRADEOFF" | "DATA_RECONCILIATION";
  issue: { label: string; title: string; summary: string };
  recommendation: null | {
    title: string;
    quantity_label: string;
    cost_label: string;
    timing_label: string | null;
    effect: string;
    caution: string | null;
  };
  visual: DecisionVisualPresentation;
  result_visual: DecisionVisualPresentation | null;
  detail_facts: { label: string; value: string }[];
  suggested_questions: string[];
}

export interface WorkItem {
  schema_version: "work-item/1.0.0";
  work_item_id: string;
  case_key: string;
  state: "NEEDS_REVIEW" | "INFORMATION_NEEDED" | "NO_ACTION_REQUIRED";
  urgency: "NOW" | "SOON" | "ROUTINE";
  due_label: string | null;
  source_count: number;
  presentation: DecisionPresentation;
  primary_action_label: string;
  synthetic: true;
}

export interface OperationsAssistantResponse {
  schema_version: "operations-assistant-response/1.0.0";
  answer: string;
  work_item: WorkItem;
  suggested_questions: string[];
  authority_note: string;
  synthetic: true;
}

export interface DecisionBrief {
  schema_version: "decision-brief/1.0.0";
  run_id: string;
  scenario_id: string;
  scenario_name: string;
  decision_status: string;
  status_message: string;
  analysis_output_hash: string;
  solver: SolverView;
  primary_risk: {
    risk_id: string;
    risk_type: string;
    category_id: string | null;
    priority_score: string | null;
    details: Record<string, unknown>;
  } | null;
  recommendation: {
    recommendation_id: string;
    risk_id: string;
    action: DecisionAction;
    confidence_label: string;
    confidence_value: string;
    requires_human_approval: true;
  } | null;
  rationale: DecisionRationale | null;
  alternatives: DecisionAction[];
  rejected_options: DecisionAction[];
  blocking_issues: Record<string, unknown>[];
  evidence: {
    evidence_id: string;
    source_kind: string;
    trust_level: string;
    title: string;
    summary: string;
    structured_facts: Record<string, unknown>[];
    record_version: number;
  }[];
  approval: {
    required: boolean;
    allowed_commands: string[];
    editable: boolean;
    minimum_quantity_lb?: number | null;
    maximum_quantity_lb?: number | null;
    quantity_increment_lb?: number | null;
    external_writes_allowed: false;
  };
  agent: AgentMetadata;
  presentation: DecisionPresentation;
  synthetic: true;
}

export interface LiveDecision {
  decision_id: string;
  kind: DecisionKind;
  action_id: string;
  quantity_lb: number;
  reason?: string | null;
  recommendation_id?: string;
}

export interface ActionIntent {
  schema_version: "action-intent/1.0.0";
  action_intent_id: string;
  run_id: string;
  decision_id: string;
  recommendation_id: string;
  action_id: string;
  action_type: string;
  execution_type: string;
  adapter_id: "simulated-operations-v1";
  mode: "SIMULATED";
  quantity_lb: number;
  cost_usd: string;
  arrival_week_start: string | null;
  requires_human_approval: true;
  approved_by: "MANAGER_UI";
  external_write_allowed: false;
  authority_input_sha256: string;
  created_at_utc: string;
}

export interface LiveExecution {
  schema_version: "execution-receipt/1.0.0";
  execution_id: string;
  action_intent_id: string;
  run_id: string;
  action_id: string;
  execution_type: string;
  adapter_id: "simulated-operations-v1";
  mode: "SIMULATED";
  status: "SIMULATED_COMPLETED";
  target_system: string;
  quantity_lb: number;
  cost_usd: string;
  arrival_week_start: string | null;
  request_sha256: string;
  external_write_performed: false;
  completed_at_utc: string;
}

export interface DecisionTraceStage {
  stage: string;
  actor: string;
  status: "PASSED" | "FALLBACK" | "SKIPPED";
  duration_ms: number;
  input_sha256: string;
  output_sha256: string | null;
  summary: string;
  details: Record<string, unknown>;
}

export interface DecisionTrace {
  schema_version: "decision-trace/1.0.0";
  trace_id: string;
  run_id: string;
  exposes_chain_of_thought: false;
  stages: DecisionTraceStage[];
  final_status: string;
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
  decision_brief: DecisionBrief | null;
  decision: LiveDecision | null;
  execution: LiveExecution | null;
  action_intent: ActionIntent | null;
  execution_receipt: LiveExecution | null;
  feedback: Record<string, unknown> | null;
  outcome_feedback: Record<string, unknown> | null;
  decision_trace: DecisionTrace | null;
  solver?: SolverView | null;
  agent?: AgentMetadata | null;
  reviewer?: AgentMetadata | null;
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
