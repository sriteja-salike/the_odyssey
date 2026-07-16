/* Audit (01 §3.3, §6.6): one chronological event surface for the run.
   Uses the golden audit_oracle as the event stream (the real API will return
   append-only run_events with the same ordering). */
import { useParams } from "react-router-dom";
import AppFrame from "../components/AppFrame";
import NotFoundRun from "./NotFoundRun";
import { getGolden } from "../lib/api";
import { letterFromRunId } from "../lib/run";

const EVENT_LABEL: Record<string, string> = {
  RUN_CREATED: "Run created",
  SCENARIO_VALIDATED: "Scenario validated",
  NOTICE_EXTRACTED: "Notice extracted",
  DISRUPTION_APPLIED: "Disruption applied",
  RISK_DETECTED: "Risk detected",
  RECOMMENDATION_PREPARED: "Recommendation prepared",
  MANAGER_APPROVED: "Manager approved",
  SIMULATED_ACTION_APPLIED: "Simulated action applied",
};

export default function Audit() {
  const { runId = "" } = useParams();
  const letter = letterFromRunId(runId);
  if (!letter) return <NotFoundRun />;
  const golden = getGolden(letter);
  const events = golden.audit_oracle ?? [];

  return (
    <AppFrame runId={runId} letter={letter} active="audit">
      <div className="stack" style={{ maxWidth: 900 }}>
        <section>
          <h1 className="risk-title" style={{ marginTop: 0 }}>Audit record</h1>
          <p className="note">Append-only events for this run. Every displayed value traces to a source record.</p>
        </section>
        <section className="card">
          {events.length === 0 ? (
            <p>No events have been recorded for this run.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th scope="col" className="num">#</th>
                  <th scope="col">Event</th>
                  <th scope="col">Reference</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.sequence}>
                    <td className="num">{e.sequence}</td>
                    <td style={{ fontWeight: 600 }}>{EVENT_LABEL[e.event_type] ?? e.event_type}</td>
                    <td><a className="srcid" href="#">{e.semantic_id}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppFrame>
  );
}
