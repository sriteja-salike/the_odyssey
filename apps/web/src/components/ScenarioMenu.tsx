import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "@carbon/icons-react";
import { SCENARIOS, type ScenarioLetter } from "../lib/api";
import { startCase } from "../lib/liveApi";

/** Toolbar control that lists every demo scenario and opens the selected one
    as an evaluated decision run. */
export default function ScenarioMenu({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ScenarioLetter | null>(null);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openScenario(letter: ScenarioLetter) {
    if (busy) return;
    setBusy(letter);
    setError("");
    try {
      const run = await startCase(`scenario_${letter.toLowerCase()}`);
      setOpen(false);
      navigate(`/runs/${run.run_id}`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`scenario-menu ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="scenario-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Demo cases
        <ChevronDown size={16} aria-hidden className={open ? "scenario-menu__chevron scenario-menu__chevron--open" : "scenario-menu__chevron"} />
      </button>
      {open && (
        <div className="scenario-menu__panel" role="menu" aria-label="Demo scenarios">
          <p className="scenario-menu__hint">Open a frozen synthetic scenario</p>
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.letter}
              type="button"
              role="menuitem"
              className="scenario-menu__item"
              disabled={busy !== null}
              onClick={() => void openScenario(scenario.letter)}
            >
              {busy === scenario.letter ? "Opening…" : scenario.label}
            </button>
          ))}
          {error && <p className="scenario-menu__error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
