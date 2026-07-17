import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InlineLoading } from "@carbon/react";
import { ArrowRight, ArrowUp, Chat, CheckmarkFilled, Locked, Time } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import ConnectedSources from "../components/ConnectedSources";
import { getRecentRuns, getWorkItems, recentRunForCase, startWorkItem, type RecentRun, type WorkItem } from "../lib/liveApi";

const EXAMPLE_PROMPTS = [
  "What needs my attention first?",
  "Are any deliveries at risk?",
  "Show inventory concerns",
  "What are the expected shipments?",
];

export default function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getWorkItems()
      .then((workItems) => setItems([...workItems].sort((a, b) => queueScore(a) - queueScore(b))))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
    const preload = () => { void import("./DecisionWorkspace"); void import("./OperationsAssistant"); };
    const idle = window.requestIdleCallback?.(preload) ?? window.setTimeout(preload, 300);
    return () => window.cancelIdleCallback?.(idle) ?? window.clearTimeout(idle);
  }, []);

  const recent = getRecentRuns();
  const queue = useMemo(() => [...items].sort((a, b) => queueScore(a, recent) - queueScore(b, recent)), [items, recent]);
  const active = queue[0];
  const activeRun = active ? runFor(active, recent) : undefined;
  const activeCopy = active ? situationCopy(active, activeRun) : undefined;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, []);

  function ask(value: string) {
    const clean = value.trim();
    if (!clean) return;
    navigate(`/assistant?prompt=${encodeURIComponent(clean)}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(prompt);
  }

  function askAbout(item: WorkItem, question?: string) {
    const selectedQuestion = question ?? situationQuestions(item, runFor(item, recent))[0];
    ask(`${selectedQuestion} ${situationCopy(item, runFor(item, recent)).title}`);
  }

  async function openCurrent(item: WorkItem) {
    const existing = recentRunForCase(item.case_key);
    if (existing) {
      navigate(`/runs/${existing.run_id}`);
      return;
    }
    setOpening(item.work_item_id);
    setError("");
    try {
      const run = await startWorkItem(item);
      navigate(`/runs/${run.run_id}`, { state: { autoAnalyze: true } });
    } catch (reason) {
      setError((reason as Error).message);
      setOpening("");
    }
  }

  return (
    <ProductShell active="home">
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <p className="home-greeting">{greeting}, Jordan.</p>
          <h1 id="home-title">What do you need to handle today?</h1>
          <form className="home-composer" onSubmit={submit}>
            <label htmlFor="operations-prompt" className="visually-hidden">Describe an issue or ask about operations</label>
            <textarea
              id="operations-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(prompt);
                }
              }}
              placeholder="Describe an issue or ask about operations"
              rows={2}
            />
            <button type="submit" aria-label="Ask ShareStack" disabled={!prompt.trim()}><ArrowUp size={21} /></button>
          </form>
          <div className="home-prompts" aria-label="Example questions">
            <span>Examples:</span>
            {EXAMPLE_PROMPTS.map((item) => <button key={item} type="button" onClick={() => ask(item)}>{item}</button>)}
          </div>
          {active && (
            <section className="home-readiness" aria-label="ShareStack decision support status">
              <div className="home-readiness__heading">
                <span className="home-readiness__signal" aria-hidden />
                <div><strong>Ready to help with today’s decisions</strong><small>Connected information, agent review, and safety checks are available.</small></div>
              </div>
              <div className="home-readiness__proof">
                <span><CheckmarkFilled size={16} aria-hidden />Operational information connected</span>
                <span><CheckmarkFilled size={16} aria-hidden />Decision agent ready to explain</span>
                <span><Locked size={16} aria-hidden />You approve every response</span>
              </div>
              <ConnectedSources sources={active.connected_sources ?? []} label="See connected information" />
            </section>
          )}
        </section>

        <section className="agent-briefing" aria-labelledby="briefing-label">
          <div className="briefing-rule"><span id="briefing-label">Today’s decision queue</span></div>
          {loading && <div className="briefing-loading"><InlineLoading description="Checking verified operations data…" /></div>}
          {error && <div className="service-error" role="alert">{error}</div>}
          {active && (
            <article className="briefing-card">
              <div className="briefing-card__intro">
                <span className={`briefing-indicator briefing-indicator--${statusTone(active, recent)}`} aria-hidden />
                <div>
                  <p>{briefingHeading(active, activeRun)}</p>
                  <small>{queue.length} verified situations in today’s queue · {statusLabel(active, recent)}</small>
                </div>
              </div>
              <div className="briefing-card__body">
                <div>
                  <p className="briefing-kicker">{activeCopy?.label}</p>
                  <h2>{activeCopy?.title}</h2>
                  <p>{activeCopy?.summary}</p>
                  <div className="briefing-meta">
                    {active.due_label && <span><Time size={16} aria-hidden />{active.due_label}</span>}
                    <span><CheckmarkFilled size={16} aria-hidden />{active.source_count} verified case records</span>
                  </div>
                </div>
                <button type="button" className="briefing-primary" onClick={() => void openCurrent(active)} disabled={opening === active.work_item_id}>
                  {opening === active.work_item_id ? "Opening…" : actionLabel(active, recent)}<ArrowRight size={19} aria-hidden />
                </button>
              </div>
              <div className="briefing-questions">
                {situationQuestions(active, activeRun).map((question) => (
                  <button key={question} type="button" onClick={() => askAbout(active, question)}>{question}<ArrowRight size={16} /></button>
                ))}
              </div>
            </article>
          )}
          {queue.length > 1 && <div className="scenario-queue" aria-label="All verified situations">
            <div className="scenario-queue__heading"><h2>All situations</h2><span>Ask about any item or open its decision</span></div>
            {queue.slice(1).map((item) => {
              const copy = situationCopy(item, runFor(item, recent));
              return <article className="scenario-row" key={item.work_item_id}>
                <span className={`briefing-indicator briefing-indicator--${statusTone(item, recent)}`} aria-hidden />
                <div className="scenario-row__copy">
                  <span>{copy.label} · {statusLabel(item, recent)}</span>
                  <h3>{copy.title}</h3>
                  <small>{item.due_label ?? `${item.source_count} verified case records`}</small>
                </div>
                <div className="scenario-row__actions">
                  <button type="button" onClick={() => askAbout(item)}><Chat size={17} aria-hidden />Ask</button>
                  <button type="button" className="scenario-row__open" onClick={() => void openCurrent(item)} disabled={opening === item.work_item_id}>
                    {opening === item.work_item_id ? "Opening…" : actionLabel(item, recent)}<ArrowRight size={17} aria-hidden />
                  </button>
                </div>
              </article>;
            })}
          </div>}
        </section>
      </main>
    </ProductShell>
  );
}

function runFor(item: WorkItem, recent: RecentRun[]) {
  return recent.find((run) => run.scenario_key === item.case_key);
}

function statusLabel(item: WorkItem, recent: RecentRun[]) {
  const state = runFor(item, recent)?.state;
  return ({ APPROVED: "Completed", REJECTED: "Rejected", DEFERRED: "Deferred", ABSTAINED: "Records conflict", READY_FOR_REVIEW: "Ready for review", NO_ACTION_REQUIRED: "No action needed", FAILED: "Review failed", STALE: "Needs refresh" } as Record<string, string>)[state ?? ""]
    ?? (item.state === "INFORMATION_NEEDED" ? "Records conflict" : "Not reviewed");
}

function statusTone(item: WorkItem, recent: RecentRun[]) {
  const state = runFor(item, recent)?.state;
  if (state === "APPROVED" || state === "NO_ACTION_REQUIRED") return "complete";
  if (state === "ABSTAINED" || state === "FAILED" || state === "STALE") return "blocked";
  if (state === "DEFERRED" || state === "REJECTED") return "open";
  if (state) return "ready";
  if (item.state === "INFORMATION_NEEDED") return "blocked";
  return "ready";
}

function briefingHeading(item: WorkItem, run: RecentRun | undefined) {
  if (run?.state === "APPROVED" || run?.state === "NO_ACTION_REQUIRED") return "Recently completed";
  if (item.state === "INFORMATION_NEEDED" && (!run || run.state === "ABSTAINED")) return "Resolve this first";
  return "Highest-priority decision";
}

function situationCopy(item: WorkItem, run: RecentRun | undefined) {
  const original = item.presentation.issue;
  if (item.state !== "INFORMATION_NEEDED" || !run || run.state === "ABSTAINED") return original;
  if (run.state === "APPROVED" || run.state === "NO_ACTION_REQUIRED") {
    return {
      label: "Records corrected",
      title: "The record conflict was resolved.",
      summary: "The authoritative source was confirmed and the follow-up decision was completed.",
    };
  }
  if (run.state === "READY_FOR_REVIEW") {
    return {
      label: "Records corrected",
      title: "The conflicting records were reconciled.",
      summary: "The authoritative source was confirmed. A follow-up response is ready for review.",
    };
  }
  if (run.state === "REJECTED" || run.state === "DEFERRED") {
    return {
      label: "Records corrected",
      title: "The record conflict was resolved.",
      summary: "The authoritative source was confirmed and the follow-up decision was recorded.",
    };
  }
  if (run.state === "FAILED" || run.state === "STALE") {
    return {
      label: "Records corrected",
      title: "The records were reconciled, but the follow-up needs attention.",
      summary: "Open the saved decision to refresh the check before continuing.",
    };
  }
  return original;
}

function situationQuestions(item: WorkItem, run: RecentRun | undefined) {
  if (item.state !== "INFORMATION_NEEDED" || !run || run.state === "ABSTAINED") {
    return item.presentation.suggested_questions.slice(0, 2);
  }
  if (run.state === "APPROVED" || run.state === "NO_ACTION_REQUIRED") {
    return ["What was corrected?", "What was the final result?"];
  }
  if (run.state === "READY_FOR_REVIEW") {
    return ["What changed after the records were corrected?", "Why is this response safe to review?"];
  }
  if (run.state === "REJECTED" || run.state === "DEFERRED") {
    return ["What was corrected?", "What decision was recorded?"];
  }
  if (run.state === "FAILED" || run.state === "STALE") {
    return ["What was corrected?", "What still needs attention?"];
  }
  return item.presentation.suggested_questions.slice(0, 2);
}

function actionLabel(item: WorkItem, recent: RecentRun[]) {
  const state = runFor(item, recent)?.state;
  if (state === "APPROVED" || state === "NO_ACTION_REQUIRED") return "View result";
  if (state === "ABSTAINED") return "Review conflict";
  if (state === "READY_FOR_REVIEW") return "Continue review";
  if (state === "REJECTED" || state === "DEFERRED") return "View decision";
  return item.primary_action_label;
}

function queueScore(item: WorkItem, recent: RecentRun[] = []) {
  const state = runFor(item, recent)?.state;
  const done = state === "APPROVED" || state === "NO_ACTION_REQUIRED" ? 10 : 0;
  return done + ({ NOW: 0, SOON: 1, ROUTINE: 2 } as const)[item.urgency];
}
