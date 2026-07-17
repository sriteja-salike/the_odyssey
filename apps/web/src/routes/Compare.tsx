/* Compare (01 §3.2, §6.5): same frozen starting state under no-intervention,
   simple-reorder, and the original agent recommendation. Aligned table over
   charts (01 §10.2). Rows map to golden keys NO_INTERVENTION / SIMPLE_REORDER /
   AGENT_ACTION. */
import { useParams } from "react-router-dom";
import {
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import AppFrame from "../components/AppFrame";
import NotFoundRun from "./NotFoundRun";
import { getGolden, getActionMap } from "../lib/api";
import { letterFromRunId } from "../lib/run";
import { useRunState } from "../lib/runState";
import { usd, int, pct, dateShort, lb } from "../lib/format";
import type { ComparisonPolicy } from "../types/golden";

const ROWS: { key: string; label: string }[] = [
  { key: "NO_INTERVENTION", label: "No intervention" },
  { key: "SIMPLE_REORDER", label: "Simple reorder (baseline)" },
  { key: "AGENT_ACTION", label: "Original agent recommendation" },
];

export default function Compare() {
  const { runId = "" } = useParams();
  const letter = letterFromRunId(runId);
  if (!letter) return <NotFoundRun />;
  const golden = getGolden(letter);
  const actions = getActionMap(golden.scenario_id);
  const [runState] = useRunState(runId);
  const sel = runState.selection;
  const rec = golden.recommended_action;
  const managerPlan = sel && (sel.actionId !== rec.action_id || sel.edited)
    ? { name: actions[sel.actionId]?.display_name ?? sel.actionId, qty: sel.quantityLb, edited: sel.edited }
    : null;

  const available = golden.decision_status === "READY_FOR_REVIEW" || golden.decision_status === "APPROVED";

  return (
    <AppFrame runId={runId} letter={letter} active="compare">
      <div className="stack route-stack compare-page">
        <section className="page-lead">
          <p className="eyebrow">Scenario A · policy comparison</p>
          <h1 className="risk-title">Compare response policies</h1>
          <p className="lead">Three policies, one frozen starting state. Review the operational trade-offs without changing the approved plan.</p>
        </section>

        {managerPlan && (
          <InlineNotification
            lowContrast
            hideCloseButton
            kind="info"
            title={managerPlan.edited ? "Manager-edited plan active" : "Manager-selected alternative active"}
            subtitle={`${managerPlan.name} · ${lb(managerPlan.qty)}. Its dedicated comparison row is computed by the deterministic engine.`}
          />
        )}

        {!available ? (
          <section className="card">
            <h2 className="sec">Comparison unavailable</h2>
            <p>Analyze the disruption first; comparison is unlocked only after the same source snapshot has been evaluated.</p>
          </section>
        ) : (
          <section className="comparison-table">
            <TableContainer
              title="Four-week outcomes"
              description="Conservative projections · synthetic costs · hard constraints enforced"
            >
              <Table size="lg">
                <TableHead>
                  <TableRow>
                    <TableHeader>Policy</TableHeader>
                    <TableHeader>Selected action</TableHeader>
                    <TableHeader>First breach</TableHeader>
                    <TableHeader>Essential ≥ min</TableHeader>
                    <TableHeader>Coverage</TableHeader>
                    <TableHeader>Cost</TableHeader>
                    <TableHeader>Stockout wks</TableHeader>
                    <TableHeader>Constraints</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                {ROWS.map(({ key, label }) => {
                  const p = golden.comparison[key] as ComparisonPolicy | undefined;
                  if (!p) return null;
                  const wk4 = p.essential_categories_above_minimum_by_week;
                  return (
                    <TableRow key={key} className={key === "AGENT_ACTION" ? "comparison-table__recommended" : undefined}>
                      <TableCell>
                        <strong>{label}</strong>
                        {key === "AGENT_ACTION" && <Tag type="blue" size="sm">Recommended</Tag>}
                      </TableCell>
                      <TableCell>{p.action_id ? (actions[p.action_id]?.display_name ?? p.action_id) : "—"}</TableCell>
                      <TableCell>{p.first_minimum_breach_week_start ? dateShort(p.first_minimum_breach_week_start) : "None in horizon"}</TableCell>
                      <TableCell>{wk4[wk4.length - 1]} of 5</TableCell>
                      <TableCell>{pct(p.horizon_conservative_weighted_coverage)}</TableCell>
                      <TableCell>{usd(p.cost_usd)}</TableCell>
                      <TableCell>{int(p.stockout_weeks)}</TableCell>
                      <TableCell>
                        {p.constraint_evaluation_status === "NOT_APPLICABLE" ? (
                          <Tag type="cool-gray" size="sm">Not applicable</Tag>
                        ) : p.hard_constraint_violation_codes.length ? (
                          <Tag type="red" size="sm">{p.hard_constraint_violation_codes.join(", ")}</Tag>
                        ) : (
                          <Tag type="green" size="sm">Passed</Tag>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </TableContainer>
          </section>
        )}
      </div>
    </AppFrame>
  );
}
