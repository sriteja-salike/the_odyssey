import { InlineLoading, Tag } from "@carbon/react";
import { Locked } from "@carbon/icons-react";

const STAGES = [
  "Reading the new notice",
  "Checking inventory and delivery records",
  "Projecting the next four weeks",
  "Checking safe responses",
];

export default function StageTrace() {
  return (
    <div className="journey-shell">
      <header className="journey-intro">
        <Tag type="blue" size="sm">Impact check in progress</Tag>
        <h1>Checking what this means for your operation</h1>
        <p>Nourish Ops is checking inventory, deliveries, and available responses before it shows a recommendation.</p>
      </header>
      <ol className="task-list">
        <li className="task-step task-step--active">
          <div className="task-step__marker" aria-hidden>1</div>
          <div className="task-step__body">
            <div className="task-step__title"><div><span>Step 1</span><h2>Understand the issue</h2></div><Tag type="blue">Checking</Tag></div>
            <InlineLoading description="Checking inventory, deliveries, and available responses…" />
            <details className="plain-disclosure analysis-details">
              <summary>What is being checked?</summary>
              <ul>{STAGES.map((stage) => <li key={stage}>{stage}</li>)}</ul>
            </details>
          </div>
        </li>
        <li className="task-step task-step--pending" aria-disabled="true"><div className="task-step__marker">2</div><div className="task-step__body"><h2>Choose a response</h2><p>Waiting for the impact check.</p></div></li>
        <li className="task-step task-step--pending" aria-disabled="true"><div className="task-step__marker">3</div><div className="task-step__body"><h2>Confirm</h2><p>You will review the details before anything is recorded.</p></div></li>
      </ol>
      <p className="journey-reassurance"><Locked size={16} aria-hidden /> Nothing happens until you confirm.</p>
    </div>
  );
}
