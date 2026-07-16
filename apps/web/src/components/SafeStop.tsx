/* Safe-stop template (02 §3.1, 01 §7.5 §8): ABSTAINED / NO_FEASIBLE_ACTION /
   FAILED / STALE / NO_ACTION_REQUIRED. Exact headline first, grouped detail,
   and only the state-table primary action. No approval control. */
import { useNavigate } from "react-router-dom";
import { CircleAlert, ICON } from "./icons";
import { getGolden, syntheticRunId, type ScenarioLetter } from "../lib/api";
import type { DecisionStatus } from "../types/golden";

interface BlockingIssue {
  finding_id: string;
  severity: string;
  field: string;
  record_ids: string[];
  observed_values: (string | null)[];
  message: string;
  why_decision_critical: string;
}

const HEADLINE: Partial<Record<DecisionStatus, string>> = {
  ABSTAINED: "A safe recommendation cannot be produced from the current data.",
  NO_ACTION_REQUIRED: "No category is projected below its minimum in the four-week conservative view.",
  FAILED: "The simulation could not be completed. No scenario data or decisions were changed.",
  STALE: "Inputs changed after this analysis. Re-run before deciding.",
};

export default function SafeStop({ status, letter }: { status: DecisionStatus; letter: ScenarioLetter }) {
  const navigate = useNavigate();
  const golden = getGolden(letter);
  const issues = (golden.blocking_issues as unknown as BlockingIssue[]) ?? [];
  const isAbstain = status === "ABSTAINED";

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <section>
        <span className="pill pill--breach">
          <CircleAlert size={ICON} aria-hidden /> {isAbstain ? "Recommendation withheld" : status.replace(/_/g, " ")}
        </span>
        <h1 className="risk-title" style={{ maxWidth: "44ch" }}>
          {HEADLINE[status] ?? "This run cannot proceed."}
        </h1>
      </section>

      {isAbstain && issues.length > 0 && (
        <section className="card">
          <h2 className="sec">Missing or conflicting decision-critical fields</h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Issue</th>
                <th scope="col">Records</th>
                <th scope="col">Observed</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((it) => (
                <tr key={it.finding_id}>
                  <td className="mono">{it.field}</td>
                  <td>
                    {it.message}
                    <div className="note">{it.why_decision_critical}</div>
                  </td>
                  <td>{it.record_ids.map((r) => (<div key={r}><a className="srcid" href="#">{r}</a></div>))}</td>
                  <td className="mono">{it.observed_values.map((v, i) => (<div key={i}>{v ?? "—"}</div>))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="actions">
        <button className="btn btn--primary" onClick={() => navigate(`/runs/${syntheticRunId(letter)}`)}>
          Start clean run
        </button>
      </div>
    </div>
  );
}
