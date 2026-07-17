/* Assistant — a SECONDARY, grounded helper (not a primary chatbot; 02 §7 forbids
   chat-as-primary and the LLM has zero numeric authority). It drives scenario
   management by natural language (switch/list scenarios, start a clean run, open
   Compare/Audit) and answers questions about the CURRENT run using only verified
   golden values — it never computes or invents a number. */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, SendHorizontal, ICON_SM } from "./icons";
import { activeRun, createRun } from "../lib/liveApi";
import { getGolden, getActionMap, getOverlay, SCENARIOS, type ScenarioLetter } from "../lib/api";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, usd, weeks, date } from "../lib/format";

interface Msg { role: "user" | "assistant"; text: string }
type Action = { type: "switch"; letter: ScenarioLetter } | { type: "nav"; to: string } | { type: "clean" };

const GREETING =
  "I can switch scenarios, open Compare or Audit, start a clean run, or explain the current recommendation. Every number I quote comes from the verified analysis — I never compute or change one.";

const SUGGESTIONS = [
  "Why this action?",
  "Why not the peer transfer?",
  "What does conservative mean?",
  "Show the missing-data scenario",
  "Open Compare",
];

export default function Assistant({ letter, runId, onClose }: { letter: ScenarioLetter; runId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs]);

  async function run(action: Action) {
    if (action.type === "switch") {
      const run = await activeRun(action.letter);
      navigate(`/runs/${run.run_id}`);
    } else if (action.type === "clean") {
      const run = await createRun(letter, runId);
      navigate(`/runs/${run.run_id}`);
    } else {
      navigate(action.to);
    }
  }

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const { reply, action } = respond(letter, runId, q);
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "assistant", text: reply }]);
    setInput("");
    if (action) void run(action);
  }

  return (
    <aside className="assistant" role="complementary" aria-label="Assistant">
      <header className="assistant__head">
        <div>
          <div className="assistant__title">Assistant</div>
          <div className="assistant__sub">Grounded in verified analysis</div>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close assistant"><X size={ICON_SM} aria-hidden /></button>
      </header>

      <div className="assistant__log" ref={listRef} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`bubble bubble--${m.role}`}>{m.text}</div>
        ))}
      </div>

      <div className="assistant__chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chipbtn" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      <form className="assistant__input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this analysis, or switch scenarios…"
          aria-label="Message the assistant"
        />
        <button className="btn btn--primary btn--sm" type="submit" aria-label="Send"><SendHorizontal size={ICON_SM} aria-hidden /></button>
      </form>
    </aside>
  );
}

/* ---- deterministic, grounded intent engine (no LLM, no invented numbers) ---- */
function respond(letter: ScenarioLetter, _runId: string, raw: string): { reply: string; action?: Action } {
  const t = raw.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));

  // 1. list scenarios
  if (has("list", "which scenario", "what scenario", "available scenario", "scenarios are")) {
    const lines = SCENARIOS.map((s) => `• ${s.label}`).join("\n");
    return { reply: `Five synthetic scenarios:\n${lines}\nSay “switch to the budget one” or “show missing-data scenario”.` };
  }

  // 2. navigation
  if (has("compare", "comparison", "side by side", "baseline")) {
    return { reply: "Opening Compare — no-intervention vs. simple reorder vs. the agent’s action.", action: { type: "nav", to: `/runs/${_runId}/compare` } };
  }
  if (has("audit", "history", "event log", "trail", "record of")) {
    return { reply: "Opening the append-only Audit record for this run.", action: { type: "nav", to: `/runs/${_runId}/audit` } };
  }
  if (has("clean run", "new run", "start over", "reset", "restart")) {
    return { reply: "Starting a clean run from the original synthetic fixture. Your current run stays in the audit history.", action: { type: "clean" } };
  }
  if (has("back to decision", "decision workspace", "go back")) {
    return { reply: "Back to the decision workspace.", action: { type: "nav", to: `/runs/${_runId}` } };
  }

  // 3. scenario switch
  const target = detectScenario(t);
  if (target && (has("switch", "show", "open", "go to", "load", "take me") || /scenario\s+[a-e]\b/.test(t))) {
    if (target === letter) return { reply: `You’re already on ${scenarioName(target)}.` };
    return { reply: `Opening ${scenarioName(target)}…`, action: { type: "switch", letter: target } };
  }

  // 4. grounded explanations about the current run
  const g = getGolden(letter);
  const risk = g.risks?.find((r) => r.is_primary) ?? g.risks?.[0];
  const rec = g.recommended_action;
  const actions = getActionMap(g.scenario_id);
  const cat = risk ? CATEGORY_LABEL[risk.category_id] : "the category";

  if (g.decision_status === "ABSTAINED") {
    if (has("why", "abstain", "no recommendation", "withheld", "missing", "conflict")) {
      const n = (g.blocking_issues as unknown[])?.length ?? 0;
      return { reply: `The agent withheld a recommendation: ${n} decision-critical field(s) are missing or conflicting (e.g. the shipment’s arrival week and status). It asks for the missing facts instead of guessing — and it treats notice text as data, never as instructions.` };
    }
  }

  if (risk && rec) {
    if (has("why not", "transfer", "peer")) {
      const ev = g.action_evaluations.find((e) => e.action_id.includes("TRANSFER"));
      const red = ev?.gap_reduction_lb;
      return { reply: `The peer transfer is feasible but only closes ${red ? lb(red) : "part"} of the ${lb(risk.gap_to_target_lb)} gap — under half — so it ranks below the purchase.` };
    }
    if (has("why not") && has("donor")) {
      const ev = g.action_evaluations.find((e) => e.action_id.includes("DONOR"));
      return { reply: `The donor ask is free but uncertain: expected usable quantity ~${ev?.expected_usable_quantity_lb ? lb(ev.expected_usable_quantity_lb) : "partial"}, covering only part of the ${lb(risk.gap_to_target_lb)} gap.` };
    }
    if (has("why not") && has("wait", "monitor", "nothing", "do nothing")) {
      return { reply: `Waiting isn’t safe: ${cat.toLowerCase()} already breaches the ${weeks(risk.minimum_weeks_of_supply)} minimum, so “monitor” is ruled out (MONITOR_NOT_SAFE).` };
    }
    if (has("why", "recommend", "this action", "purchase", "best")) {
      return { reply: `${actions[rec.action_id]?.display_name ?? rec.action_id}: ${usd(rec.cost_usd)}, arrives ${date(rec.arrival_week_start)} — before the shortage — and closes the full ${lb(rec.gap_reduction_lb)} gap, restoring ${weeks(risk.target_weeks_of_supply)} of supply. It’s the highest-ranked feasible option, and a human approves it.` };
    }
    if (has("conservative")) {
      return { reply: `The conservative view counts only CONFIRMED deliveries — it’s the decision default, so a “probable” shipment can’t hide a shortage. The expected view (dashed) adds probability-weighted supply for comparison.` };
    }
    if (has("gap", "how short", "shortfall")) {
      return { reply: `${cat} is ${lb(risk.gap_to_target_lb)} short of the ${weeks(risk.target_weeks_of_supply)} target at the breach week (coverage ${weeks(risk.conservative_end_wos_at_breach)} vs. a ${weeks(risk.minimum_weeks_of_supply)} minimum).` };
    }
    if (has("cost", "how much", "budget", "price")) {
      const unit = actions[rec.action_id]?.unit_price_usd_per_lb;
      const per = unit ? ` ($${unit.toFixed(2)}/lb)` : "";
      return { reply: `The recommended purchase is ${usd(rec.cost_usd)} for ${lb(rec.requested_quantity_lb)}${per}. It fits the budget and freezer capacity.` };
    }
    if (has("confidence", "sure", "certain")) {
      return { reply: `Confidence is ${rec.confidence.toLowerCase()} — driven by action reliability, data quality, forecast stability, and the margin over the next option. It’s a label on verified inputs, not a guess.` };
    }
    if (has("what if", "slip", "further", "worse", "delayed more")) {
      return { reply: `This run models a two-week slip. A deeper slip would widen the Week-2 breach — feed the updated notice and re-run analysis; the engine recomputes the projection and gap. I won’t estimate new numbers myself.` };
    }
    if (has("risk", "why", "at risk", "shortage", "breach")) {
      return { reply: `${cat} runs short the week of ${date(risk.first_breach_week_start)}: counting only confirmed deliveries, coverage falls to ${weeks(risk.conservative_end_wos_at_breach)} — under the ${weeks(risk.minimum_weeks_of_supply)} minimum — leaving it ${lb(risk.gap_to_target_lb)} short of target.` };
    }
  }

  // 5. fallback
  return { reply: `I can: switch scenarios, open Compare/Audit, start a clean run, or explain this recommendation (try “why not the transfer?” or “what does conservative mean?”). I only surface verified engine values — I don’t compute numbers.` };
}

function detectScenario(t: string): ScenarioLetter | null {
  const m = t.match(/scenario\s+([a-e])\b/);
  if (m) return m[1].toUpperCase() as ScenarioLetter;
  if (/\b(usda|protein|shipment delay)\b/.test(t)) return "A";
  if (/\b(produce|short[- ]life|perishable)\b/.test(t)) return "B";
  if (/\b(donation|mismatch|snack)\b/.test(t)) return "C";
  if (/\b(budget|trade[- ]?off|dairy)\b/.test(t)) return "D";
  if (/\b(missing|conflicting|abstain|abstention|garbled|bad data)\b/.test(t)) return "E";
  return null;
}
function scenarioName(letter: ScenarioLetter): string {
  return getOverlay(letter).display_name;
}
