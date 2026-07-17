/* Frozen presentation fixtures and scenario metadata. Durable lifecycle data,
   decision briefs, traces, executions, and feedback come from liveApi.ts. */

import type { GoldenOutput } from "../types/golden";

import goldenA from "../data/golden/scenario_a.golden.json";
import goldenB from "../data/golden/scenario_b.golden.json";
import goldenC from "../data/golden/scenario_c.golden.json";
import goldenD from "../data/golden/scenario_d.golden.json";
import goldenE from "../data/golden/scenario_e.golden.json";

import overlayA from "../data/scenarios/scenario_a.json";
import overlayB from "../data/scenarios/scenario_b.json";
import overlayC from "../data/scenarios/scenario_c.json";
import overlayD from "../data/scenarios/scenario_d.json";
import overlayE from "../data/scenarios/scenario_e.json";

import candidateActions from "../data/fixtures/candidate_actions.json";
import evidenceRecords from "../data/fixtures/evidence_records.json";
import historicalFlow from "../data/fixtures/historical_weekly_category_flow.json";
import categoryPolicies from "../data/fixtures/category_policies.json";
import plannedInbound from "../data/fixtures/planned_inbound.json";
import type { CategoryId } from "../types/golden";

export type ScenarioLetter = "A" | "B" | "C" | "D" | "E";

export interface ActionRecord {
  action_id: string;
  scenario_id: string;
  display_name: string;
  action_type: string;
  category_id: string;
  requested_quantity_lb: number;
  minimum_quantity_lb: number;
  maximum_quantity_lb: number;
  quantity_increment_lb: number;
  unit_price_usd_per_lb: number;
  computed_cost_usd: number;
  lead_time_days: number;
  arrival_week_start: string;
  storage_type: string;
  usable_life_days: number;
  requires_human_approval: boolean;
  evidence_ids: string[];
}

export interface ScenarioOverlay {
  scenario_id: string;
  display_name: string;
  planning_date: string;
  forecast_week_starts: string[];
  primary_risk_type: string;
  cached_notice_extraction?: Record<string, unknown>;
  overlay: {
    inbound_mutations: { inbound_id: string; set: Record<string, unknown> }[];
    remove_inbound_ids: string[];
  };
}

export interface PlannedInboundRecord {
  inbound_id: string;
  expected_week_start: string | null;
  category_id: string;
  gross_quantity_lb: number | null;
  source_type: string | null;
  status: string | null;
}

const GOLDENS: Record<ScenarioLetter, GoldenOutput> = {
  A: goldenA as unknown as GoldenOutput,
  B: goldenB as unknown as GoldenOutput,
  C: goldenC as unknown as GoldenOutput,
  D: goldenD as unknown as GoldenOutput,
  E: goldenE as unknown as GoldenOutput,
};

const OVERLAYS: Record<ScenarioLetter, ScenarioOverlay> = {
  A: overlayA as unknown as ScenarioOverlay,
  B: overlayB as unknown as ScenarioOverlay,
  C: overlayC as unknown as ScenarioOverlay,
  D: overlayD as unknown as ScenarioOverlay,
  E: overlayE as unknown as ScenarioOverlay,
};

const ACTIONS = (candidateActions as { records: ActionRecord[] }).records;

export const SCENARIOS: { letter: ScenarioLetter; label: string; inScope: boolean }[] = [
  { letter: "A", label: "A · USDA protein shipment delay", inScope: true },
  { letter: "B", label: "B · Short-life produce offer", inScope: true },
  { letter: "C", label: "C · Donation mismatch", inScope: true },
  { letter: "D", label: "D · Budget conflict", inScope: true },
  { letter: "E", label: "E · Missing / conflicting data", inScope: true },
];

export function getGolden(letter: ScenarioLetter): GoldenOutput {
  return GOLDENS[letter];
}

export function getOverlay(letter: ScenarioLetter): ScenarioOverlay {
  return OVERLAYS[letter];
}

/** Effective, verified inbound records after applying the selected scenario overlay. */
export function getScenarioPlannedInbounds(letter: ScenarioLetter): PlannedInboundRecord[] {
  const overlay = getOverlay(letter).overlay;
  const removed = new Set(overlay.remove_inbound_ids);
  const mutations = new Map(overlay.inbound_mutations.map((item) => [item.inbound_id, item.set]));
  return (plannedInbound as { records: PlannedInboundRecord[] }).records
    .filter((item) => !removed.has(item.inbound_id))
    .map((item) => ({ ...item, ...(mutations.get(item.inbound_id) ?? {}) } as PlannedInboundRecord));
}

/** Action catalog records for a scenario, keyed by action_id. */
export function getActionMap(scenarioId: string): Record<string, ActionRecord> {
  const map: Record<string, ActionRecord> = {};
  for (const a of ACTIONS) if (a.scenario_id === scenarioId) map[a.action_id] = a;
  return map;
}

/** Letter from a scenario_id like "SCN-A-USDA-PROTEIN-DELAY". */
export function letterFromScenarioId(scenarioId: string): ScenarioLetter {
  const m = scenarioId.match(/^SCN-([A-E])-/);
  return (m ? m[1] : "A") as ScenarioLetter;
}

/** A stable, visibly-synthetic run id for a scenario (no real backend id yet). */
export function syntheticRunId(letter: ScenarioLetter): string {
  const suffix = { A: "7f3d02", B: "b1a9c4", C: "3e7d18", D: "5c2f90", E: "a4e6b1" }[letter];
  return `run_scn-${letter.toLowerCase()}_${suffix}`;
}

/* ------------------------------------------------------------------ notice --- */
export interface Notice {
  title: string;
  body: string;
  recorded_at: string;
  source_kind: string;
  trust_level: string;
}
export interface EvidenceRecord {
  evidence_id: string;
  scenario_ids?: string[];
  source_kind: string;
  trust_level: string;
  title: string;
  body: string;
  recorded_at: string;
  structured_facts?: Record<string, unknown>[];
  record_version?: number;
}

const EVIDENCE = (evidenceRecords as { records: EvidenceRecord[] }).records;

/** Frozen evidence records in scope for one scenario. */
export function getScenarioEvidence(letter: ScenarioLetter): EvidenceRecord[] {
  const scenarioId = getOverlay(letter).scenario_id;
  return EVIDENCE.filter((record) => (record.scenario_ids ?? []).includes(scenarioId));
}

/** The imported disruption notice shown in the Draft state (01 §6.2). */
export function getNotice(letter: ScenarioLetter): Notice | null {
  const n = getScenarioEvidence(letter).find((record) => record.source_kind === "SYNTHETIC_NOTICE");
  return n ? { title: n.title, body: n.body, recorded_at: n.recorded_at, source_kind: n.source_kind, trust_level: n.trust_level } : null;
}

/* ------------------------------------------------------- baseline context --- */
export interface BaselineCategory {
  category_id: CategoryId;
  on_hand_lb: number;
  coverage_weeks: number | null;
  minimum_weeks: number;
  essential: boolean;
  healthy: boolean;
}
export interface BaselineContext {
  total_on_hand_lb: number;
  categories: BaselineCategory[];
}

/** Pre-disruption baseline (mock backend derivation from fixtures). The Draft
    view shows this: aggregate pounds look fine — totals hide category risk. */
export function getBaselineContext(letter: ScenarioLetter): BaselineContext {
  const flow = (historicalFlow as { series: { category_id: CategoryId; ending_inventory_lb: number[] }[] }).series;
  const policies = (categoryPolicies as { records: { category_id: CategoryId; minimum_weeks_of_supply: number; essential_assortment: boolean }[] }).records;
  const forecast = getGolden(letter).forecast_distribution_lb ?? ({} as Record<CategoryId, number>);
  const polByCat = Object.fromEntries(policies.map((p) => [p.category_id, p]));

  let total = 0;
  const categories: BaselineCategory[] = flow.map((s) => {
    const onHand = s.ending_inventory_lb[s.ending_inventory_lb.length - 1];
    total += onHand;
    const wk = forecast[s.category_id];
    const coverage = wk ? onHand / wk : null;
    const pol = polByCat[s.category_id];
    const min = pol?.minimum_weeks_of_supply ?? 0;
    return {
      category_id: s.category_id,
      on_hand_lb: onHand,
      coverage_weeks: coverage,
      minimum_weeks: min,
      essential: pol?.essential_assortment ?? false,
      healthy: coverage == null ? true : coverage >= min,
    };
  });
  return { total_on_hand_lb: total, categories };
}
