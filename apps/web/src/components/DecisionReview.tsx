import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Tag,
  TextArea,
} from "@carbon/react";
import {
  Chat,
  CheckmarkFilled,
  ChevronDown,
  Edit,
  Locked,
  StarFilled,
  ThumbsDown,
  WarningAlt,
} from "@carbon/icons-react";
import { getActionMap, type ActionRecord, type ScenarioLetter } from "../lib/api";
import { previewAction, type DecisionBrief, type LiveRun } from "../lib/liveApi";
import type { Decision, RunState } from "../lib/runState";
import { dateShort, lb, titleCase, usd } from "../lib/format";
import DecisionVisual from "./DecisionVisual";
import Dialog from "./Dialog";
import ConnectedSources from "./ConnectedSources";

type DialogKind = null | "approve" | "reject" | "defer" | "edit";

interface Props {
  runId: string;
  letter: ScenarioLetter;
  state: RunState;
  setState: (state: RunState) => void;
  brief: DecisionBrief;
  knowledge?: LiveRun["knowledge"];
  onDecision: (decision: Decision) => Promise<void>;
}

export default function DecisionReview({ runId, state, setState, brief, knowledge, onDecision }: Props) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [showOptions, setShowOptions] = useState(false);
  const presentation = brief.presentation;
  const recommended = brief.recommendation;
  if (!recommended || !presentation.recommendation) return null;

  const allActions = [recommended.action, ...brief.alternatives];
  const selected = allActions.find((action) => action.action_id === state.selection?.actionId) ?? recommended.action;
  const nonDefault = selected.action_id !== recommended.action.action_id || Boolean(state.selection?.edited);
  const reason = state.selection?.reason ?? "";
  const approvalReady = !nonDefault || reason.trim().length > 0;
  const selectedCost = state.selection?.previewCostUsd ?? selected.cost_usd;
  const catalog = getActionMap(brief.scenario_id)[selected.action_id];
  const arrival = catalog?.arrival_week_start || "";
  const timing = selected.action_id === recommended.action.action_id
    ? presentation.recommendation.timing_label
    : arrival ? dateShort(arrival) : null;
  const selectedTitle = selected.action_id === recommended.action.action_id
    ? presentation.recommendation.title
    : plainActionTitle(selected);
  const selectedEffect = selected.action_id === recommended.action.action_id
    ? presentation.recommendation.effect
    : "This response will be rechecked against the same verified constraints before approval.";
  const assistantHref = `/assistant?prompt=${encodeURIComponent(
    `I’m reviewing “${selectedTitle}”. What should I verify before I approve, change, or reject this recommendation?`,
  )}`;

  function chooseAction(actionId: string) {
    const action = allActions.find((item) => item.action_id === actionId);
    if (!action) return;
    setState({
      ...state,
      selection: {
        actionId,
        quantityLb: action.requested_quantity_lb,
        reason: "",
        edited: false,
      },
    });
  }

  function setReason(value: string) {
    setState({
      ...state,
      selection: {
        actionId: selected.action_id,
        quantityLb: state.selection?.quantityLb ?? selected.requested_quantity_lb,
        reason: value,
        edited: state.selection?.edited ?? false,
        previewCostUsd: state.selection?.previewCostUsd,
      },
    });
  }

  async function approve() {
    await onDecision({
      kind: nonDefault ? "edit-approve" : "approve",
      actionId: selected.action_id,
      quantityLb: state.selection?.quantityLb ?? selected.requested_quantity_lb,
      reason: nonDefault ? reason.trim() : undefined,
    });
  }

  return (
    <div className="journey-shell">
      <header className="journey-intro journey-intro--compact">
        <Tag type="red" size="sm">{presentation.issue.label}</Tag>
        <h1>{presentation.issue.title}</h1>
        <p>{presentation.issue.summary}</p>
      </header>

      <ol className="task-list">
        <li className="task-step task-step--complete task-step--issue-summary">
          <div className="task-step__marker"><CheckmarkFilled size={20} aria-hidden /><span className="visually-hidden">Complete</span></div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 1</span><h2>Understand the issue</h2></div><Tag type="green">Complete</Tag></div>
            <DecisionVisual presentation={presentation} compact />
          </div>
        </li>

        <li className="task-step task-step--active task-step--review">
          <div className="task-step__marker" aria-hidden>2</div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 2</span><h2>Choose a response</h2></div><Tag type="blue">Current</Tag></div>

            <section className="recommended-choice" aria-labelledby="recommended-title">
              <div className="recommended-choice__label agent-recommendation-label">
                <StarFilled size={20} aria-hidden />
                <span><strong>Agent recommendation</strong><small>Prepared by the ShareStack Decision Agent</small></span>
                <Tag type={brief.agent.effective_mode === "live" ? "blue" : "cool-gray"} size="sm">{agentStatusLabel(brief.agent)}</Tag>
              </div>
              <h3 id="recommended-title">{selectedTitle}</h3>
              {nonDefault && <Tag type="purple" size="sm">Manager-selected response</Tag>}
              <dl className="choice-facts">
                <div><dt>Quantity</dt><dd>{lb(state.selection?.quantityLb ?? selected.requested_quantity_lb)}</dd></div>
                <div><dt>Estimated cost</dt><dd>{usd(selectedCost)}</dd></div>
                {timing && <div><dt>Timing</dt><dd>{timing}</dd></div>}
              </dl>
              <p className="choice-effect"><CheckmarkFilled size={20} aria-hidden /> {selectedEffect}</p>
              {presentation.recommendation.caution && selected.action_id === recommended.action.action_id && (
                <p className="choice-caution"><WarningAlt size={18} aria-hidden /> {presentation.recommendation.caution}</p>
              )}

              <div className="agent-verification" aria-label="Recommendation verification">
                <span><CheckmarkFilled size={16} aria-hidden />{brief.evidence.length} verified records checked</span>
                <span><CheckmarkFilled size={16} aria-hidden />{brief.alternatives.length + brief.rejected_options.length + 1} responses compared</span>
                <span><CheckmarkFilled size={16} aria-hidden />Operational limits checked</span>
                <span><Locked size={16} aria-hidden />Your approval required</span>
              </div>

              {nonDefault && (
                <TextArea
                  id="manager-reason"
                  labelText={state.selection?.edited ? "Reason for changing the quantity" : "Reason for choosing another response"}
                  helperText="Required before approval · 500 characters maximum"
                  maxCount={500}
                  enableCounter
                  value={reason}
                  invalid={!reason.trim()}
                  invalidText="Add a short reason before approval."
                  onChange={(event) => setReason(event.target.value)}
                />
              )}

              <div className="choice-actions">
                <Button disabled={!approvalReady} onClick={() => setDialog("approve")}>Review and approve</Button>
                <Button kind="danger--tertiary" renderIcon={ThumbsDown} onClick={() => setDialog("reject")}>Reject and record feedback</Button>
              </div>

              <div className="choice-support-actions" aria-label="Other ways to respond">
                <Button kind="ghost" size="sm" renderIcon={ChevronDown} onClick={() => setShowOptions((value) => !value)} aria-expanded={showOptions}>
                  {showOptions ? "Hide other options" : "Show other options"}
                </Button>
                {brief.approval.editable && selected.action_id === recommended.action.action_id && (
                  <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => setDialog("edit")}>Change quantity</Button>
                )}
                <Button as={Link} to={assistantHref} kind="ghost" size="sm" renderIcon={Chat}>Ask the agent</Button>
                <Button kind="ghost" size="sm" onClick={() => setDialog("defer")}>Decide later</Button>
              </div>

              {showOptions && (
                <div className="other-options" aria-label="Other responses">
                  {brief.alternatives.map((alternative) => (
                    <article key={alternative.evaluated_action_id} className={alternative.action_id === selected.action_id ? "is-selected" : undefined}>
                      <div><strong>{plainActionTitle(alternative)}</strong><span>{lb(alternative.requested_quantity_lb)} · {usd(alternative.cost_usd)}</span></div>
                      <Button kind={alternative.action_id === selected.action_id ? "tertiary" : "secondary"} size="sm" onClick={() => chooseAction(alternative.action_id)}>
                        {alternative.action_id === selected.action_id ? "Selected" : "Choose"}
                      </Button>
                    </article>
                  ))}
                  {brief.alternatives.length === 0 && <p>No other response passed the current safety checks.</p>}
                  {nonDefault && <Button kind="ghost" size="sm" onClick={() => setState({ phase: "READY_FOR_REVIEW" })}>Use the recommended response</Button>}
                </div>
              )}
            </section>

            <details className="plain-disclosure">
              <summary>Why did the agent suggest this?</summary>
              <div className="disclosure-content">
                {nonDefault && <p><strong>This reasoning supports the original agent recommendation.</strong></p>}
                <p>{brief.rationale?.why_now}</p>
                <p>{brief.rationale?.why_this_action}</p>
                <small>{brief.rationale?.uncertainty}</small>
              </div>
            </details>

            {knowledge && (
              <ConnectedSources
                sources={[...knowledge.current, ...knowledge.organizational]}
                recordCount={brief.evidence.length}
                label="What information was checked?"
              />
            )}

            <details className="plain-disclosure">
              <summary>Decision details</summary>
              <div className="disclosure-content technical-details">
                <dl>
                  <div><dt>Recommendation confidence</dt><dd>{titleCase(recommended.confidence_label)}</dd></div>
                  <div><dt>Prepared by</dt><dd>{agentStatusLabel(brief.agent)}</dd></div>
                  <div><dt>Safety review</dt><dd>The response fits the current inventory, capacity, budget, timing, and approval rules.</dd></div>
                  <div><dt>Human control</dt><dd>Nothing proceeds unless a manager approves it.</dd></div>
                </dl>
                {brief.rejected_options.length > 0 && (
                  <div><strong>Responses that did not pass</strong><ul>{brief.rejected_options.map((option) => <li key={option.evaluated_action_id}>{option.display_name}: {option.failed_constraints.map(humanize).join(", ")}</li>)}</ul></div>
                )}
                <div><strong>Supporting records</strong><ul>{brief.evidence.map((item) => <li key={item.evidence_id}>{item.title}</li>)}</ul></div>
                <Button as={Link} kind="tertiary" size="sm" to={`/runs/${runId}/audit`}>See how this decision was prepared</Button>
              </div>
            </details>
          </div>
        </li>

        <li className="task-step task-step--pending" aria-disabled="true">
          <div className="task-step__marker" aria-hidden>3</div>
          <div className="task-step__body"><div className="task-step__title"><div><span>Step 3</span><h2>Confirm</h2></div><Tag type="cool-gray">Pending</Tag></div><p>You will review the details before anything is recorded.</p></div>
        </li>
      </ol>

      <p className="journey-reassurance"><Locked size={16} aria-hidden /> Simulation only — no real order will be placed.</p>

      {dialog === "approve" && (
        <Dialog title="Approve this action?" primaryLabel="Approve action" onClose={() => setDialog(null)} onPrimary={() => { setDialog(null); void approve(); }}>
          <p>This records the approved response in ShareStack. It will not place an order, reserve food, contact a donor, or notify another organization.</p>
          <dl className="confirmation-facts">
            <div><dt>Action</dt><dd>{selectedTitle}</dd></div>
            <div><dt>Quantity</dt><dd>{lb(state.selection?.quantityLb ?? selected.requested_quantity_lb)}</dd></div>
            <div><dt>Estimated cost</dt><dd>{usd(selectedCost)}</dd></div>
            {timing && <div><dt>Timing</dt><dd>{timing}</dd></div>}
            {nonDefault && <div><dt>Manager reason</dt><dd>{reason}</dd></div>}
          </dl>
        </Dialog>
      )}
      {dialog === "reject" && <ReasonDialog mode="reject" onClose={() => setDialog(null)} onConfirm={(value) => { setDialog(null); void onDecision({ kind: "reject", actionId: selected.action_id, quantityLb: selected.requested_quantity_lb, reason: value }); }} />}
      {dialog === "defer" && <ReasonDialog mode="defer" onClose={() => setDialog(null)} onConfirm={(value) => { setDialog(null); void onDecision({ kind: "defer", actionId: selected.action_id, quantityLb: selected.requested_quantity_lb, reason: value }); }} />}
      {dialog === "edit" && catalog && (
        <EditDialog runId={runId} action={catalog} initialQuantity={selected.requested_quantity_lb} onClose={() => setDialog(null)} onApply={(quantity, value, previewCostUsd) => {
          setDialog(null);
          setState({ ...state, selection: { actionId: selected.action_id, quantityLb: quantity, reason: value, edited: true, previewCostUsd } });
        }} />
      )}
    </div>
  );
}

function plainActionTitle(action: DecisionBrief["alternatives"][number]): string {
  const category = titleCase((action.category_id ?? "operations").replaceAll("_", " ").toLowerCase());
  const amount = lb(action.requested_quantity_lb);
  return ({
    PURCHASE: `Purchase ${amount} of ${category.toLowerCase()}`,
    REQUEST_TRANSFER: `Request a transfer of ${amount} of ${category.toLowerCase()}`,
    TARGETED_DONOR_REQUEST: `Request ${amount} of ${category.toLowerCase()} from donors`,
    PARTIAL_ACCEPT: `Accept ${amount} of the ${category.toLowerCase()} offer`,
    ACCEPT_DONATION: `Accept the ${category.toLowerCase()} offer`,
    REDIRECT_DONATION: `Redirect the ${category.toLowerCase()} offer to a partner food bank`,
    DECLINE_DONATION: `Decline the ${category.toLowerCase()} offer`,
    MONITOR: `Continue monitoring ${category.toLowerCase()}`,
  } as Record<string, string>)[action.action_type] ?? action.display_name;
}

function agentStatusLabel(agent: DecisionBrief["agent"]): string {
  if (agent.effective_mode === "live" && agent.status === "live_verified") return "Live agent · verified";
  if (agent.effective_mode === "offline_fallback") return "Verified fallback";
  return "Verified local agent";
}

function ReasonDialog({ mode, onClose, onConfirm }: { mode: "reject" | "defer"; onClose: () => void; onConfirm: (value: string) => void }) {
  const [value, setValue] = useState("");
  const reject = mode === "reject";
  const valid = !reject || value.trim().length > 0;
  return (
    <Dialog title={reject ? "Reject this recommendation?" : "Decide later?"} primaryLabel={reject ? "Reject and record feedback" : "Decide later"} primaryTone={reject ? "danger" : "action"} primaryDisabled={!valid} onClose={onClose} onPrimary={() => onConfirm(value.trim())}>
      <p>{reject
        ? "The recommendation will not be applied. Your reason will be recorded as feedback and the operational risk will remain open."
        : "No action will be applied. The risk stays open so you or another manager can return to it later."}</p>
      <TextArea
        id={`${mode}-reason`}
        labelText={reject ? "What makes this recommendation unsuitable?" : "What are you waiting for? (optional)"}
        helperText={reject ? "For example: cost, timing, quantity, missing context, or an operational constraint." : "For example: updated records, another approver, or confirmation from a partner."}
        maxCount={500}
        enableCounter
        value={value}
        invalid={!valid}
        invalidText="Enter a reason so the feedback can be recorded."
        onChange={(event) => setValue(event.target.value)}
      />
    </Dialog>
  );
}

function EditDialog({ runId, action, initialQuantity, onClose, onApply }: { runId: string; action: ActionRecord; initialQuantity: number; onClose: () => void; onApply: (quantity: number, reason: string, previewCostUsd?: string) => void }) {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [reason, setReason] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const parsed = Number(quantity);
  const rangeValid = Number.isInteger(parsed) && parsed >= action.minimum_quantity_lb && parsed <= action.maximum_quantity_lb && (parsed - action.minimum_quantity_lb) % action.quantity_increment_lb === 0;
  const valid = rangeValid && reason.trim().length > 0;
  const range = useMemo(() => `${lb(action.minimum_quantity_lb)}–${lb(action.maximum_quantity_lb)} in ${lb(action.quantity_increment_lb)} steps`, [action]);

  async function recheck() {
    if (!valid) return;
    setChecking(true);
    setError("");
    try {
      const preview = await previewAction(runId, action.action_id, parsed);
      if (!preview.feasible) {
        const codes = preview.evaluation.failed_codes ?? preview.evaluation.failed_constraints ?? [];
        setError(codes.includes("OFFLINE_FROZEN_QUANTITY_ONLY")
          ? "While offline, ShareStack can use only amounts that were already checked. Reconnect to check a custom amount."
          : `This amount does not pass the current safety checks: ${codes.map(humanize).join(", ") || "review the amount"}.`);
        return;
      }
      onApply(parsed, reason.trim(), preview.evaluation.cost_usd);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Dialog title="Change quantity" primaryLabel={checking ? "Checking…" : "Recheck plan"} primaryDisabled={!valid || checking} onClose={onClose} onPrimary={() => void recheck()}>
      <p>Only the quantity can change. ShareStack will recheck budget, storage, timing, and authorization before approval.</p>
      <label className="field"><span>Quantity (lb)</span><input type="number" value={quantity} min={action.minimum_quantity_lb} max={action.maximum_quantity_lb} step={action.quantity_increment_lb} onChange={(event) => setQuantity(event.target.value)} /><small>{range}</small>{!rangeValid && <span className="field__err">Enter an allowed whole-pound quantity.</span>}</label>
      <TextArea id="edit-reason" labelText="Reason for changing the quantity" maxCount={500} enableCounter value={reason} invalid={!reason.trim()} invalidText="Add a reason before rechecking." onChange={(event) => setReason(event.target.value)} />
      {error && <p className="field__err" role="alert">{error}</p>}
    </Dialog>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}
