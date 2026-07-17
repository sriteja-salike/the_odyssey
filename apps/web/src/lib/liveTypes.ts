/* Shared shapes for the run API (live + offline fallback), extracted so the two
   modules don't import each other cyclically. */
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
