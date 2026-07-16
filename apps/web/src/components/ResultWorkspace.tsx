/* Result workspace (01 §4.6–4.8, §6.4): the committed decision outcome.
   APPROVED shows before/after heal; REJECTED/DEFERRED keep the risk and state the
   projection is unchanged. Simulation-only note; comparison + audit links. */
import { Link } from "react-router-dom";
import { Check, CircleAlert, ICON, ICON_SM } from "./icons";
import { getGolden, getActionMap, type ScenarioLetter } from "../lib/api";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, usd, weeks, wos } from "../lib/format";
import type { Decision } from "../lib/runState";

const TOTAL_BUDGET = 20000; // synthetic budget cap (golden BUDGET limit).

export default function ResultWorkspace({
  letter, runId, decision, onReset,
}: { letter: ScenarioLetter; runId: string; decision: Decision; onReset: () => void }) {
  const golden = getGolden(letter);
  const actions = getActionMap(golden.scenario_id);
  const risk = golden.risks.find((r) => r.is_primary) ?? golden.risks[0];
  const catLabel = CATEGORY_LABEL[risk.category_id];
  const action = actions[decision.actionId];

  const links = (
    <div className="actions">
      <Link className="btn btn--secondary" to={`/runs/${runId}/compare`}>View comparison</Link>
      <Link className="btn btn--secondary" to={`/runs/${runId}/audit`}>View audit record</Link>
      <button className="btn btn--ghost" onClick={onReset}>Start clean run</button>
    </div>
  );

  if (decision.kind === "reject") {
    return (
      <div className="stack" style={{ maxWidth: 780 }}>
        <section>
          <span className="pill pill--breach"><CircleAlert size={ICON} aria-hidden /> Recommendation rejected</span>
          <h1 className="risk-title">The recommendation was not applied</h1>
          <p className="lead">
            The projection is unchanged — {catLabel.toLowerCase()} still runs short the week of the
            breach. The rejection and your reason are recorded.
          </p>
        </section>
        {decision.reason && (
          <section className="card"><h2 className="sec">Manager reason</h2><p>{decision.reason}</p></section>
        )}
        {links}
      </div>
    );
  }

  if (decision.kind === "defer") {
    return (
      <div className="stack" style={{ maxWidth: 780 }}>
        <section>
          <span className="pill" style={{ background: "var(--warn-tint)", color: "var(--warn)" }}>
            <CircleAlert size={ICON} aria-hidden /> Decision deferred
          </span>
          <h1 className="risk-title">Decision deferred — projection unchanged</h1>
          <p className="lead">The risk remains open. No action was simulated.</p>
        </section>
        {decision.reason && (
          <section className="card"><h2 className="sec">Deferral note</h2><p>{decision.reason}</p></section>
        )}
        {links}
      </div>
    );
  }

  // APPROVE / EDIT-APPROVE
  const qty = decision.quantityLb;
  const cost = action ? qty * action.unit_price_usd_per_lb : Number(golden.recommended_action.cost_usd);
  const remaining = TOTAL_BUDGET - cost;
  const beforeWos = wos(risk.conservative_end_wos_at_breach);
  const beforeInv = risk.conservative_end_inventory_lb_at_breach;

  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <section>
        <span className="pill pill--ok"><Check size={ICON} aria-hidden /> Simulation updated</span>
        <h1 className="risk-title">{catLabel} coverage restored in the simulation</h1>
        <p className="lead">
          {action?.display_name ?? decision.actionId} was applied to this synthetic run.{" "}
          {catLabel} coverage at the breach week rises from{" "}
          <span className="hot hot--danger">{beforeWos} weeks</span> to{" "}
          <span className="hot" style={{ color: "var(--ok)" }}>{weeks(risk.target_weeks_of_supply)}</span>.
        </p>
        <p className="hint"><Check size={ICON_SM} aria-hidden style={{ verticalAlign: "-2px" }} /> No external action was taken.</p>
      </section>

      <section className="card">
        <h2 className="sec">Before / after at the breach week</h2>
        <div className="beforeafter">
          <BA lab={`${catLabel} coverage`} before={`${beforeWos} weeks`} after={`${weeks(risk.target_weeks_of_supply)}`} good />
          <BA lab="Ending inventory" before={lb(beforeInv)} after={lb(risk.target_end_inventory_lb)} good />
          <BA lab="Gap to target" before={lb(risk.gap_to_target_lb)} after={lb(0)} good />
          <BA lab="Budget remaining" before={usd(TOTAL_BUDGET)} after={usd(remaining)} />
        </div>
        <p className="hint" style={{ marginTop: "var(--s4)" }}>
          Simulated cost {usd(cost)} for {lb(qty)}.{" "}
          {golden.projections.recommended_action_after.remaining_open_risk_ids.length === 0
            ? "No category remains below its minimum in the four-week view."
            : "Some risks remain open — see the comparison."}
        </p>
      </section>

      {links}
    </div>
  );
}

function BA({ lab, before, after, good }: { lab: string; before: string; after: string; good?: boolean }) {
  return (
    <div className="ba">
      <div className="ba__lab">{lab}</div>
      <div className="ba__row">
        <span className="ba__before">{before}</span>
        <span className="ba__arrow" aria-hidden>→</span>
        <span className={`ba__after ${good ? "ba__after--good" : ""}`}>{after}</span>
      </div>
    </div>
  );
}
