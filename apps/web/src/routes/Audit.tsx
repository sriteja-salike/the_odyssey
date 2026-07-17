/* Audit (01 §3.3, §6.6): one chronological event surface; each row reveals a
   details view with inputs/outputs, source IDs, and versions. Events + details
   are loaded from the append-only PostgreSQL event stream. */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Accordion, AccordionItem, InlineLoading, Tag } from "@carbon/react";
import AppFrame from "../components/AppFrame";
import NotFoundRun from "./NotFoundRun";
import { getGolden, getOverlay } from "../lib/api";
import { letterFromRunId } from "../lib/run";
import { CATEGORY_LABEL } from "../lib/categories";
import { lb, usd, weeks, wos, date, titleCase } from "../lib/format";
import type { AuditEvent } from "../types/golden";
import {
  getEvents,
  type DecisionTrace,
  type DecisionTraceStage,
  type LiveEvent,
} from "../lib/liveApi";

const EVENT_LABEL: Record<string, string> = {
  RUN_CREATED: "Run created",
  SCENARIO_VALIDATED: "Scenario validated",
  NOTICE_EXTRACTED: "Notice extracted",
  DISRUPTION_APPLIED: "Disruption applied",
  RISK_DETECTED: "Risk detected",
  DECISION_TRACE_RECORDED: "Decision process recorded",
  FALLBACK_USED: "Orchestrator fallback used",
  REVIEWER_FALLBACK_USED: "Reviewer fallback used",
  RECOMMENDATION_PREPARED: "Recommendation prepared",
  MANAGER_APPROVED: "Manager approved",
  SIMULATED_ACTION_APPLIED: "Simulated action applied",
  SIMULATED_ACTION_COMPLETED: "Simulated action completed",
  RECOMMENDATION_FEEDBACK: "Recommendation feedback recorded",
  OUTCOME_FEEDBACK_RECORDED: "Action outcome recorded",
};

export default function Audit() {
  const { runId = "" } = useParams();
  const letter = letterFromRunId(runId);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents(runId).then(setLiveEvents).catch((reason: Error) => setError(reason.message));
  }, [runId]);

  if (!letter) return <NotFoundRun />;
  const golden = getGolden(letter);
  const events: AuditEvent[] = (liveEvents ?? []).map((event) => ({
    sequence: event.sequence_no,
    event_type: event.event_type,
    semantic_id: event.event_id,
  }));
  const trace = liveEvents?.find(
    (event) => event.event_type === "DECISION_TRACE_RECORDED",
  )?.payload.decision_trace as DecisionTrace | undefined;
  const v = golden as unknown as Record<string, string>;

  return (
    <AppFrame runId={runId} letter={letter} active="audit">
      <div className="stack route-stack audit-page">
        <section className="page-lead">
          <p className="eyebrow">Run governance · append-only</p>
          <h1 className="risk-title">Audit record</h1>
          <p className="lead">Inspect the verified stages, pinned versions, and chronological events behind this decision.</p>
        </section>

        <section className="card version-card">
          <div className="section-heading"><div><p className="eyebrow">Reproducibility</p><h2>Frozen versions</h2></div><Tag type="cool-gray" size="sm">Pinned at run creation</Tag></div>
          <div className="versions">
            <span>Schema <b>{v.schema_version}</b></span>
            <span>Data <b>{v.data_version}</b></span>
            <span>Scenario <b>{v.scenario_version}</b></span>
            <span>Golden <b>{v.golden_version}</b></span>
            <span>Clock <b>{v.fixed_clock_utc}</b></span>
          </div>
        </section>

        {trace && (
          <section className="card trace-card">
            <div className="process-head">
              <div>
                <p className="eyebrow">Agent transparency</p>
                <h2 className="sec">{trace.final_status === "ABSTAINED" ? "How this safe stop was produced" : "How this recommendation was produced"}</h2>
                <p className="hint">Verified stage records and timings—not private chain-of-thought.</p>
              </div>
              <Tag type="green" size="sm">{trace.final_status}</Tag>
            </div>
            <ol className="decision-process">
              {trace.stages.map((stage, index) => (
                <li key={stage.stage}>
                  <span className="decision-process__number">{index + 1}</span>
                  <div>
                    <div className="decision-process__title">
                      <strong>{humanize(stage.stage)}</strong>
                      <span>{humanize(stage.actor)}</span>
                    </div>
                    <p>{stage.summary}</p>
                    <div className="decision-process__meta">
                      <span>{stage.status === "FALLBACK" ? "Safe fallback" : titleCase(stage.status)}</span>
                      <span>{stage.duration_ms} ms</span>
                      {stageRuntime(stage) && <span>{stageRuntime(stage)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="card audit-events-card">
          <div className="section-heading"><div><p className="eyebrow">Chronology</p><h2>Append-only event stream</h2></div>{events.length > 0 && <Tag type="blue" size="sm">{events.length} events</Tag>}</div>
          {error ? (
            <p className="field__err" role="alert">{error}</p>
          ) : liveEvents === null ? (
            <InlineLoading description="Loading the append-only event stream…" />
          ) : events.length === 0 ? (
            <p>No events have been recorded for this run.</p>
          ) : (
            <Accordion align="start" size="lg" className="audit-events">
              {events.map((event) => {
                const detail = eventDetail(event, letter);
                return (
                  <AccordionItem
                    key={event.sequence}
                    title={(
                      <span className="audit-event__title">
                        <span className="audit-event__sequence">{String(event.sequence).padStart(2, "0")}</span>
                        <strong>{EVENT_LABEL[event.event_type] ?? humanize(event.event_type)}</strong>
                        <span className="srcid">{event.semantic_id}</span>
                      </span>
                    )}
                  >
                    <dl className="audit-kv">
                      {detail.map(([key, value]) => (
                        <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </section>
      </div>
    </AppFrame>
  );
}

function humanize(value: string): string {
  return value.toLowerCase().split("_").map(titleCase).join(" ");
}

function stageRuntime(stage: DecisionTraceStage): string | null {
  if (stage.status === "SKIPPED") return null;
  const mode = stage.details.effective_mode;
  const provider = stage.details.provider;
  const model = stage.details.model;
  const solver = stage.details.solver_id;
  if (typeof mode === "string") {
    return [humanize(mode), provider, model]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" · ");
  }
  return typeof solver === "string" ? solver : null;
}

/** Per-event inputs/outputs derived from the golden. */
function eventDetail(e: AuditEvent, letter: Parameters<typeof getGolden>[0]): [string, string][] {
  const golden = getGolden(letter);
  const overlay = getOverlay(letter);
  const risk = golden.risks.find((r) => r.is_primary) ?? golden.risks[0];
  const rec = golden.recommended_action;
  const mut = overlay.overlay.inbound_mutations[0];
  const set = (mut?.set ?? {}) as { expected_week_start?: string; status?: string };

  switch (e.event_type) {
    case "RUN_CREATED":
      return [["Scenario", overlay.display_name], ["Scenario ID", e.semantic_id], ["Mode", "Offline verified"]];
    case "SCENARIO_VALIDATED":
      return [["Data version", e.semantic_id], ["Result", "Fixtures validated against schema"]];
    case "NOTICE_EXTRACTED":
      return [
        ["Source notice", e.semantic_id],
        ["Extracted shipment", mut?.inbound_id ?? "—"],
        ["Revised week", set.expected_week_start ? date(set.expected_week_start) : "—"],
        ["Extracted status", set.status ? titleCase(set.status) : "—"],
      ];
    case "DISRUPTION_APPLIED":
      return [
        ["Inbound record", e.semantic_id],
        ["New status", set.status ? titleCase(set.status) : "—"],
        ["New arrival", set.expected_week_start ? date(set.expected_week_start) : "—"],
      ];
    case "RISK_DETECTED":
      return [
        ["Risk", e.semantic_id],
        ["Category", risk ? CATEGORY_LABEL[risk.category_id] : "—"],
        ["First breach", risk ? date(risk.first_breach_week_start) : "—"],
        ["Coverage at breach", risk ? weeks(risk.conservative_end_wos_at_breach) : "—"],
        ["Gap to target", risk ? lb(risk.gap_to_target_lb) : "—"],
        ["Priority score", risk ? wos(risk.priority_score) : "—"],
      ];
    case "RECOMMENDATION_PREPARED":
      return [
        ["Recommendation", e.semantic_id],
        ["Action", rec.action_id],
        ["Quantity", lb(rec.requested_quantity_lb)],
        ["Simulated cost", usd(rec.cost_usd)],
        ["Confidence", titleCase(rec.confidence)],
        ["Source records", rec.source_ids.join(", ")],
      ];
    case "MANAGER_APPROVED":
      return [["Approved evaluation", e.semantic_id], ["Authority", "Human manager (required)"]];
    case "SIMULATED_ACTION_APPLIED":
    case "SIMULATED_ACTION_COMPLETED":
      return [["Applied action", e.semantic_id], ["Effect", "Projection recomputed in simulation only"]];
    default:
      return [["Reference", e.semantic_id]];
  }
}
