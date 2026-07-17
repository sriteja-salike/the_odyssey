import { Button, Tag } from "@carbon/react";
import { ArrowRight, Document, Locked } from "@carbon/icons-react";
import { getNotice, getOverlay, type ScenarioLetter } from "../lib/api";
import { date } from "../lib/format";

export default function DraftWorkspace({ letter, onAnalyze }: { letter: ScenarioLetter; onAnalyze: () => void }) {
  const overlay = getOverlay(letter);
  const notice = getNotice(letter);

  return (
    <div className="journey-shell journey-shell--draft">
      <header className="journey-intro">
        <Tag type="warm-gray" size="sm">New supply issue</Tag>
        <h1>{overlay.display_name}</h1>
        <p>Review the new information, then let Nourish Ops check how it affects the next four weeks.</p>
      </header>

      <ol className="task-list">
        <li className="task-step task-step--active">
          <div className="task-step__marker" aria-hidden>1</div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 1</span><h2>Understand the issue</h2></div><Tag type="blue">Current</Tag></div>
            {notice && (
              <article className="incoming-notice">
                <Document size={22} aria-hidden />
                <div>
                  <strong>{notice.title}</strong>
                  <span>Received {date(notice.recorded_at.slice(0, 10))} · synthetic notice</span>
                  <p>{notice.body}</p>
                </div>
              </article>
            )}
            <div className="task-primary-row">
              <Button renderIcon={ArrowRight} onClick={onAnalyze}>Check impact</Button>
              <span>Usually takes a few seconds</span>
            </div>
          </div>
        </li>

        <PendingStep number={2} title="Choose a response" copy="A recommended next step will appear after the impact check." />
        <PendingStep number={3} title="Confirm" copy="You will review every consequence before anything is recorded." />
      </ol>

      <p className="journey-reassurance"><Locked size={16} aria-hidden /> Simulation only — no real order will be placed.</p>
    </div>
  );
}

function PendingStep({ number, title, copy }: { number: number; title: string; copy: string }) {
  return (
    <li className="task-step task-step--pending" aria-disabled="true">
      <div className="task-step__marker" aria-hidden>{number}</div>
      <div className="task-step__body">
        <div className="task-step__title"><div><span>Step {number}</span><h2>{title}</h2></div><Tag type="cool-gray">Pending</Tag></div>
        <p>{copy}</p>
      </div>
    </li>
  );
}
