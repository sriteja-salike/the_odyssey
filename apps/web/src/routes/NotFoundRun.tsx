/* Unknown run URL (01 §3.4): not-found state with an explicit start control.
   Never auto-creates a run. */
import { useNavigate } from "react-router-dom";
import { syntheticRunId } from "../lib/api";

export default function NotFoundRun() {
  const navigate = useNavigate();
  return (
    <div className="app">
      <div className="main">
        <div className="stack" style={{ maxWidth: 560 }}>
          <h1 className="risk-title" style={{ marginTop: 0 }}>This run was not found</h1>
          <p className="note">The run ID in the address does not match a known synthetic run.</p>
          <div className="actions">
            <button className="btn btn--primary" onClick={() => navigate(`/runs/${syntheticRunId("A")}`)}>
              Start new Scenario A run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
