import { useState } from "react";
import { Button, Checkbox, RadioButton, RadioButtonGroup, Tag } from "@carbon/react";
import { Link } from "react-router-dom";
import { CheckmarkFilled, Locked, Renew, WarningAlt } from "@carbon/icons-react";
import type { DecisionBrief } from "../lib/liveApi";
import type { BlockerResolutionSource } from "../lib/liveApi";
import type { DecisionStatus } from "../types/golden";
import DecisionVisual from "./DecisionVisual";
import Dialog from "./Dialog";

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
  onResolve,
}: {
  status: DecisionStatus;
  brief?: DecisionBrief;
  onStartClean: () => void;
  onRetry?: () => void;
  onResolve?: (source: BlockerResolutionSource) => Promise<void>;
}) {
  const abstained = status === "ABSTAINED";
  const healthy = status === "NO_ACTION_REQUIRED";
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [source, setSource] = useState<BlockerResolutionSource | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState("");

  async function resolve() {
    if (!source || !confirmed || !onResolve) return;
    setResolving(true);
    setResolutionError("");
    try {
      await onResolve(source);
    } catch (cause) {
      setResolutionError((cause as Error).message);
      setResolving(false);
    }
  }

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
        {abstained && onResolve && <Button onClick={() => setResolutionOpen(true)}>Resolve record conflict</Button>}
        {abstained && <Button as={Link} kind="tertiary" to="/assistant?prompt=What%20needs%20to%20be%20corrected%20in%20these%20conflicting%20records%3F">Ask agent for help</Button>}
        {onRetry && <Button renderIcon={Renew} onClick={onRetry}>Run the check again</Button>}
        <Button as={Link} kind="tertiary" to="/">Return to Today</Button>
        <Button kind="ghost" onClick={onStartClean}>Start clean run</Button>
      </div>
      <p className="journey-reassurance"><Locked size={16} aria-hidden /> No external action was taken.</p>

      {resolutionOpen && onResolve && (
        <Dialog
          title="Resolve the record conflict"
          primaryLabel={resolving ? "Checking corrected records…" : "Confirm and run check again"}
          primaryDisabled={!source || !confirmed || resolving}
          onPrimary={() => void resolve()}
          onClose={() => setResolutionOpen(false)}
        >
          <p>Select the source you verified. ShareStack will preserve this stopped run, create a corrected child run, and check the decision again.</p>
          <RadioButtonGroup
            className="resolution-options"
            legendText="Which source is authoritative?"
            name="authoritative-source"
            orientation="vertical"
            valueSelected={source}
            onChange={(value) => setSource(value as BlockerResolutionSource)}
          >
            <RadioButton
              id="source-inbound-ledger"
              value="INBOUND_LEDGER"
              labelText={<span><strong>Planned inbound ledger</strong><small>Aug 3 · 10,000 lb · Confirmed · Structured source</small></span>}
            />
            <RadioButton
              id="source-usda-notice"
              value="USDA_NOTICE"
              labelText={<span><strong>USDA shipment notice</strong><small>Aug 17 · 10,000 lb · Treat as probable</small></span>}
            />
            <RadioButton
              id="source-receiving-note"
              value="RECEIVING_NOTE"
              labelText={<span><strong>Receiving team note</strong><small>Aug 10 · 6,000 lb · Treat as probable</small></span>}
            />
          </RadioButtonGroup>
          <Checkbox
            id="confirm-authoritative-source"
            checked={confirmed}
            labelText="I verified this source and confirm these values should be used for this decision."
            onChange={(_, data) => setConfirmed(data.checked)}
          />
          {resolutionError && <p className="field__err" role="alert">{resolutionError}</p>}
        </Dialog>
      )}
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
