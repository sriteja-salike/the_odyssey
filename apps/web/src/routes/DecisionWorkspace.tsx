/* Decision workspace (01 §3.1, §4): drives the full loop by run phase —
   DRAFT → ANALYZING → READY_FOR_REVIEW → APPROVED / REJECTED / DEFERRED, plus
   ABSTAINED. PostgreSQL/FastAPI owns the durable lifecycle, while the current
   Scenario A renderer formats the frozen golden-shaped presentation contract. */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppFrame from "../components/AppFrame";
import ProjectionChart, { type WeekPoint } from "../components/ProjectionChart";
import DraftWorkspace from "../components/DraftWorkspace";
import StageTrace from "../components/StageTrace";
import ResultWorkspace from "../components/ResultWorkspace";
import SafeStop from "../components/SafeStop";
import Dialog from "../components/Dialog";
import NotFoundRun from "./NotFoundRun";
import { Check, X, AlertTriangle, ShieldCheck, ICON, ICON_SM } from "../components/icons";
import { getGolden, getActionMap, getOverlay, type ScenarioLetter, type ActionRecord } from "../lib/api";
import { letterFromRunId } from "../lib/run";
import { useRunState, type Decision, type RunState } from "../lib/runState";
import {
  createRun,
  decideRun,
  evaluateRun,
  getRun,
  type DecisionBrief,
  type LiveRun,
} from "../lib/liveApi";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, usd, weeks, wos, date, dateShort, weekLabel, titleCase, int } from "../lib/format";
import type { ConservativeWeek, ExpectedWeek } from "../types/golden";
import plannedInbound from "../data/fixtures/planned_inbound.json";

const HARD_CONSTRAINTS = ["Budget", "Frozen storage", "Lead time", "Usable life", "Authorization"];

export default function DecisionWorkspace() {
  const { runId = "" } = useParams();
  const navigate = useNavigate();
  const letter = letterFromRunId(runId);
  const [state, setState] = useRunState(runId);
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!letter) return;
    getRun(runId).then((run) => {
      setLiveRun(run);
      const decision = run.decision ? {
        kind: run.decision.kind,
        actionId: run.decision.action_id,
        quantityLb: run.decision.quantity_lb,
        reason: run.decision.reason ?? undefined,
      } : undefined;
      setState({ phase: run.state, decision, selection: state.selection });
    }).catch((reason: Error) => setError(reason.message));
    // The selection is intentionally browser-local until a manager commits it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter, runId, setState]);

  const startAnalysis = useCallback(async () => {
    setError("");
    setState({ phase: "ANALYZING" });
    try {
      const run = await evaluateRun(runId);
      setLiveRun(run);
      setState({ phase: run.state });
    } catch (reason) {
      setError((reason as Error).message);
      setState({ phase: "DRAFT" });
    }
  }, [runId, setState]);

  async function commitDecision(decision: Decision) {
    setError("");
    try {
      const run = await decideRun(runId, decision);
      setLiveRun(run);
      setState({ phase: run.state, decision });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function startClean() {
    if (!letter) return;
    const run = await createRun(letter, runId);
    setConfirmReset(false);
    navigate(`/runs/${run.run_id}`);
  }

  if (!letter) return <NotFoundRun />;
  if (!liveRun && !error) return <div className="main"><p className="hint">Loading the saved simulation…</p></div>;
  if (!liveRun && error) return <NotFoundRun />;

  return (
    <AppFrame runId={runId} letter={letter} active="decision" onStartClean={() => setConfirmReset(true)}>
      {error && <div className="service-error" role="alert">{error}</div>}
      {state.phase === "DRAFT" && <DraftWorkspace letter={letter} onAnalyze={startAnalysis} />}
      {state.phase === "ANALYZING" && <StageTrace onDone={() => undefined} />}
      {state.phase === "READY_FOR_REVIEW" && (
        <Review letter={letter} state={state} commit={setState}
          onDecision={commitDecision} knowledge={liveRun?.knowledge}
          brief={liveRun?.decision_brief ?? undefined} />
      )}
      {state.phase === "ABSTAINED" && <SafeStop status="ABSTAINED" letter={letter} />}
      {(state.phase === "APPROVED" || state.phase === "REJECTED" || state.phase === "DEFERRED") && state.decision && (
        <ResultWorkspace letter={letter} runId={runId} decision={state.decision}
          execution={liveRun?.execution ?? undefined} feedbackRecorded={Boolean(liveRun?.feedback)}
          outcomeRecorded={Boolean(liveRun?.outcome_feedback)}
          brief={liveRun?.decision_brief ?? undefined}
          onReset={() => setConfirmReset(true)} />
      )}

      {confirmReset && (
        <Dialog
          title="Start a clean run?"
          primaryLabel="Start clean run"
          onPrimary={startClean}
          onClose={() => setConfirmReset(false)}
        >
          <p>Start a new run from the original synthetic fixture? The current run and its audit history will remain unchanged.</p>
        </Dialog>
      )}
    </AppFrame>
  );
}

/* ---------------------------------------------------------------- Review --- */
type DialogKind = null | "approve" | "reject" | "defer" | "edit";

function Review({ letter, state, commit, onDecision, knowledge, brief }: {
  letter: ScenarioLetter;
  state: RunState;
  commit: (s: RunState) => void;
  onDecision: (decision: Decision) => Promise<void>;
  knowledge?: LiveRun["knowledge"];
  brief?: DecisionBrief;
}) {
  const golden = getGolden(letter);
  const actions = getActionMap(golden.scenario_id);
  const risk = golden.risks.find((r) => r.is_primary) ?? golden.risks[0];
  const rec = golden.recommended_action;
  const recAction: ActionRecord | undefined = actions[rec.action_id];
  const [dialog, setDialog] = useState<DialogKind>(null);

  // Current manager selection (pending until a decision commits). Defaults to the
  // recommended action; may be a chosen alternative (§4.4) or an edited quantity (§4.5).
  const sel = state.selection;
  const selId = sel?.actionId ?? rec.action_id;
  const selAction = actions[selId];
  const selEval = golden.action_evaluations.find((e) => e.action_id === selId);
  const selQty = sel?.quantityLb ?? rec.requested_quantity_lb;
  const unitPrice = selAction?.unit_price_usd_per_lb ?? 0;
  const selCost = sel?.edited ? selQty * unitPrice : Number(selEval?.cost_usd ?? rec.cost_usd);
  const isAlt = selId !== rec.action_id;
  const nonDefault = !!sel && (isAlt || !!sel.edited);
  const reason = sel?.reason ?? "";
  const reasonValid = !nonDefault || (reason.trim().length >= 1 && reason.trim().length <= 500);
  const reasonLabel = isAlt ? "Reason for choosing this alternative" : "Reason for changing the recommended quantity";
  const reasonErrMsg = isAlt ? "Enter a reason for choosing a non-recommended action." : "Enter a reason for changing the recommended quantity.";

  function selectAlternative(id: string) {
    const a = actions[id];
    const ev = golden.action_evaluations.find((e) => e.action_id === id);
    commit({ ...state, selection: { actionId: id, quantityLb: a?.requested_quantity_lb ?? ev?.requested_quantity_lb ?? 0, reason: "", edited: false } });
  }
  function setReason(r: string) {
    commit({ ...state, selection: { actionId: selId, quantityLb: selQty, reason: r, edited: sel?.edited ?? false } });
  }
  function useRecommended() {
    commit({ phase: "READY_FOR_REVIEW" });
  }
  async function approve() {
    await onDecision({ kind: nonDefault ? "edit-approve" : "approve", actionId: selId, quantityLb: selQty, reason: nonDefault ? reason.trim() : undefined });
  }

  const catLabel = CATEGORY_LABEL[risk.category_id];
  const base = golden.projections.baseline as Record<string, unknown>;
  const detail = base[risk.category_id] as { conservative: ConservativeWeek[]; expected: ExpectedWeek[] } | undefined;

  if (letter !== "A" || !detail) {
    return brief ? (
      <GeneralReview brief={brief} knowledge={knowledge} onDecision={onDecision} />
    ) : null;
  }

  const after = golden.projections.recommended_action_after as Record<string, unknown>;
  const afterCat = after[risk.category_id] as { conservative_end_wos: string[] } | undefined;
  const chartData: WeekPoint[] = detail.conservative.map((w, i) => ({
    week: weekLabel(i + 1, w.week_start),
    conservative: Number(w.end_wos),
    expected: Number(detail.expected[i].end_wos),
    after: afterCat ? Number(afterCat.conservative_end_wos[i]) : undefined,
  }));

  const min = Number(risk.minimum_weeks_of_supply);
  const target = Number(risk.target_weeks_of_supply);
  const breachIdx = risk.first_breach_week_index - 1;

  const alternatives = golden.action_evaluations
    .filter((e) => e.feasible && e.rank != null && e.action_id !== rec.action_id)
    .sort((a, b) => a.rank! - b.rank!);
  const rejected = golden.action_evaluations.filter((e) => !e.feasible);
  const change = whatChanged(letter);

  return (
    <div className="workspace">
      {/* MAIN DECISION COLUMN */}
      <div className="col">
        <section>
          <div style={{ display: "flex", gap: "var(--s3)", alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill pill--breach"><AlertTriangle size={ICON_SM} aria-hidden /> Shortage risk</span>
            <span className="hint" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Check size={ICON_SM} aria-hidden style={{ color: "var(--ok)" }} /> Analysis complete — decision ready
            </span>
          </div>
          <h1 className="risk-title">{catLabel} runs short the week of {dateShort(risk.first_breach_week_start)}</h1>
          <p className="lead">
            Counting only confirmed deliveries, {catLabel.toLowerCase()} coverage falls to{" "}
            <span className="hot hot--danger">{weeks(risk.conservative_end_wos_at_breach)}</span> by{" "}
            {weekLabel(risk.first_breach_week_index, risk.first_breach_week_start)} — under your{" "}
            <span className="hot">{weeks(risk.minimum_weeks_of_supply)}</span> minimum and{" "}
            <span className="hot">{lb(risk.gap_to_target_lb)}</span> short of the{" "}
            <span className="hot">{weeks(target)}</span> target.
          </p>
          <div className="metrics">
            <Metric lab="Shortage begins" val={`Week ${risk.first_breach_week_index}`} sub={`· ${dateShort(risk.first_breach_week_start)}`} />
            <Metric lab="Coverage then" val={wos(risk.conservative_end_wos_at_breach)} sub="weeks" danger />
            <Metric lab="Your minimum" val={wos(risk.minimum_weeks_of_supply)} sub="weeks" />
            <Metric lab="Short by" val={int(risk.gap_to_target_lb)} sub="lb" />
          </div>
        </section>

        <section className="card">
          <h2 className="sec">Four-week projection · conservative is the decision default</h2>
          <ProjectionChart data={chartData} min={min} target={target} breachIndex={breachIdx} category={catLabel} />
        </section>

        <section className="card">
          <h2 className="sec">Recommended response</h2>
          <div className="rec">
            <div className="rec__top">
              <div>
                <div className="rec__name">
                  {recAction?.display_name ?? rec.action_id}
                  <span className="tag">Recommended</span>
                </div>
                <div className="rec__sub">
                  {usd(rec.cost_usd)} · arrives {date(rec.arrival_week_start)}, before the shortage.
                  Restores {catLabel.toLowerCase()} to {weeks(target)} of supply and closes the full {lb(rec.gap_reduction_lb)} gap.
                </div>
                <div className="hint" style={{ marginTop: 6 }}>Highest-ranked feasible response under these assumptions.</div>
              </div>
              <ConfidenceBadge level={rec.confidence} />
            </div>
            <div className="rec__figures">
              <Fig lab="Quantity" val={lb(rec.requested_quantity_lb)} />
              <Fig lab="Arrival" val={date(rec.arrival_week_start)} />
              <Fig lab="Simulated cost" val={usd(rec.cost_usd)} />
              <Fig lab="Gap reduction" val={lb(rec.gap_reduction_lb)} />
              <Fig lab="After-state at breach" val={`${lb(risk.target_end_inventory_lb)} · ${weeks(target)}`} />
              <Fig lab="Match score" val={golden.action_evaluations.find((e) => e.action_id === rec.action_id)?.score_display ?? "—"} />
            </div>

            <div style={{ marginTop: "var(--s4)" }}>
              <h3 className="sec" style={{ marginBottom: "var(--s2)" }}>Hard constraints</h3>
              <div className="constraints">
                {HARD_CONSTRAINTS.map((c) => (
                  <span className="chip chip--pass" key={c}><Check size={ICON_SM} aria-hidden /> {c}</span>
                ))}
              </div>
            </div>

            {nonDefault && (
              <div className="selpanel">
                <div className="selpanel__head">
                  <span className="editnote"><Check size={ICON_SM} aria-hidden /> {isAlt ? "Manager-selected alternative" : "Manager-edited quantity"}</span>
                  <button className="btn btn--ghost btn--sm" onClick={useRecommended}>Use recommended instead</button>
                </div>
                <p className="selpanel__summary">
                  Approving <b>{selAction?.display_name ?? selId}</b> · {lb(selQty)} · {usd(selCost)}
                  {selEval?.gap_reduction_lb ? ` · closes ${lb(selEval.gap_reduction_lb)} of the ${lb(risk.gap_to_target_lb)} gap` : ""}
                </p>
                <label className="field">
                  <span>{reasonLabel}</span>
                  <textarea value={reason} maxLength={500} rows={2} onChange={(e) => setReason(e.target.value)} />
                  {!reasonValid && <span className="field__err">{reasonErrMsg}</span>}
                </label>
              </div>
            )}

            <div className="actions">
              <button className="btn btn--primary" disabled={nonDefault && !reasonValid} onClick={() => setDialog("approve")}>
                <ShieldCheck size={ICON} aria-hidden /> Approve simulated action
              </button>
              <button className="btn btn--secondary" onClick={() => setDialog("edit")}>Edit quantity</button>
              <button className="btn btn--ghost" onClick={() => setDialog("reject")}>Reject</button>
              <button className="btn btn--ghost" onClick={() => setDialog("defer")}>Defer</button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="sec">Other feasible actions</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Action</th>
                <th scope="col" className="num">Quantity</th>
                <th scope="col" className="num">Cost</th>
                <th scope="col" className="num">Gap reduction</th>
                <th scope="col" className="num">Score</th>
                <th scope="col">Evidence</th>
                <th scope="col"><span className="visually-hidden">Select</span></th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((e) => {
                const a = actions[e.action_id];
                const usable = e.expected_usable_quantity_lb;
                const chosen = selId === e.action_id;
                return (
                  <tr key={e.evaluated_action_id} className={chosen ? "row--chosen" : undefined}>
                    <td>{a?.display_name ?? e.action_id}</td>
                    <td className="num">{lb(e.requested_quantity_lb)}</td>
                    <td className="num">{usd(e.cost_usd)}</td>
                    <td className="num">{usable ? `${lb(usable)}*` : lb(e.gap_reduction_lb ?? 0)}</td>
                    <td className="num">{e.score_display}</td>
                    <td>{e.evidence_ids?.[0] ? <a className="srcid" href="#evidence" aria-label={`View source ${e.evidence_ids[0]}`}>View</a> : "—"}</td>
                    <td>
                      {chosen ? (
                        <span className="chip chip--pass"><Check size={ICON_SM} aria-hidden /> Selected</span>
                      ) : (
                        <button className="btn btn--secondary btn--sm" onClick={() => selectAlternative(e.action_id)}>Select</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {alternatives.some((e) => e.expected_usable_quantity_lb) && (
            <p className="note">* Expected usable quantity — a donor ask is free but uncertain and covers only part of the gap.</p>
          )}
        </section>

        <section className="card">
          <h2 className="sec">Not feasible in this scenario</h2>
          <ul className="rejected">
            {rejected.map((e) => {
              const a = actions[e.action_id];
              return (
                <li key={e.evaluated_action_id}>
                  <span style={{ fontWeight: 700 }}><X size={ICON_SM} className="x-icon" aria-hidden /> {a?.display_name ?? e.action_id}</span>
                  <span className="why">
                    {reasonText(e.failed_constraint_codes)}{" "}
                    {e.failed_constraint_codes.map((c) => (<span className="code" key={c}>{c}</span>))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* EVIDENCE / CONTEXT RAIL */}
      <aside className="col" id="evidence">
        {knowledge && (
          <section className="card source-card">
            <h2 className="sec">Knowledge used</h2>
            <p className="hint">Live connector snapshots loaded from PostgreSQL for this run.</p>
            <h3 className="source-card__group">Current operations</h3>
            {knowledge.current.map((source) => (
              <div className="evrow" key={source.source_id}>
                <span>{source.display_name}<div className="ev-id mono">{source.source_id}</div></span>
                <span className="source-ok"><Check size={12} aria-hidden /> synced</span>
              </div>
            ))}
            <h3 className="source-card__group">Organizational knowledge</h3>
            {knowledge.organizational.map((source) => (
              <div className="evrow" key={source.source_id}>
                <span>{source.display_name}<div className="ev-id mono">{source.source_id}</div></span>
                <span className="source-ok"><Check size={12} aria-hidden /> synced</span>
              </div>
            ))}
          </section>
        )}

        <section className="card">
          <h2 className="sec">What changed</h2>
          <div className="evrow"><span>Shipment</span><span className="evrow__v mono">{change.inboundId}</span></div>
          <div className="evrow"><span>Quantity</span><span className="evrow__v">{lb(change.quantityLb)}</span></div>
          <div className="evrow"><span>Timing</span><span className="evrow__v">{change.from} → {change.to}</span></div>
          <div className="evrow"><span>Status</span><span className="evrow__v" style={{ color: "var(--warn)" }}>{change.statusFrom} → {change.statusTo}</span></div>
        </section>

        <section className="card">
          <h2 className="sec">Why this is at risk</h2>
          {risk.evidence_ids.map((id) => (
            <div className="evrow" key={id}>
              <span>{evidenceLabel(id)}<div className="ev-id mono">{id}</div></span>
              <a className="srcid" href="#evidence" aria-label={`View source ${id}`}>View</a>
            </div>
          ))}
        </section>

        <section className="card">
          <h2 className="sec">Assumptions</h2>
          <ul className="assum">
            <li>Forecast = mean of the last four completed weeks ({lb(golden.forecast_distribution_lb[risk.category_id])}/wk).</li>
            <li>Conservative view counts confirmed inbound only.</li>
            {recAction && <li>Vendor unit price ${recAction.unit_price_usd_per_lb.toFixed(2)}/lb, {recAction.lead_time_days}-day lead time.</li>}
          </ul>
        </section>

        <section className="card">
          <h2 className="sec">What the agent checked</h2>
          <div className="stages">
            {["Read notice", "Validated records", "Projected coverage", "Checked responses", "Prepared brief"].map((s) => (
              <span className="stage" key={s}><Check size={12} aria-hidden /> {s}</span>
            ))}
          </div>
        </section>
      </aside>

      {/* ------- dialogs ------- */}
      {dialog === "approve" && (
        <Dialog
          title="Apply this action to the simulation?"
          primaryLabel="Approve simulated action"
          onPrimary={() => { setDialog(null); approve(); }}
          onClose={() => setDialog(null)}
        >
          <p>This updates only the current synthetic run. It will not place an order, reserve food, contact a donor, or notify another organization.</p>
          <dl className="kv">
            <div><dt>Action</dt><dd>{selAction?.display_name ?? selId}</dd></div>
            <div><dt>Quantity</dt><dd>{lb(selQty)}</dd></div>
            <div><dt>Simulated cost</dt><dd>{usd(selCost)}</dd></div>
            <div><dt>Arrival</dt><dd>{date(selAction?.arrival_week_start ?? rec.arrival_week_start)}</dd></div>
            {nonDefault && <div><dt>Manager reason</dt><dd>{reason}</dd></div>}
          </dl>
        </Dialog>
      )}

      {dialog === "reject" && (
        <RejectDialog onClose={() => setDialog(null)} onConfirm={(r) => {
          setDialog(null);
          void onDecision({ kind: "reject", actionId: selId, quantityLb: selQty, reason: r });
        }} />
      )}

      {dialog === "defer" && (
        <DeferDialog onClose={() => setDialog(null)} onConfirm={(r) => {
          setDialog(null);
          void onDecision({ kind: "defer", actionId: selId, quantityLb: selQty, reason: r });
        }} />
      )}

      {dialog === "edit" && selAction && (
        <EditQuantityDialog
          action={selAction}
          initialQty={selQty}
          initialReason={sel?.edited ? reason : ""}
          onClose={() => setDialog(null)}
          onRecheck={(qty, r) => { setDialog(null); commit({ ...state, selection: { actionId: selId, quantityLb: qty, reason: r, edited: true } }); }}
        />
      )}
    </div>
  );
}

function GeneralReview({
  brief, knowledge, onDecision,
}: {
  brief: DecisionBrief;
  knowledge?: LiveRun["knowledge"];
  onDecision: (decision: Decision) => Promise<void>;
}) {
  const [dialog, setDialog] = useState<null | "approve" | "reject" | "defer">(null);
  const recommendation = brief.recommendation;
  if (!recommendation) return null;
  const action = recommendation.action;
  const risk = brief.primary_risk;
  const category = risk?.category_id
    ? (CATEGORY_LABEL as Record<string, string>)[risk.category_id] ?? humanize(risk.category_id)
    : "Operations";
  const facts = Object.entries(risk?.details ?? {})
    .filter(([, value]) => ["string", "number"].includes(typeof value))
    .slice(0, 4);

  return (
    <div className="workspace">
      <div className="col">
        <section>
          <div style={{ display: "flex", gap: "var(--s3)", alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill pill--breach"><AlertTriangle size={ICON_SM} aria-hidden /> {humanize(risk?.risk_type ?? "decision risk")}</span>
            <span className="hint"><Check size={ICON_SM} aria-hidden style={{ color: "var(--ok)", verticalAlign: "-2px" }} /> Verified recommendation ready</span>
          </div>
          <h1 className="risk-title">{brief.scenario_name}</h1>
          <p className="lead">{brief.status_message}</p>
          {facts.length > 0 && (
            <div className="metrics">
              {facts.map(([key, value]) => (
                <Metric key={key} lab={humanize(key)} val={formatDecisionFact(key, value)} />
              ))}
            </div>
          )}
        </section>

        {brief.rationale && (
          <section className="card">
            <h2 className="sec">Why this recommendation</h2>
            <p className="lead" style={{ fontSize: 17 }}>{brief.rationale.why_now}</p>
            <p>{brief.rationale.why_this_action}</p>
            <p className="hint">{brief.rationale.uncertainty}</p>
          </section>
        )}

        <section className="card">
          <h2 className="sec">Recommended response</h2>
          <div className="rec">
            <div className="rec__top">
              <div>
                <div className="rec__name">{action.display_name}<span className="tag">Recommended</span></div>
                <div className="rec__sub">Best feasible response under the verified scenario rules.</div>
              </div>
              <ConfidenceBadge level={recommendation.confidence_label} />
            </div>
            <div className="rec__figures">
              <Fig lab="Quantity" val={lb(action.requested_quantity_lb)} />
              <Fig lab="Simulated cost" val={usd(action.cost_usd)} />
              <Fig lab="Category" val={category} />
              <Fig lab="Score" val={action.score ? Number(action.score).toFixed(1) : "—"} />
            </div>
            <div className="constraints" style={{ marginTop: "var(--s4)" }}>
              <span className="chip chip--pass"><Check size={ICON_SM} aria-hidden /> Feasible</span>
              <span className="chip chip--pass"><Check size={ICON_SM} aria-hidden /> Human approval required</span>
              <span className="chip chip--pass"><Check size={ICON_SM} aria-hidden /> Simulation only</span>
            </div>
            <div className="actions">
              <button className="btn btn--primary" onClick={() => setDialog("approve")}><ShieldCheck size={ICON} aria-hidden /> Approve simulated action</button>
              <button className="btn btn--ghost" onClick={() => setDialog("reject")}>Reject</button>
              <button className="btn btn--ghost" onClick={() => setDialog("defer")}>Defer</button>
            </div>
          </div>
        </section>

        {brief.alternatives.length > 0 && (
          <section className="card">
            <h2 className="sec">Other feasible actions considered</h2>
            <table className="table">
              <thead><tr><th>Action</th><th className="num">Quantity</th><th className="num">Cost</th><th className="num">Rank</th></tr></thead>
              <tbody>
                {brief.alternatives.map((alternative) => (
                  <tr key={alternative.evaluated_action_id}>
                    <td>{alternative.display_name}</td>
                    <td className="num">{lb(alternative.requested_quantity_lb)}</td>
                    <td className="num">{usd(alternative.cost_usd)}</td>
                    <td className="num">{alternative.rank ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {brief.rejected_options.length > 0 && (
          <section className="card">
            <h2 className="sec">Not feasible in this scenario</h2>
            <ul className="rejected">
              {brief.rejected_options.map((option) => (
                <li key={option.evaluated_action_id}>
                  <span style={{ fontWeight: 700 }}><X size={ICON_SM} className="x-icon" aria-hidden /> {option.display_name}</span>
                  <span className="why">{option.failed_constraints.map(humanize).join(", ")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="col">
        {knowledge && (
          <section className="card source-card">
            <h2 className="sec">Knowledge used</h2>
            <p className="hint">Frozen connector snapshots for this run.</p>
            {[...knowledge.current, ...knowledge.organizational].map((source) => (
              <div className="evrow" key={source.source_id}>
                <span>{source.display_name}<div className="ev-id mono">{source.source_id}</div></span>
                <span className="source-ok"><Check size={12} aria-hidden /> pinned</span>
              </div>
            ))}
          </section>
        )}
        <section className="card">
          <h2 className="sec">Evidence</h2>
          {brief.evidence.map((item) => (
            <div className="evidence-brief" key={item.evidence_id}>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
              <span className="ev-id mono">{item.evidence_id} · {humanize(item.trust_level)}</span>
            </div>
          ))}
        </section>
      </aside>

      {dialog === "approve" && (
        <Dialog title="Apply this action to the simulation?" primaryLabel="Approve simulated action"
          onClose={() => setDialog(null)} onPrimary={() => {
            setDialog(null);
            void onDecision({ kind: "approve", actionId: action.action_id, quantityLb: action.requested_quantity_lb });
          }}>
          <p>This records an approved action intent and completes it only in the synthetic gateway. No external system is changed.</p>
          <dl className="kv">
            <div><dt>Action</dt><dd>{action.display_name}</dd></div>
            <div><dt>Quantity</dt><dd>{lb(action.requested_quantity_lb)}</dd></div>
            <div><dt>Simulated cost</dt><dd>{usd(action.cost_usd)}</dd></div>
          </dl>
        </Dialog>
      )}
      {dialog === "reject" && (
        <RejectDialog onClose={() => setDialog(null)} onConfirm={(reason) => {
          setDialog(null);
          void onDecision({ kind: "reject", actionId: action.action_id, quantityLb: action.requested_quantity_lb, reason });
        }} />
      )}
      {dialog === "defer" && (
        <DeferDialog onClose={() => setDialog(null)} onConfirm={(reason) => {
          setDialog(null);
          void onDecision({ kind: "defer", actionId: action.action_id, quantityLb: action.requested_quantity_lb, reason });
        }} />
      )}
    </div>
  );
}

/* --------------------------------------------------------- dialog bodies --- */
function RejectDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = reason.trim().length >= 1 && reason.trim().length <= 500;
  return (
    <Dialog title="Reject this recommendation?" primaryLabel="Reject recommendation" primaryTone="danger"
      primaryDisabled={!valid} onClose={onClose}
      onPrimary={() => { setTouched(true); if (valid) onConfirm(reason.trim()); }}>
      <label className="field">
        <span>Reason for rejecting</span>
        <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} rows={3} />
        {touched && !valid && <span className="field__err">Enter a reason for rejecting this recommendation.</span>}
      </label>
    </Dialog>
  );
}

function DeferDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: (r: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog title="Defer this decision?" primaryLabel="Defer decision" onClose={onClose} onPrimary={() => onConfirm(note.trim())}>
      <p className="hint">The risk stays open and the projection is unchanged.</p>
      <label className="field">
        <span>Deferral note (optional)</span>
        <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} rows={3} />
      </label>
    </Dialog>
  );
}

function EditQuantityDialog({ action, initialQty, initialReason, onClose, onRecheck }:
  { action: ActionRecord; initialQty: number; initialReason: string; onClose: () => void; onRecheck: (qty: number, reason: string) => void }) {
  const [qty, setQty] = useState(String(initialQty));
  const [reason, setReason] = useState(initialReason);
  const [touched, setTouched] = useState(false);
  const n = Number(qty);
  const { minimum_quantity_lb: mn, maximum_quantity_lb: mx, quantity_increment_lb: inc } = action;
  const rangeErr = !Number.isInteger(n) || n < mn || n > mx ? `Enter a whole number between ${lb(mn)} and ${lb(mx)}.` : "";
  const incErr = !rangeErr && (n - mn) % inc !== 0 ? `Quantity must change in ${lb(inc)} steps.` : "";
  const reasonErr = reason.trim().length < 1 ? "Enter a reason for changing the recommended quantity." : "";
  const valid = !rangeErr && !incErr && !reasonErr;
  const cost = Number.isFinite(n) ? n * action.unit_price_usd_per_lb : 0;

  return (
    <Dialog title="Edit quantity" primaryLabel="Recheck plan" primaryDisabled={!valid}
      onClose={onClose} onPrimary={() => { setTouched(true); if (valid) onRecheck(n, reason.trim()); }}>
      <dl className="kv">
        <div><dt>Action</dt><dd>{action.display_name}</dd></div>
        <div><dt>Range</dt><dd>{lb(mn)}–{lb(mx)} · {lb(inc)} steps</dd></div>
        <div><dt>Unit price</dt><dd>${action.unit_price_usd_per_lb.toFixed(2)}/lb</dd></div>
        <div><dt>Recalculated cost</dt><dd>{usd(cost)}</dd></div>
      </dl>
      <label className="field">
        <span>Quantity (lb)</span>
        <input type="number" value={qty} min={mn} max={mx} step={inc} onChange={(e) => setQty(e.target.value)} onBlur={() => setTouched(true)} />
        {touched && (rangeErr || incErr) && <span className="field__err">{rangeErr || incErr}</span>}
      </label>
      <label className="field">
        <span>Reason for changing the recommended quantity</span>
        <textarea value={reason} maxLength={500} rows={2} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} />
        {touched && reasonErr && <span className="field__err">{reasonErr}</span>}
      </label>
      <p className="hint">The browser performs no domain calculation — full re-scoring runs in the engine when connected.</p>
    </Dialog>
  );
}

/* --------------------------------------------------------------- helpers --- */
function Metric({ lab, val, sub, danger }: { lab: string; val: string; sub?: string; danger?: boolean }) {
  return (
    <div className="metric">
      <div className="metric__lab">{lab}</div>
      <div className="metric__val" style={danger ? { color: "var(--breach)" } : undefined}>{val} {sub && <small>{sub}</small>}</div>
    </div>
  );
}
function Fig({ lab, val }: { lab: string; val: string }) {
  return <div className="fig"><div className="fig__lab">{lab}</div><div className="fig__num">{val}</div></div>;
}
function ConfidenceBadge({ level }: { level: string }) {
  const cls = level === "HIGH" ? "conf--high" : "conf--medium";
  return <span className={`conf ${cls}`}><Check size={ICON_SM} aria-hidden /> Confidence: {titleCase(level)}</span>;
}

function reasonText(codes: string[]): string {
  if (codes.includes("MONITOR_NOT_SAFE")) return "Coverage already breaches the minimum";
  if (codes.includes("ARRIVES_BY_BREACH")) return "Arrives after the breach week";
  if (codes.includes("BUDGET") || codes.includes("STORAGE_CAPACITY")) return "Over budget or storage capacity";
  return "Fails a hard constraint";
}
function humanize(value: string): string {
  return value.toLowerCase().split("_").map(titleCase).join(" ");
}
function formatDecisionFact(key: string, value: unknown): string {
  if (key.endsWith("_lb")) return lb(String(value));
  if (key.endsWith("_usd")) return usd(String(value));
  if (key.includes("date") || key.includes("week_start")) return date(String(value));
  if (key.includes("rate") && Number(value) <= 1) return `${Math.round(Number(value) * 100)}%`;
  return String(value);
}
function evidenceLabel(id: string): string {
  if (id.startsWith("FLOW")) return "Recent distribution history";
  if (id.startsWith("INB")) return "Delayed shipment record";
  if (id.startsWith("POLICY")) return "Category stocking policy";
  if (id.includes("NOTICE")) return "USDA delay notice";
  return "Source record";
}

function whatChanged(letter: ScenarioLetter) {
  const overlay = getOverlay(letter);
  const mut = overlay.overlay.inbound_mutations[0];
  const records = (plannedInbound as { records: { inbound_id: string; gross_quantity_lb: number; expected_week_start: string; status: string }[] }).records;
  const rec = records.find((r) => r.inbound_id === mut?.inbound_id);
  const set = (mut?.set ?? {}) as { expected_week_start?: string; status?: string };
  return {
    inboundId: mut?.inbound_id ?? "—",
    quantityLb: rec?.gross_quantity_lb ?? 0,
    from: rec ? dateShort(rec.expected_week_start) : "—",
    to: set.expected_week_start ? dateShort(set.expected_week_start) : "—",
    statusFrom: rec ? titleCase(rec.status) : "—",
    statusTo: set.status ? titleCase(set.status) : "—",
  };
}
