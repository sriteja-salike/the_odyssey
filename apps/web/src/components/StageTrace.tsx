/* Analyze stage trace (01 §4.2): show completed/active stages only. In offline
   mode stages complete near-instantly — no invented delay to look "agentic".
   Honors prefers-reduced-motion (completes immediately). */
import { useEffect, useState } from "react";
import { Check } from "./icons";

const STAGES = [
  "Reading disruption notice",
  "Validating supply records",
  "Projecting four-week coverage",
  "Checking available responses",
  "Preparing decision brief",
];

export default function StageTrace({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDone(STAGES.length); onDone(); return; }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setDone(i);
      if (i >= STAGES.length) { clearInterval(t); setTimeout(onDone, 180); }
    }, 170);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div className="stack" style={{ maxWidth: 560 }} role="status" aria-live="polite">
      <h1 className="risk-title" style={{ marginTop: 0 }}>Analyzing disruption…</h1>
      <ul className="tracelist">
        {STAGES.map((s, i) => {
          const state = i < done ? "done" : i === done ? "active" : "todo";
          return (
            <li key={s} className={`traceitem traceitem--${state}`}>
              <span className="traceitem__mark" aria-hidden>
                {state === "done" ? <Check size={14} /> : <span className="spinner" />}
              </span>
              {s}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
