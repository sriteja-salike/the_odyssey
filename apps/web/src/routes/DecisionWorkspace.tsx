import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InlineLoading } from "@carbon/react";
import AppFrame from "../components/AppFrame";
import DecisionReview from "../components/DecisionReview";
import DraftWorkspace from "../components/DraftWorkspace";
import ResultWorkspace from "../components/ResultWorkspace";
import SafeStop from "../components/SafeStop";
import StageTrace from "../components/StageTrace";
import Dialog from "../components/Dialog";
import NotFoundRun from "./NotFoundRun";
import { letterFromRunId } from "../lib/run";
import { useRunState, type Decision } from "../lib/runState";
import { createRun, decideRun, evaluateRun, getRun, type LiveRun } from "../lib/liveApi";

export default function DecisionWorkspace() {
  const { runId = "" } = useParams();
  const navigate = useNavigate();
  const letter = letterFromRunId(runId);
  const [state, setState] = useRunState(runId);
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!letter) return;
    getRun(runId).then((run) => {
      setLiveRun(run);
      const decision = run.decision ? {
        kind: run.decision.kind,
        actionId: run.decision.action_id,
        quantityLb: run.decision.quantity_lb,
        reason: run.decision.reason ?? undefined,
      } : undefined;
      setState({ phase: run.state, decision, selection: state.selection });
    }).catch((reason: Error) => setError(reason.message));
    // Pending selection is intentionally browser-local until the manager commits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter, runId, setState]);

  const startAnalysis = useCallback(async () => {
    setError("");
    setState({ phase: "ANALYZING" });
    try {
      const run = await evaluateRun(runId);
      setLiveRun(run);
      setState({ phase: run.state });
      window.scrollTo({ top: 0 });
    } catch (reason) {
      setError((reason as Error).message);
      setState({ phase: "DRAFT" });
    }
  }, [runId, setState]);

  async function commitDecision(decision: Decision) {
    setError("");
    try {
      const run = await decideRun(runId, decision);
      setLiveRun(run);
      setState({ phase: run.state, decision });
      window.scrollTo({ top: 0 });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function startClean() {
    if (!letter) return;
    const run = await createRun(letter, runId);
    setConfirmReset(false);
    navigate(`/runs/${run.run_id}`);
  }

  if (!letter) return <NotFoundRun />;
  if (!liveRun && !error) return <main className="bootstrap-screen"><InlineLoading description="Loading the saved decision…" /></main>;
  if (!liveRun && error) return <NotFoundRun />;

  const safeState = ["ABSTAINED", "NO_ACTION_REQUIRED", "STALE", "FAILED"].includes(state.phase);

  return (
    <AppFrame runId={runId} letter={letter} active="decision" onStartClean={startClean}>
      {error && <div className="service-error" role="alert">{error}</div>}
      {state.phase === "DRAFT" && <DraftWorkspace letter={letter} onAnalyze={startAnalysis} />}
      {state.phase === "ANALYZING" && <StageTrace />}
      {state.phase === "READY_FOR_REVIEW" && liveRun?.decision_brief && (
        <DecisionReview
          runId={runId}
          letter={letter}
          state={state}
          setState={setState}
          brief={liveRun.decision_brief}
          knowledge={liveRun.knowledge}
          onDecision={commitDecision}
        />
      )}
      {safeState && (
        <SafeStop
          status={state.phase as "ABSTAINED" | "NO_ACTION_REQUIRED" | "STALE" | "FAILED"}
          letter={letter}
          brief={liveRun?.decision_brief ?? undefined}
          onStartClean={() => setConfirmReset(true)}
          onRetry={state.phase === "FAILED" || state.phase === "STALE" ? startAnalysis : undefined}
        />
      )}
      {(state.phase === "APPROVED" || state.phase === "REJECTED" || state.phase === "DEFERRED") && state.decision && (
        <ResultWorkspace
          letter={letter}
          runId={runId}
          decision={state.decision}
          execution={liveRun?.execution ?? undefined}
          feedbackRecorded={Boolean(liveRun?.feedback)}
          outcomeRecorded={Boolean(liveRun?.outcome_feedback)}
          brief={liveRun?.decision_brief ?? undefined}
          onReset={() => setConfirmReset(true)}
        />
      )}

      {confirmReset && (
        <Dialog title="Start a clean run?" primaryLabel="Start clean run" onPrimary={() => void startClean()} onClose={() => setConfirmReset(false)}>
          <p>Start a new run from the original synthetic fixture? The current run and its audit history will remain unchanged.</p>
        </Dialog>
      )}
    </AppFrame>
  );
}
