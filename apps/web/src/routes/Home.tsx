import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InlineLoading } from "@carbon/react";
import { ArrowRight, ArrowUp, DataReference, Time } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import { getWorkItems, startWorkItem, type WorkItem } from "../lib/liveApi";

const EXAMPLE_PROMPTS = [
  "What needs my attention first?",
  "Are any deliveries at risk?",
  "Show inventory concerns",
];

export default function Home() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const briefingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getWorkItems()
      .then(setItems)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const active = items[activeIndex];
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

  async function openCurrent() {
    if (!active) return;
    setOpening(true);
    setError("");
    try {
      const run = await startWorkItem(active);
      navigate(`/runs/${run.run_id}`);
    } catch (reason) {
      setError((reason as Error).message);
      setOpening(false);
    }
  }

  function continueBriefing() {
    if (!items.length) return;
    setActiveIndex((value) => (value + 1) % items.length);
    requestAnimationFrame(() => briefingRef.current?.focus());
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
              placeholder="Describe an issue or ask about operations"
              rows={2}
            />
            <button type="submit" aria-label="Ask ShareStack" disabled={!prompt.trim()}><ArrowUp size={21} /></button>
          </form>
          <div className="home-prompts" aria-label="Example questions">
            <span>Examples:</span>
            {EXAMPLE_PROMPTS.map((item) => <button key={item} type="button" onClick={() => ask(item)}>{item}</button>)}
          </div>
        </section>

        <section className="agent-briefing" aria-labelledby="briefing-label">
          <div className="briefing-rule"><span id="briefing-label">Today’s decision queue</span></div>
          {loading && <div className="briefing-loading"><InlineLoading description="Checking verified operations data…" /></div>}
          {error && <div className="service-error" role="alert">{error}</div>}
          {active && (
            <article className="briefing-card" ref={briefingRef} tabIndex={-1}>
              <div className="briefing-card__intro">
                <span className={`briefing-indicator briefing-indicator--${active.state.toLowerCase()}`} aria-hidden />
                <div>
                  <p>{active.state === "INFORMATION_NEEDED" ? "Verified records need to be resolved" : "Verified issue ready for agent review"}</p>
                  <small>{activeIndex + 1} of {items.length} items in the current queue</small>
                </div>
              </div>
              <div className="briefing-card__body">
                <div>
                  <p className="briefing-kicker">{active.presentation.issue.label}</p>
                  <h2>{active.presentation.issue.title}</h2>
                  <p>{active.presentation.issue.summary}</p>
                  <div className="briefing-meta">
                    {active.due_label && <span><Time size={16} aria-hidden />{active.due_label}</span>}
                    <span><DataReference size={16} aria-hidden />{active.source_count} verified sources</span>
                  </div>
                </div>
                <button type="button" className="briefing-primary" onClick={() => void openCurrent()} disabled={opening}>
                  {opening ? "Agent is reviewing…" : active.primary_action_label}<ArrowRight size={19} aria-hidden />
                </button>
              </div>
              <div className="briefing-questions">
                {active.presentation.suggested_questions.slice(0, 2).map((question) => (
                  <button key={question} type="button" onClick={() => ask(`${question} ${active.presentation.issue.title}`)}>{question}<ArrowRight size={16} /></button>
                ))}
              </div>
            </article>
          )}
          {items.length > 1 && (
            <button type="button" className="briefing-next" onClick={continueBriefing}>
              <ArrowRight size={18} aria-hidden />
              <span><strong>Continue to next item</strong><small>{items[(activeIndex + 1) % items.length]?.presentation.issue.title}</small></span>
            </button>
          )}
        </section>
      </main>
    </ProductShell>
  );
}
