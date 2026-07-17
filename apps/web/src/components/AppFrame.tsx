import { useEffect, useState, useSyncExternalStore } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Header,
  HeaderGlobalBar,
  HeaderMenu,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  OverflowMenu,
  OverflowMenuItem,
  Tag,
} from "@carbon/react";
import { Information, OverflowMenuVertical, WarningAlt } from "@carbon/icons-react";
import { getOverlay, type ScenarioLetter } from "../lib/api";
import { createRun, getConnectionMode, subscribeConnectivity } from "../lib/liveApi";
import { date } from "../lib/format";
import Dialog from "./Dialog";
import ScenarioMenu from "./ScenarioMenu";

const SIM_NOTICE =
  "Simulation only — All organizations, records, quantities, costs, and outcomes in this prototype are synthetic.";

interface Props {
  runId: string;
  letter: ScenarioLetter;
  active: "decision" | "compare" | "audit";
  onStartClean?: () => void | Promise<void>;
  children: React.ReactNode;
}

export default function AppFrame({ runId, letter, active, onStartClean, children }: Props) {
  const navigate = useNavigate();
  const overlay = getOverlay(letter);
  const [resetOpen, setResetOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const connectionMode = useSyncExternalStore(subscribeConnectivity, getConnectionMode, getConnectionMode);
  const offline = connectionMode === "OFFLINE_DEMO";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [active, runId]);

  async function startClean() {
    setWorking(true);
    try {
      if (onStartClean) await onStartClean();
      else {
        const run = await createRun(letter, runId);
        navigate(`/runs/${run.run_id}`);
      }
      setResetOpen(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="app-shell">
      <Header aria-label="ShareStack" className="app-header">
        <HeaderName as={NavLink} to="/" prefix="">ShareStack</HeaderName>
        <HeaderNavigation aria-label="Primary navigation">
          <HeaderMenuItem as={NavLink} to="/">Home</HeaderMenuItem>
          <HeaderMenuItem as={NavLink} to={`/runs/${runId}`} end isActive={active === "decision"}>Current decision</HeaderMenuItem>
          <HeaderMenu
            aria-label="Records"
            menuLinkName="Records"
            isActive={active === "compare" || active === "audit"}
          >
            {letter === "A" && <HeaderMenuItem as={NavLink} to={`/runs/${runId}/compare`}>Compare this decision</HeaderMenuItem>}
            <HeaderMenuItem as={NavLink} to={`/runs/${runId}/audit`}>Audit record</HeaderMenuItem>
          </HeaderMenu>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <ScenarioMenu className="scenario-menu--header" />
          <OverflowMenu
            aria-label="Decision options"
            renderIcon={OverflowMenuVertical}
            flipped
            className="header-overflow"
          >
            <OverflowMenuItem itemText="Start clean run" onClick={() => setResetOpen(true)} />
          </OverflowMenu>
        </HeaderGlobalBar>
      </Header>

      <nav className="mobile-primary-nav" aria-label="Primary navigation">
        <NavLink to="/">Home</NavLink>
        <NavLink to={`/runs/${runId}`} end>Decision</NavLink>
        {letter === "A" && <NavLink className="mobile-compare-link" to={`/runs/${runId}/compare`}>Compare</NavLink>}
        <NavLink to={`/runs/${runId}/audit`}>Audit</NavLink>
      </nav>

      <div className="simulation-note" role="note">
        <WarningAlt size={18} aria-hidden />
        <span>{SIM_NOTICE}</span>
      </div>

      <details className="shell-details">
        <summary><Information size={16} aria-hidden /> Decision details</summary>
        <div className="shell-details__content">
          <span><small>Scenario</small><strong>{overlay.display_name}</strong></span>
          <span><small>Planning date</small><strong>{date(overlay.planning_date)}</strong></span>
          <span><small>Run</small><strong className="mono">{runId}</strong></span>
          <Tag type={offline ? "warm-gray" : "green"} size="sm">{offline ? "Offline verified" : "Live verified"}</Tag>
        </div>
      </details>

      <main className="main">{children}</main>

      {resetOpen && (
        <Dialog
          title="Start a clean run?"
          primaryLabel={working ? "Starting…" : "Start clean run"}
          primaryDisabled={working}
          onPrimary={() => void startClean()}
          onClose={() => setResetOpen(false)}
        >
          <p>Start again from the original synthetic fixture. This run and its complete audit record will remain unchanged.</p>
        </Dialog>
      )}
    </div>
  );
}
