import { Button, Tag } from "@carbon/react";
import { Link } from "react-router-dom";
import { CheckmarkFilled, Locked, Renew, WarningAlt } from "@carbon/icons-react";
import type { DecisionBrief } from "../lib/liveApi";
import type { DecisionStatus } from "../types/golden";
import DecisionVisual from "./DecisionVisual";

const HEADLINE: Partial<Record<DecisionStatus, string>> = {
  ABSTAINED: "A safe recommendation cannot be produced from the current data.",
  NO_ACTION_REQUIRED: "No supply category is projected below its safe minimum.",
  FAILED: "The impact check could not be completed.",
  STALE: "The information changed after this check.",
};

export default function SafeStop({
  status,
  brief,
  onStartClean,
  onRetry,
}: {
  status: DecisionStatus;
  brief?: DecisionBrief;
  onStartClean: () => void;
  onRetry?: () => void;
}) {
  const abstained = status === "ABSTAINED";
  const healthy = status === "NO_ACTION_REQUIRED";

  return (
    <div className="journey-shell safe-journey">
      <header className="journey-intro journey-intro--compact">
        <Tag type={healthy ? "green" : "red"} size="sm">{healthy ? "No action needed" : "Action paused"}</Tag>
        <h1>{HEADLINE[status] ?? "This decision cannot continue."}</h1>
        <p>{healthy
          ? "The verified four-week check found no actionable supply risk."
          : abstained
            ? "ShareStack did not guess. The records below must be resolved before a recommendation is safe."
            : "No recommendation or simulated action was recorded."}</p>
      </header>

      {abstained && brief && (
        <div className="safe-stop-provenance">
          <CheckmarkFilled size={20} aria-hidden />
          <div>
            <strong>ShareStack stopped safely</strong>
            <span>{safeStopAgentLabel(brief)} found the conflict; the safety rules kept approval unavailable until the records agree.</span>
          </div>
        </div>
      )}

      <ol className="task-list">
        <li className="task-step task-step--complete">
          <div className="task-step__marker"><CheckmarkFilled size={20} aria-hidden /></div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 1</span><h2>Understand the issue</h2></div><Tag type="green">Complete</Tag></div>
            {abstained && brief ? <DecisionVisual presentation={brief.presentation} /> : <p>The impact check finished without changing inventory, budget, or external systems.</p>}
          </div>
        </li>
        <li className="task-step task-step--blocked">
          <div className="task-step__marker"><WarningAlt size={20} aria-hidden /></div>
          <div className="task-step__body"><div className="task-step__title"><div><span>Step 2</span><h2>{healthy ? "No response required" : "Choose a response"}</h2></div><Tag type={healthy ? "green" : "red"}>{healthy ? "Clear" : "Blocked"}</Tag></div><p>{healthy ? "The safest next step is to continue monitoring." : "A safe response cannot be selected until the source records agree."}</p></div>
        </li>
        <li className="task-step task-step--pending" aria-disabled="true">
          <div className="task-step__marker"><Locked size={18} aria-hidden /></div>
          <div className="task-step__body"><div className="task-step__title"><div><span>Step 3</span><h2>Confirm</h2></div><Tag type="cool-gray">Unavailable</Tag></div><p>No approval is available in this state.</p></div>
        </li>
      </ol>

      {abstained && <section className="safe-handoff" aria-labelledby="safe-handoff-title">
        <span>Next step</span>
        <h2 id="safe-handoff-title">Reconcile the records, then run the check again.</h2>
        <p>The agent can identify the differing fields and help prepare a correction request. A staff member still confirms the authoritative record.</p>
      </section>}

      <div className="safe-actions">
        {abstained && <Button as={Link} to="/assistant?prompt=What%20needs%20to%20be%20corrected%20in%20these%20conflicting%20records%3F">Ask agent how to resolve this</Button>}
        {onRetry && <Button renderIcon={Renew} onClick={onRetry}>Run the check again</Button>}
        <Button as={Link} kind="tertiary" to="/">Return to Today</Button>
        <Button kind="ghost" onClick={onStartClean}>Start clean run</Button>
      </div>
      <p className="journey-reassurance"><Locked size={16} aria-hidden /> No external action was taken.</p>
    </div>
  );
}

function safeStopAgentLabel(brief: DecisionBrief): string {
  if (brief.agent.effective_mode === "live" && brief.agent.status === "live_verified") {
    return "The decision agent";
  }
  if (brief.agent.effective_mode === "offline_fallback") {
    return "The verified backup review";
  }
  return "The verified decision review";
}
