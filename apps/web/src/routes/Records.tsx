import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, InlineLoading, Tag } from "@carbon/react";
import { ArrowRight, CheckmarkFilled, DocumentBlank, Locked, RecentlyViewed } from "@carbon/icons-react";
import ProductShell from "../components/ProductShell";
import { getRecentRuns, getRun } from "../lib/liveApi";
import type { LiveRun } from "../lib/liveTypes";
import { letterFromRunId } from "../lib/run";

type RecordTag = "blue" | "green" | "red" | "warm-gray" | "cool-gray";

const STATUS: Record<string, { label: string; type: RecordTag }> = {
  DRAFT: { label: "Not reviewed", type: "cool-gray" },
  READY_FOR_REVIEW: { label: "Ready for review", type: "blue" },
  APPROVED: { label: "Approved", type: "green" },
  REJECTED: { label: "Rejected", type: "red" },
  DEFERRED: { label: "Deferred", type: "warm-gray" },
  ABSTAINED: { label: "Safe stop", type: "red" },
  NO_ACTION_REQUIRED: { label: "No action needed", type: "green" },
  FAILED: { label: "Review failed", type: "red" },
  STALE: { label: "Needs refresh", type: "warm-gray" },
};

export default function Records() {
  const runIds = [...new Set(getRecentRuns().map((item) => item.run_id))];
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [loading, setLoading] = useState(runIds.length > 0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runIds.length) return;
    Promise.allSettled(runIds.map(getRun)).then((results) => {
      const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      setRuns(loaded);
      if (!loaded.length) setError("The decision records could not be loaded. You can return Home and open a decision again.");
      setLoading(false);
    });
    // The session index is intentionally read once when Records opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = runs[0] ?? null;

  const presentation = run?.decision_brief?.presentation;
  const status = run ? (STATUS[run.state] ?? { label: run.state, type: "cool-gray" as const }) : null;
  const letter = run ? letterFromRunId(run.run_id) : null;

  return (
    <ProductShell active="records">
      <main className="records-main">
        <section className="records-lead" aria-labelledby="records-title">
          <p className="eyebrow">Decision history</p>
          <h1 id="records-title">Records</h1>
          <p>Return to the information checked, the agent’s recommendation, and the decision made by your team.</p>
        </section>

        {loading ? (
          <section className="records-state" aria-live="polite">
            <InlineLoading description="Loading the latest decision record…" />
          </section>
        ) : error ? (
          <section className="records-state records-state--error" role="alert">
            <DocumentBlank size={28} aria-hidden />
            <h2>Record unavailable</h2>
            <p>{error}</p>
            <Button as={Link} to="/">Return Home</Button>
          </section>
        ) : run && status ? (<>
          <section className="records-latest" aria-labelledby="latest-record-title">
            <div className="records-latest__topline">
              <span><RecentlyViewed size={18} aria-hidden />Most recent decision in this browser</span>
              <Tag type={status.type} size="sm">{status.label}</Tag>
            </div>
            <div className="records-latest__body">
              <p className="records-latest__kicker">{presentation?.issue.label ?? "Decision record"}</p>
              <h2 id="latest-record-title">{presentation?.issue.title ?? run.decision_brief?.scenario_name ?? "Operational decision"}</h2>
              <p>{presentation?.issue.summary ?? "The full decision record is available for review."}</p>

              <div className="records-proof" aria-label="What this record contains">
                <span><CheckmarkFilled size={17} aria-hidden /><strong>Information and recommendation</strong><small>See what was checked and why this response was suggested</small></span>
                <span><Locked size={17} aria-hidden /><strong>Your team stayed in control</strong><small>{managerDecision(run)}</small></span>
                <span><DocumentBlank size={17} aria-hidden /><strong>Result saved</strong><small>{run.execution ? "Completed action recorded" : "No connected system was changed"}</small></span>
              </div>

              <div className="records-actions">
                <Button as={Link} to={`/runs/${run.run_id}/audit`} renderIcon={ArrowRight}>See how it was prepared</Button>
                <Button as={Link} kind="tertiary" to={`/runs/${run.run_id}`}>Open decision</Button>
                {letter === "A" && <Button as={Link} kind="ghost" to={`/runs/${run.run_id}/compare`}>Compare responses</Button>}
              </div>
            </div>
          </section>
          {runs.length > 1 && <section className="records-history" aria-labelledby="history-title">
            <div className="records-history__heading"><h2 id="history-title">Earlier decisions</h2><span>{runs.length - 1} more in this session</span></div>
            {runs.slice(1).map((item) => {
              const itemStatus = STATUS[item.state] ?? { label: item.state, type: "cool-gray" as const };
              const itemPresentation = item.decision_brief?.presentation;
              return <article className="record-row" key={item.run_id}>
                <div><span>{itemPresentation?.issue.label ?? "Decision record"}</span><h3>{itemPresentation?.issue.title ?? item.decision_brief?.scenario_name ?? "Operational decision"}</h3><small>{managerDecision(item)}</small></div>
                <Tag type={itemStatus.type} size="sm">{itemStatus.label}</Tag>
                <div className="record-row__actions"><Button as={Link} kind="ghost" size="sm" to={`/runs/${item.run_id}`}>Open</Button><Button as={Link} kind="ghost" size="sm" to={`/runs/${item.run_id}/audit`}>How it was prepared</Button></div>
              </article>;
            })}
          </section>}
        </>
        ) : (
          <section className="records-state">
            <DocumentBlank size={32} aria-hidden />
            <p className="eyebrow">Nothing recorded yet</p>
            <h2>No decision records yet</h2>
            <p>Once you ask the agent to review an issue, its evidence, recommendation, and your decision will appear here.</p>
            <Button as={Link} to="/" renderIcon={ArrowRight}>Review today’s work</Button>
          </section>
        )}
      </main>
    </ProductShell>
  );
}

function managerDecision(run: LiveRun): string {
  switch (run.decision?.kind) {
    case "approve":
    case "edit-approve":
      return "Manager approval recorded";
    case "reject":
      return "Manager rejection recorded";
    case "defer":
      return "Manager deferral recorded";
    default:
      return run.state === "ABSTAINED" ? "Approval safely locked" : "Awaiting manager decision";
  }
}
