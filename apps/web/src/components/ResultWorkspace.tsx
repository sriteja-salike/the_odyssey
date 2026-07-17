import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Tag, TextArea } from "@carbon/react";
import { CheckmarkFilled, Locked, Renew, WarningAlt } from "@carbon/icons-react";
import type { ScenarioLetter } from "../lib/api";
import {
  submitFeedback,
  submitOutcomeFeedback,
  type DecisionBrief,
  type LiveExecution,
} from "../lib/liveApi";
import type { Decision } from "../lib/runState";
import { lb, usd } from "../lib/format";
import DecisionVisual from "./DecisionVisual";

interface Props {
  letter: ScenarioLetter;
  runId: string;
  decision: Decision;
  execution?: LiveExecution;
  feedbackRecorded: boolean;
  outcomeRecorded: boolean;
  brief?: DecisionBrief;
  onReset: () => void;
}

export default function ResultWorkspace(props: Props) {
  const { decision } = props;
  if (decision.kind === "reject" || decision.kind === "defer") return <UnappliedResult {...props} />;
  return <ApprovedResult {...props} />;
}

function ApprovedResult({ letter, runId, decision, execution, feedbackRecorded, outcomeRecorded, brief, onReset }: Props) {
  const action = [brief?.recommendation?.action, ...(brief?.alternatives ?? [])]
    .find((item) => item?.action_id === decision.actionId) ?? brief?.recommendation?.action;

  return (
    <div className="journey-shell result-journey">
      <header className="journey-intro journey-intro--compact result-hero">
        <Tag type="green" size="sm">Simulation complete</Tag>
        <h1>Action completed in simulation</h1>
        <p>{action?.display_name ?? decision.actionId} was recorded for this synthetic run. No external action was taken.</p>
      </header>

      <ol className="task-list task-list--complete">
        <CompletedStep number={1} title="Understand the issue" copy="The impact check was completed using the frozen source records." />
        <CompletedStep number={2} title="Choose a response" copy={action?.display_name ?? decision.actionId} />
        <li className="task-step task-step--complete task-step--result">
          <div className="task-step__marker"><CheckmarkFilled size={20} aria-hidden /></div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 3</span><h2>Confirm</h2></div><Tag type="green">Complete</Tag></div>
            <dl className="result-summary">
              <div><dt>Quantity</dt><dd>{lb(decision.quantityLb)}</dd></div>
              <div><dt>Simulated cost</dt><dd>{usd(execution?.cost_usd ?? action?.cost_usd ?? "0")}</dd></div>
              <div><dt>External action</dt><dd>Not performed</dd></div>
            </dl>
            {brief && <DecisionVisual presentation={brief.presentation} result compact />}
          </div>
        </li>
      </ol>

      <OutcomeFeedback runId={runId} recorded={outcomeRecorded} />

      <details className="plain-disclosure recommendation-feedback-disclosure">
        <summary>Give feedback on this recommendation</summary>
        <RecommendationFeedback runId={runId} recorded={feedbackRecorded} />
      </details>

      <details className="plain-disclosure">
        <summary>Decision details</summary>
        <div className="disclosure-content technical-details">
          {execution ? (
            <dl>
              <div><dt>Receipt</dt><dd className="mono">{execution.execution_id}</dd></div>
              <div><dt>Status</dt><dd>Completed in simulation</dd></div>
              <div><dt>Target</dt><dd>{execution.target_system}</dd></div>
              <div><dt>External write</dt><dd>{execution.external_write_performed ? "Completed" : "Not performed"}</dd></div>
            </dl>
          ) : <p>No execution receipt was returned.</p>}
          <div className="record-links">
            {letter === "A" && <Button as={Link} kind="tertiary" size="sm" to={`/runs/${runId}/compare`}>Compare responses</Button>}
            <Button as={Link} kind="tertiary" size="sm" to={`/runs/${runId}/audit`}>Open audit record</Button>
          </div>
        </div>
      </details>

      <div className="result-actions"><Button as={Link} to="/">Return to Today</Button><Button kind="ghost" renderIcon={Renew} onClick={onReset}>Start clean run</Button></div>
      <p className="journey-reassurance"><Locked size={16} aria-hidden /> Simulation only — no real order was placed.</p>
    </div>
  );
}

function UnappliedResult({ runId, decision, feedbackRecorded, onReset }: Props) {
  const rejected = decision.kind === "reject";
  return (
    <div className="journey-shell result-journey">
      <header className="journey-intro journey-intro--compact">
        <Tag type="warm-gray" size="sm">{rejected ? "Recommendation rejected" : "Decision deferred"}</Tag>
        <h1>{rejected ? "The recommendation was not applied" : "The risk remains open"}</h1>
        <p>No simulated action or external action was performed.</p>
      </header>
      <ol className="task-list">
        <CompletedStep number={1} title="Understand the issue" copy="The impact check was completed." />
        <CompletedStep number={2} title="Choose a response" copy="The recommendation was reviewed by a manager." />
        <li className="task-step task-step--blocked"><div className="task-step__marker"><WarningAlt size={20} aria-hidden /></div><div className="task-step__body"><div className="task-step__title"><div><span>Step 3</span><h2>Confirm</h2></div><Tag type="warm-gray">Recorded</Tag></div><p>{rejected ? "The recommendation was rejected." : "The decision was deferred for later review."}</p>{decision.reason && <blockquote>{decision.reason}</blockquote>}</div></li>
      </ol>
      <details className="plain-disclosure recommendation-feedback-disclosure"><summary>Give feedback on this recommendation</summary><RecommendationFeedback runId={runId} recorded={feedbackRecorded} /></details>
      <div className="result-actions"><Button as={Link} to="/">Return to Today</Button><Button as={Link} kind="tertiary" to={`/runs/${runId}/audit`}>Open audit record</Button><Button kind="ghost" renderIcon={Renew} onClick={onReset}>Start clean run</Button></div>
      <p className="journey-reassurance"><Locked size={16} aria-hidden /> No external action was taken.</p>
    </div>
  );
}

function CompletedStep({ number, title, copy }: { number: number; title: string; copy: string }) {
  return (
    <li className="task-step task-step--complete task-step--collapsed">
      <div className="task-step__marker"><CheckmarkFilled size={20} aria-hidden /></div>
      <div className="task-step__body"><div className="task-step__title"><div><span>Step {number}</span><h2>{title}</h2></div><Tag type="green">Complete</Tag></div><p>{copy}</p></div>
    </li>
  );
}

function OutcomeFeedback({ runId, recorded }: { runId: string; recorded: boolean }) {
  const [choice, setChoice] = useState<"SUCCESSFUL" | "PARTIAL" | "FAILED" | null>(null);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(recorded);
  const [error, setError] = useState("");

  async function send(outcome: "SUCCESSFUL" | "PARTIAL" | "FAILED") {
    if (outcome !== "SUCCESSFUL" && !reason.trim()) return;
    try {
      await submitOutcomeFeedback(runId, outcome, reason);
      setSent(true);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  if (sent) return <section className="feedback-success"><CheckmarkFilled size={18} aria-hidden /> Outcome recorded. Thank you.</section>;
  return (
    <section className="feedback-panel" aria-labelledby="outcome-title">
      <div><span className="feedback-panel__eyebrow">Optional feedback</span><h2 id="outcome-title">Did the action work?</h2><p>Record the outcome so future recommendations can be evaluated.</p></div>
      <div className="feedback-panel__choices">
        <Button kind="secondary" size="sm" onClick={() => void send("SUCCESSFUL")}>Yes, it worked</Button>
        <Button kind={choice === "PARTIAL" ? "primary" : "secondary"} size="sm" onClick={() => setChoice("PARTIAL")}>Partly</Button>
        <Button kind={choice === "FAILED" ? "primary" : "secondary"} size="sm" onClick={() => setChoice("FAILED")}>No</Button>
      </div>
      {choice && <div className="feedback-panel__detail"><TextArea id="outcome-reason" labelText="What happened?" value={reason} invalid={!reason.trim()} invalidText="Add a short explanation." onChange={(event) => setReason(event.target.value)} /><Button size="sm" disabled={!reason.trim()} onClick={() => void send(choice)}>Record outcome</Button></div>}
      {error && <p className="field__err" role="alert">{error}</p>}
    </section>
  );
}

function RecommendationFeedback({ runId, recorded }: { runId: string; recorded: boolean }) {
  const [rating, setRating] = useState<"HELPFUL" | "NOT_HELPFUL" | null>(null);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(recorded);
  const [error, setError] = useState("");

  async function send(value: "HELPFUL" | "NOT_HELPFUL") {
    try {
      await submitFeedback(runId, value, reason);
      setSent(true);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  if (sent) return <div className="feedback-success"><CheckmarkFilled size={18} aria-hidden /> Recommendation feedback recorded.</div>;
  return (
    <div className="feedback-panel feedback-panel--nested">
      <h3>Was this recommendation useful?</h3>
      <div className="feedback-panel__choices"><Button kind={rating === "HELPFUL" ? "primary" : "secondary"} size="sm" onClick={() => { setRating("HELPFUL"); void send("HELPFUL"); }}>Yes, helpful</Button><Button kind={rating === "NOT_HELPFUL" ? "primary" : "secondary"} size="sm" onClick={() => setRating("NOT_HELPFUL")}>Not quite</Button></div>
      {rating === "NOT_HELPFUL" && <div className="feedback-panel__detail"><TextArea id="recommendation-reason" labelText="What should improve? (optional)" value={reason} onChange={(event) => setReason(event.target.value)} /><Button size="sm" onClick={() => void send("NOT_HELPFUL")}>Send feedback</Button></div>}
      {error && <p className="field__err" role="alert">{error}</p>}
    </div>
  );
}
