/* Types for the golden output = the API response contract.
   Mirrors BUILD_CONTEXT/schemas/golden_output.schema.json (fields the UI reads).
   Numbers arrive as strings for Decimal-precise fields; the UI parses only to
   format for display, never to compute domain results. */

export type DecisionStatus =
  | "DRAFT" | "READY_FOR_REVIEW" | "NO_ACTION_REQUIRED" | "STALE"
  | "APPROVED" | "REJECTED" | "DEFERRED" | "ABSTAINED" | "FAILED";

export type CategoryId =
  | "PROTEIN" | "PRODUCE" | "DAIRY" | "GRAINS" | "STAPLES_MIXED_MEALS" | "SNACKS_DISCRETIONARY";

export interface Risk {
  risk_id: string;
  risk_type: string;
  category_id: CategoryId;
  is_primary: boolean;
  first_breach_week_start: string;
  first_breach_week_index: number;
  minimum_weeks_of_supply: string;
  target_weeks_of_supply: string;
  conservative_end_inventory_lb_at_breach: string;
  conservative_end_wos_at_breach: string;
  target_end_inventory_lb: string;
  gap_to_target_lb: string;
  shortage_depth: string;
  priority_score: string;
  evidence_ids: string[];
}

export interface ConservativeWeek {
  week_start: string;
  beginning_inventory_lb: string;
  confirmed_inbound_lb: string;
  probable_inbound_lb: string;
  fulfilled_distribution_lb: string;
  unmet_distribution_lb: string;
  expiry_spoilage_lb: string;
  ending_inventory_lb: string;
  end_wos: string;
}
export interface ExpectedWeek {
  week_start: string;
  ending_inventory_lb: string;
  end_wos: string;
  confirmed_inbound_lb?: string;
  probability_adjusted_inbound_lb?: string;
}

export interface ActionEvaluation {
  evaluated_action_id: string;
  action_id: string;
  requested_quantity_lb: number;
  cost_usd: string;
  feasible: boolean;
  failed_constraint_codes: string[];
  failed_constraints?: { code: string; observed: string; limit: string; unit: string }[];
  score_components: Record<string, string> | null;
  score_unrounded: string | null;
  score_display: string | null;
  rank: number | null;
  gap_reduction_lb?: string;
  expected_usable_quantity_lb?: string;
  evidence_ids?: string[];
}

export interface RecommendedAction {
  recommendation_id: string;
  risk_id: string;
  action_id: string;
  evaluated_action_id: string;
  requested_quantity_lb: number;
  arrival_week_start: string;
  unit_price_usd_per_lb: string;
  cost_usd: string;
  expected_usable_quantity_lb: string;
  gap_reduction_lb: string;
  requires_human_approval: boolean;
  confidence_value: string;
  confidence: string;
  confidence_inputs: Record<string, string>;
  source_ids: string[];
}

export interface RecommendedAfter {
  action_id: string;
  [category: string]: unknown;
  horizon_conservative_weighted_coverage: string;
  horizon_expected_weighted_coverage: string;
  capacity_stress_frozen_peak_lb_by_week: string[];
  maximum_capacity_stress_frozen_peak_lb: string;
  remaining_budget_usd: string;
  remaining_open_risk_ids: string[];
}

export interface CategoryProjection {
  conservative: ConservativeWeek[];
  expected: ExpectedWeek[];
}

export interface Projections {
  baseline: {
    [category: string]: unknown;
    all_category_conservative_ending_inventory_lb: Record<string, number[]>;
    conservative_weighted_coverage_by_week: string[];
    expected_weighted_coverage_by_week: string[];
    horizon_conservative_weighted_coverage: string;
    horizon_expected_weighted_coverage: string;
    capacity_stress_frozen_peak_lb_by_week: string[];
    maximum_capacity_stress_frozen_peak_lb: string;
  };
  recommended_action_after: RecommendedAfter;
}

export interface ComparisonPolicy {
  action_id: string | null;
  requested_quantity_lb?: number;
  first_minimum_breach_week_start: string | null;
  essential_categories_above_minimum_by_week: number[];
  protein_conservative_ending_inventory_lb: number[];
  protein_expected_ending_inventory_lb: number[];
  w2_gap_to_target_lb: number;
  cost_usd: string;
  remaining_budget_usd: string;
  horizon_conservative_weighted_coverage: string;
  horizon_expected_weighted_coverage: string;
  maximum_frozen_peak_lb: number;
  stockout_weeks: number;
  projected_expiry_spoilage_lb: number;
  constraint_evaluation_status: string;
  hard_constraint_violation_codes: string[];
  unresolved_risk_ids: string[];
}

export interface AuditEvent {
  sequence: number;
  event_type: string;
  semantic_id: string;
}

export interface GoldenOutput {
  schema_version: string;
  scenario_id: string;
  golden_version: string;
  fixed_clock_utc: string;
  decision_status: DecisionStatus;
  forecast_distribution_lb: Record<CategoryId, number>;
  risks: Risk[];
  projections: Projections;
  action_evaluations: ActionEvaluation[];
  ranking: string[];
  recommended_action: RecommendedAction;
  comparison: Record<string, ComparisonPolicy>;
  blocking_issues: unknown[];
  audit_oracle: AuditEvent[];
  provenance: { mode: string; created_by: string; description: string; derived_from_ids: string[] };
}
