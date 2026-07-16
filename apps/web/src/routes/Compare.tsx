/* Compare (01 §3.2, §6.5): same frozen starting state under no-intervention,
   simple-reorder, and the original agent recommendation. Aligned table over
   charts (01 §10.2). Rows map to golden keys NO_INTERVENTION / SIMPLE_REORDER /
   AGENT_ACTION. */
import { useParams } from "react-router-dom";
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
      <div className="stack">
        <section>
          <h1 className="risk-title" style={{ marginTop: 0 }}>Compare response policies</h1>
          <p className="note">Same frozen starting inventory — simulated and labeled as simulated.</p>
        </section>

        {managerPlan && (
          <div className="banner">
            {managerPlan.edited ? "Manager-edited plan" : "Manager-selected alternative"}: <b>{managerPlan.name}</b> · {lb(managerPlan.qty)}.
            Its comparison row is computed by the deterministic engine (not yet connected).
          </div>
        )}

        {!available ? (
          <section className="card">
            <p>Analyze the disruption to compare response policies.</p>
          </section>
        ) : (
          <section className="card" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Policy</th>
                  <th scope="col">Selected action</th>
                  <th scope="col">First breach</th>
                  <th scope="col" className="num">Essential ≥ min</th>
                  <th scope="col" className="num">Coverage</th>
                  <th scope="col" className="num">Cost</th>
                  <th scope="col" className="num">Stockout wks</th>
                  <th scope="col">Constraints</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ key, label }) => {
                  const p = golden.comparison[key] as ComparisonPolicy | undefined;
                  if (!p) return null;
                  const wk4 = p.essential_categories_above_minimum_by_week;
                  return (
                    <tr key={key}>
                      <td style={{ fontWeight: 700 }}>{label}</td>
                      <td>{p.action_id ? (actions[p.action_id]?.display_name ?? p.action_id) : "—"}</td>
                      <td>{p.first_minimum_breach_week_start ? dateShort(p.first_minimum_breach_week_start) : "None in horizon"}</td>
                      <td className="num">{wk4[wk4.length - 1]} of 5</td>
                      <td className="num">{pct(p.horizon_conservative_weighted_coverage)}</td>
                      <td className="num">{usd(p.cost_usd)}</td>
                      <td className="num">{int(p.stockout_weeks)}</td>
                      <td>{p.constraint_evaluation_status === "NOT_APPLICABLE" ? "Not applicable" : p.hard_constraint_violation_codes.length ? p.hard_constraint_violation_codes.join(", ") : "Passed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AppFrame>
  );
}
