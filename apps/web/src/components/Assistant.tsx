/* Secondary decision guide. It can navigate and explain the current run, but
   it has no calculation, ranking, approval, or execution authority. */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, SendHorizontal, ICON_SM } from "./icons";
import { activeRun, createRun, getRun, type LiveRun } from "../lib/liveApi";
import { getOverlay, SCENARIOS, type ScenarioLetter } from "../lib/api";
import { lb, usd } from "../lib/format";

interface Message { role: "user" | "assistant"; text: string }
type AssistantAction =
  | { type: "switch"; letter: ScenarioLetter }
  | { type: "navigate"; to: string }
  | { type: "clean" };

const GREETING =
  "I explain this run from its pinned evidence, deterministic result, and recorded decision trace. I can navigate, but I cannot recalculate, approve, or execute an action.";

export default function Assistant({
  letter,
  runId,
  onClose,
}: {
  letter: ScenarioLetter;
  runId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: GREETING }]);
  const [currentRun, setCurrentRun] = useState<LiveRun | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    getRun(runId)
      .then((run) => { if (active) setCurrentRun(run); })
      .catch((error: Error) => {
        if (active) setMessages((items) => [...items, { role: "assistant", text: `I could not load this run: ${error.message}` }]);
      })
      .finally(() => { if (active) setBusy(false); });
    inputRef.current?.focus();
    return () => { active = false; };
  }, [runId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function perform(action: AssistantAction) {
    if (action.type === "switch") {
      const run = await activeRun(action.letter);
      navigate(`/runs/${run.run_id}`);
      return;
    }
    if (action.type === "clean") {
      const run = await createRun(letter, runId);
      navigate(`/runs/${run.run_id}`);
      return;
    }
    navigate(action.to);
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setMessages((items) => [...items, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const latest = await getRun(runId);
      setCurrentRun(latest);
      const { reply, action } = respond(latest, letter, question);
      setMessages((items) => [...items, { role: "assistant", text: reply }]);
      if (action) await perform(action);
    } catch (error) {
      setMessages((items) => [...items, {
        role: "assistant",
        text: `I could not answer from the current run: ${(error as Error).message}`,
      }]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = assistantSuggestions(currentRun, letter);
  const grounding = currentRun?.decision_brief
    ? `${currentRun.decision_brief.evidence.length} evidence records · ${currentRun.decision_brief.solver.solver_id}`
    : "Waiting for verified analysis";

  return (
    <aside className="assistant" role="complementary" aria-label="Decision guide">
      <header className="assistant__head">
        <div>
          <div className="assistant__eyebrow">Current-run assistant</div>
          <div className="assistant__title">Decision guide</div>
          <div className="assistant__sub">Grounded answers, zero decision authority</div>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close decision guide">
          <X size={ICON_SM} aria-hidden />
        </button>
      </header>

      <div className="assistant__grounding" aria-live="polite">
        <span className="assistant__status"><span className="assistant__status-dot" />{stateLabel(currentRun?.state)}</span>
        <span>{grounding}</span>
      </div>

      <div className="assistant__log" ref={listRef} aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`bubble bubble--${message.role}`}>{message.text}</div>
        ))}
        {busy && <div className="assistant__thinking">Reading the current run…</div>}
      </div>

      <div className="assistant__chips">
        {suggestions.map((suggestion) => (
          <button key={suggestion} className="chipbtn" disabled={busy} onClick={() => void send(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>

      <form className="assistant__input" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this decision…"
          aria-label="Ask about this decision"
          disabled={busy}
        />
        <button className="btn btn--primary btn--sm" type="submit" aria-label="Send" disabled={busy || !input.trim()}>
          <SendHorizontal size={ICON_SM} aria-hidden />
        </button>
      </form>
    </aside>
  );
}

export function assistantSuggestions(run: LiveRun | null, letter: ScenarioLetter): string[] {
  if (!run || run.state === "DRAFT") {
    return ["What can this scenario decide?", "Show available scenarios", "Open Audit"];
  }
  if (run.state === "ABSTAINED") {
    return ["Why was this withheld?", "What data is missing?", "Show the decision process"];
  }
  if (run.state === "APPROVED" || run.state === "REJECTED" || run.state === "DEFERRED") {
    return ["What happened next?", "Show the decision process", "What feedback is recorded?"];
  }
  return [
    "Why this action?",
    "What alternatives were considered?",
    "What evidence was used?",
    letter === "A" ? "Open Compare" : "Show the decision process",
  ];
}

export function respond(
  run: LiveRun,
  letter: ScenarioLetter,
  rawQuestion: string,
): { reply: string; action?: AssistantAction } {
  const text = rawQuestion.toLowerCase();
  const has = (...phrases: string[]) => phrases.some((phrase) => text.includes(phrase));

  if (has("list", "available scenario", "which scenario", "show available scenarios")) {
    return {
      reply: `Available synthetic use cases:\n${SCENARIOS.map((scenario) => `• ${scenario.label}`).join("\n")}\nAsk me to open one by letter or topic.`,
    };
  }
  if (has("compare", "comparison", "side by side", "baseline")) {
    return letter === "A"
      ? { reply: "Opening the verified Scenario A comparison.", action: { type: "navigate", to: `/runs/${run.run_id}/compare` } }
      : { reply: "A separate comparison view is not defined for this use case yet. Its considered alternatives are available in the recommendation and audit record." };
  }
  if (has("audit", "event log", "trail", "record of")) {
    return { reply: "Opening the append-only audit record for this run.", action: { type: "navigate", to: `/runs/${run.run_id}/audit` } };
  }
  if (has("clean run", "new run", "start over", "reset", "restart")) {
    return { reply: "Starting a clean child run. This run and its audit history remain unchanged.", action: { type: "clean" } };
  }
  if (has("back to decision", "decision workspace", "go back")) {
    return { reply: "Returning to the decision workspace.", action: { type: "navigate", to: `/runs/${run.run_id}` } };
  }

  const target = detectScenario(text);
  if (target && (has("switch", "show", "open", "go to", "load", "take me") || /scenario\s+[a-e]\b/.test(text))) {
    return target === letter
      ? { reply: `You are already viewing ${getOverlay(target).display_name}.` }
      : { reply: `Opening ${getOverlay(target).display_name}.`, action: { type: "switch", letter: target } };
  }

  const brief = run.decision_brief;
  if (!brief) {
    const useCase = getOverlay(letter).primary_risk_type.toLowerCase().replaceAll("_", " ");
    return {
      reply: `This run has not been analyzed yet. The use case evaluates ${useCase} from frozen source snapshots. Select “Analyze scenario” to produce a verified result and decision trace.`,
    };
  }

  if (has("process", "how did", "steps", "trace", "agents", "agent do")) {
    const trace = run.decision_trace;
    if (!trace) return { reply: "The run does not contain a decision trace yet." };
    return {
      reply: `Recorded decision process:\n${trace.stages.map((item) =>
        `• ${humanize(item.stage)} · ${item.status === "FALLBACK" ? "safe fallback" : humanize(item.status)} — ${item.summary}`
      ).join("\n")}\nThis is a stage-level audit record, not private chain-of-thought.`,
    };
  }

  if (brief.decision_status === "ABSTAINED") {
    const issues = brief.blocking_issues.slice(0, 4).map((issue) =>
      `• ${String(issue.message ?? issue.field ?? "Decision-critical fact is unresolved")}`
    );
    return {
      reply: `The system withheld the recommendation because it could not verify decision-critical facts.\n${issues.join("\n")}\nIt does not guess when those facts could change the decision.`,
    };
  }

  if (has("evidence", "source", "knowledge", "grounded", "data used")) {
    const evidence = brief.evidence.map((item) => `• ${item.title} · ${humanize(item.trust_level)}`);
    const sources = [...run.knowledge.current, ...run.knowledge.organizational]
      .map((item) => `• ${item.display_name} · pinned ${item.source_version}`);
    return {
      reply: `Evidence attached to the recommendation:\n${(evidence.length ? evidence : sources).join("\n")}`,
    };
  }

  const recommendation = brief.recommendation;
  if (!recommendation) return { reply: brief.status_message };

  if (has("alternative", "why not", "other option", "considered", "rejected")) {
    const explanations = new Map(brief.rationale?.why_not.map((item) => [item.evaluated_action_id, item.explanation]));
    const options = [...brief.alternatives, ...brief.rejected_options].slice(0, 5);
    return options.length ? {
      reply: `Other evaluated actions:\n${options.map((item) =>
        `• ${item.display_name} — ${explanations.get(item.evaluated_action_id) ?? (item.feasible ? "Feasible, but ranked below the selected action." : `Not feasible: ${item.failed_constraints.map(humanize).join(", ")}.`)}`
      ).join("\n")}`,
    } : { reply: "No other catalog action was eligible for this frozen use case." };
  }

  if (has("why", "recommend", "best", "this action")) {
    const rationale = brief.rationale;
    return {
      reply: rationale
        ? `${rationale.headline}\n${rationale.why_now} ${rationale.why_this_action}\nUncertainty: ${rationale.uncertainty}`
        : `${brief.status_message} ${recommendation.action.display_name} is the selected deterministic result.`,
    };
  }

  if (has("confidence", "sure", "certain")) {
    return {
      reply: `The recorded confidence label is ${humanize(recommendation.confidence_label)}. It describes the verified input and ranking conditions; it does not give the assistant authority to change the result.`,
    };
  }

  if (has("cost", "how much", "quantity", "price", "recommended action")) {
    const action = recommendation.action;
    return {
      reply: `${action.display_name}: ${lb(action.requested_quantity_lb)} at a simulated cost of ${usd(action.cost_usd)}. The action is feasible, remains simulation-only, and requires human approval.`,
    };
  }

  if (has("what happened", "what next", "action recorded", "execution", "completed")) {
    if (run.execution_receipt) {
      return {
        reply: `The approved plan produced a ${humanize(run.execution_receipt.execution_type)} receipt with status ${humanize(run.execution_receipt.status)}. No external write occurred. Record the action outcome below the result to close the feedback loop.`,
      };
    }
    if (run.state === "REJECTED") return { reply: "The manager rejected the recommendation. No action intent or execution receipt was created." };
    if (run.state === "DEFERRED") return { reply: "The decision was deferred. The risk remains open and no action was simulated." };
    return { reply: "Review the evidence and alternatives, then approve, reject, or defer. Only the manager can commit that choice." };
  }

  if (has("feedback", "learn", "improve")) {
    const recommendationFeedback = run.feedback ? "Recommendation feedback is recorded." : "Recommendation feedback has not been recorded yet.";
    const outcomeFeedback = run.outcome_feedback ? "Action outcome feedback is recorded." : "Action outcome feedback has not been recorded yet.";
    return { reply: `${recommendationFeedback} ${outcomeFeedback} Feedback is attached to this run for later reviewed improvement; it never silently changes the solver.` };
  }

  if (has("risk", "problem", "what is happening", "summary")) {
    return { reply: `${brief.status_message} ${brief.rationale?.why_now ?? "The primary risk is recorded in the verified decision brief."}` };
  }

  return {
    reply: "I can explain the recommendation, alternatives, evidence, decision process, action receipt, or feedback state. I only quote the current run; I do not calculate a new answer.",
  };
}

function detectScenario(text: string): ScenarioLetter | null {
  const match = text.match(/scenario\s+([a-e])\b/);
  if (match) return match[1].toUpperCase() as ScenarioLetter;
  if (/\b(usda|protein|shipment delay)\b/.test(text)) return "A";
  if (/\b(produce|short[- ]life|perishable)\b/.test(text)) return "B";
  if (/\b(donation|mismatch|snack)\b/.test(text)) return "C";
  if (/\b(budget|trade[- ]?off|dairy)\b/.test(text)) return "D";
  if (/\b(missing|conflicting|abstain|garbled|bad data)\b/.test(text)) return "E";
  return null;
}

function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stateLabel(state?: LiveRun["state"]): string {
  return state ? humanize(state) : "Loading run";
}
