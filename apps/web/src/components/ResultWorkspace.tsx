/* Result workspace (01 §4.6–4.8, §6.4): the committed decision outcome.
   APPROVED shows before/after heal; REJECTED/DEFERRED keep the risk and state the
   projection is unchanged. Simulation-only note; comparison + audit links. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, CircleAlert, ICON, ICON_SM } from "./icons";
import { getGolden, getActionMap, type ScenarioLetter } from "../lib/api";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, usd, weeks, wos } from "../lib/format";
import type { Decision } from "../lib/runState";
import { submitFeedback, type LiveExecution } from "../lib/liveApi";

const TOTAL_BUDGET = 20000; // synthetic budget cap (golden BUDGET limit).

export default function ResultWorkspace({
  letter, runId, decision, execution, feedbackRecorded = false, onReset,
}: { letter: ScenarioLetter; runId: string; decision: Decision; execution?: LiveExecution; feedbackRecorded?: boolean; onReset: () => void }) {
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
  const followup = (
    <>
      {execution && <ExecutionCard execution={execution} />}
      <FeedbackCard runId={runId} feedbackRecorded={feedbackRecorded} />
    </>
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
        {followup}
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
        {followup}
        {links}
      </div>
    );
  }

  // APPROVE / EDIT-APPROVE
  const rec = golden.recommended_action;
  const qty = decision.quantityLb;
  const cost = action ? qty * action.unit_price_usd_per_lb : Number(rec.cost_usd);
  const remaining = TOTAL_BUDGET - cost;
  const isRecommendedDefault =
    decision.kind === "approve" && decision.actionId === rec.action_id && qty === rec.requested_quantity_lb;

  if (isRecommendedDefault) {
    // Exact recommended plan — the golden carries the verified full-heal after-state.
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
        {followup}
        {links}
      </div>
    );
  }

  // Non-recommended or edited plan: report only what we can verify without the
  // engine — cost, budget, and gap reduction — and don't fabricate coverage.
  const gap = Number(risk.gap_to_target_lb);
  const evalRow = golden.action_evaluations.find((e) => e.action_id === decision.actionId);
  const gapReduction =
    action?.action_type === "PURCHASE"
      ? Math.min(qty, gap)
      : Number(evalRow?.gap_reduction_lb ?? evalRow?.expected_usable_quantity_lb ?? 0);
  const residual = Math.max(0, gap - gapReduction);

  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <section>
        <span className="pill pill--ok"><Check size={ICON} aria-hidden /> Simulation updated</span>
        <h1 className="risk-title">{action?.display_name ?? decision.actionId} applied</h1>
        <p className="lead">
          Applied to this synthetic run — it closes{" "}
          <span className="hot" style={{ color: "var(--ok)" }}>{lb(gapReduction)}</span> of the {lb(gap)}{" "}
          {catLabel.toLowerCase()} gap{residual > 0 ? <>, leaving <span className="hot hot--danger">{lb(residual)}</span> still short</> : null}.
        </p>
        <p className="hint"><Check size={ICON_SM} aria-hidden style={{ verticalAlign: "-2px" }} /> No external action was taken.</p>
      </section>
      <section className="card">
        <h2 className="sec">Result at the breach week</h2>
        <div className="beforeafter">
          <BA lab={`${catLabel} gap to target`} before={lb(gap)} after={lb(residual)} good={residual === 0} />
        </div>
        <p className="hint" style={{ marginTop: "var(--s4)" }}>
          Simulated cost {usd(cost)} for {lb(qty)} · budget remaining {usd(remaining)}.
        </p>
        <p className="hint">
          {decision.reason ? `Manager reason: ${decision.reason.replace(/\.\s*$/, "")}. ` : ""}
          The full four-week coverage projection for a non-recommended plan is computed by the deterministic engine.
          {residual > 0 ? " Some risk remains open — see the comparison." : ""}
        </p>
      </section>
      {followup}
      {links}
    </div>
  );
}

function ExecutionCard({ execution }: { execution: LiveExecution }) {
  return (
    <section className="card execution-card">
      <div>
        <span className="pill pill--ok"><Check size={ICON_SM} aria-hidden /> Ready to act</span>
        <h2 className="execution-card__title">Simulated request created</h2>
        <p className="hint">
          The recommendation has been converted into an executable {execution.execution_type.toLowerCase().replaceAll("_", " ")}.
          In a production connection, this is the handoff to the authorized operations system.
        </p>
      </div>
      <dl className="execution-card__facts">
        <div><dt>Request ID</dt><dd className="mono">{execution.execution_id}</dd></div>
        <div><dt>Status</dt><dd>{execution.status === "SIMULATED_SUBMITTED" ? "Submitted in simulation" : execution.status}</dd></div>
        <div><dt>Target</dt><dd>{execution.target_system}</dd></div>
        <div><dt>External write</dt><dd>{execution.external_write_performed ? "Completed" : "Not performed"}</dd></div>
      </dl>
    </section>
  );
}

function FeedbackCard({ runId, feedbackRecorded }: { runId: string; feedbackRecorded: boolean }) {
  const [rating, setRating] = useState<"HELPFUL" | "NOT_HELPFUL" | null>(null);
  const [reason, setReason] = useState("");
  const [actionability, setActionability] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!rating) return;
    setError("");
    try {
      await submitFeedback(runId, rating, reason, actionability ? { actionability } : {});
      setSent(true);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  if (sent || feedbackRecorded) {
    return <section className="feedback-card feedback-card--sent"><Check size={ICON_SM} aria-hidden /> Feedback recorded for this recommendation.</section>;
  }

  return (
    <section className="card feedback-card">
      <div>
        <h2 className="sec">Was this recommendation useful?</h2>
        <p className="hint">Your response is attached to this run for later, reviewed improvement.</p>
      </div>
      <div className="feedback-card__choices" role="group" aria-label="Recommendation feedback">
        <button className={`btn btn--secondary btn--sm ${rating === "HELPFUL" ? "btn--selected" : ""}`} onClick={() => setRating("HELPFUL")}>Yes, helpful</button>
        <button className={`btn btn--secondary btn--sm ${rating === "NOT_HELPFUL" ? "btn--selected" : ""}`} onClick={() => setRating("NOT_HELPFUL")}>Not quite</button>
      </div>
      {rating && (
        <div className="feedback-card__detail">
          <label className="field">
            <span>What should we learn? <small>(optional)</small></span>
            <textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="field">
            <span>Quick check <small>(optional)</small></span>
            <select value={actionability} onChange={(event) => setActionability(event.target.value)}>
              <option value="">How actionable was it?</option>
              <option value="IMMEDIATE">I could act immediately</option>
              <option value="NEEDED_REVIEW">It needed some review</option>
              <option value="NOT_ACTIONABLE">It was not actionable</option>
            </select>
          </label>
          <button className="btn btn--primary btn--sm" onClick={() => void send()}>Send feedback</button>
        </div>
      )}
      {error && <p className="field__err" role="alert">{error}</p>}
    </section>
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
