import { Button, Tag } from "@carbon/react";
import { ArrowRight, DataReference, Locked, Time } from "@carbon/icons-react";
import type { WorkItem } from "../lib/liveApi";

export default function DraftWorkspace({ item, onAnalyze }: { item?: WorkItem; onAnalyze: () => void }) {
  return (
    <div className="journey-shell journey-shell--draft">
      <header className="journey-intro">
        <Tag type="warm-gray" size="sm">New operations issue</Tag>
        <h1>{item?.presentation.issue.title ?? "Check a new operations issue"}</h1>
        <p>{item?.presentation.issue.summary ?? "ShareStack will check the verified records and identify whether a response is needed."}</p>
      </header>

      <ol className="task-list">
        <li className="task-step task-step--active">
          <div className="task-step__marker" aria-hidden>1</div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 1</span><h2>Understand the issue</h2></div><Tag type="blue">Current</Tag></div>
            {item && (
              <div className="incoming-notice incoming-notice--case">
                <DataReference size={22} aria-hidden />
                <div>
                  <strong>{item.presentation.issue.title}</strong>
                  <span>{item.source_count} verified sources are ready to check</span>
                  {item.due_label && <p><Time size={16} aria-hidden /> {item.due_label}</p>}
                </div>
              </div>
            )}
            <div className="task-primary-row">
              <Button renderIcon={ArrowRight} onClick={onAnalyze}>Check impact</Button>
              <span>Checks inventory, deliveries, policies, capacity, and feasible responses</span>
            </div>
          </div>
        </li>

        <PendingStep number={2} title="Choose a response" copy="A verified next step appears only if the data supports one." />
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
