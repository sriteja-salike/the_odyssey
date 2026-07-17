/* Persistent application frame (01 §6.1, 02 §4): wordmark, nav, scenario/run
   context, mode indicator, clean-run control, and the persistent simulation
   notice — present on every route. */
import { NavLink, useNavigate } from "react-router-dom";
import { AlertTriangle, ICON_SM } from "./icons";
import { SCENARIOS, getOverlay, type ScenarioLetter } from "../lib/api";
import { createRun } from "../lib/liveApi";
import { date } from "../lib/format";

// Exact persistent notice — verbatim from 00_BUILD_CONTRACT.md.
const SIM_NOTICE =
  "Simulation only — All organizations, records, quantities, costs, and outcomes in this prototype are synthetic.";

interface Props {
  runId: string;
  letter: ScenarioLetter;
  active: "decision" | "compare" | "audit";
  onStartClean?: () => void;
  children: React.ReactNode;
}

export default function AppFrame({ runId, letter, active, onStartClean, children }: Props) {
  const navigate = useNavigate();
  const overlay = getOverlay(letter);

  async function defaultStartClean() {
    const run = await createRun(letter, runId);
    navigate(`/runs/${run.run_id}`);
  }

  async function onScenarioChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ScenarioLetter;
    if (next === letter) return;
    const run = await createRun(next);
    navigate(`/runs/${run.run_id}`);
  }

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <span className="brand__name">NourishOps</span>
          <span className="brand__desc">Nutrition-Aware Supply Resilience</span>
        </div>
        <nav className="nav" aria-label="Primary">
          <NavLink to={`/runs/${runId}`} end aria-current={active === "decision" ? "page" : undefined}>
            Decision
          </NavLink>
          <NavLink to={`/runs/${runId}/compare`} aria-current={active === "compare" ? "page" : undefined}>
            Compare
          </NavLink>
          <NavLink to={`/runs/${runId}/audit`} aria-current={active === "audit" ? "page" : undefined}>
            Audit
          </NavLink>
        </nav>
        <div className="appbar__right">
          <span className="mode" title="Numbers are computed offline by the deterministic engine.">
            <span className="dot" />
            Offline verified mode
          </span>
          <button className="btn btn--secondary btn--sm" onClick={onStartClean ?? defaultStartClean}>
            Start clean run
          </button>
        </div>
      </header>

      <div className="simbar" role="note">
        <AlertTriangle size={ICON_SM} aria-hidden />
        <span>{SIM_NOTICE}</span>
      </div>

      <div className="ctx">
        <span>
          <span className="ctx__k">Scenario </span>
          <span className="ctx__v">{overlay.display_name}</span>
        </span>
        <span className="ctx__sep">·</span>
        <span>
          <span className="ctx__k">As of </span>
          <span className="ctx__v">{date(overlay.planning_date)}</span>
        </span>
        <span className="ctx__sep">·</span>
        <span>
          <span className="ctx__k">Run </span>
          <span className="ctx__v mono">{runId} · synthetic</span>
        </span>
        <span className="ctx__sep">·</span>
        <label>
          <span className="ctx__k">Scenario </span>
          <select value={letter} onChange={onScenarioChange} aria-label="Select scenario">
            {SCENARIOS.map((s) => (
              <option key={s.letter} value={s.letter}>
                {s.label}
                {s.inScope ? "" : " (engine-only)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <main className="main">{children}</main>
    </div>
  );
}
