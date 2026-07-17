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
          <p className="eyebrow">Decision record</p>
          <h1 className="risk-title">How this decision was prepared</h1>
          <p className="lead">See what ShareStack checked, how the recommendation was reviewed, and where human control was protected.</p>
        </section>

        <section className="card version-card">
          <div className="section-heading"><div><p className="eyebrow">Decision snapshot</p><h2>Information preserved with this review</h2></div><Tag type="cool-gray" size="sm">Saved when review began</Tag></div>
          <div className="versions">
            <span>Decision format <b>{v.schema_version}</b></span>
            <span>Operations data <b>{v.data_version}</b></span>
            <span>Situation details <b>{v.scenario_version}</b></span>
            <span>Expected result <b>{v.golden_version}</b></span>
            <span>Review time <b>{v.fixed_clock_utc}</b></span>
          </div>
        </section>

        {trace && (
          <section className="card trace-card">
            <div className="process-head">
              <div>
                <p className="eyebrow">ShareStack’s work</p>
                <h2 className="sec">{trace.final_status === "ABSTAINED" ? "Why ShareStack stopped safely" : "From connected information to recommendation"}</h2>
                <p className="hint">A plain-language record of the checks that were completed.</p>
              </div>
              <Tag type="green" size="sm">{trace.final_status}</Tag>
            </div>
            <ol className="decision-process">
              {trace.stages.map((stage, index) => (
                <li key={stage.stage}>
                  <span className="decision-process__number">{index + 1}</span>
                  <div>
                    <div className="decision-process__title">
                      <strong>{stageLabel(stage.stage)}</strong>
                      <span>{stageOwner(stage.stage)}</span>
                    </div>
                    <p>{stage.summary}</p>
                    <div className="decision-process__meta">
                      <span>{stage.status === "FALLBACK" ? "Verified backup completed" : stage.status === "SKIPPED" ? "Not needed" : "Completed"}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="card audit-events-card">
          <div className="section-heading"><div><p className="eyebrow">Detailed history</p><h2>What happened, in order</h2></div>{events.length > 0 && <Tag type="blue" size="sm">{events.length} recorded steps</Tag>}</div>
          {error ? (
            <p className="field__err" role="alert">{error}</p>
          ) : liveEvents === null ? (
            <InlineLoading description="Loading the decision history…" />
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

function stageLabel(stage: string): string {
  return ({
    CONTEXT_FROZEN: "Connected information gathered",
    DETERMINISTIC_SOLVER: "Available responses and limits checked",
    DECISION_ORCHESTRATOR: "Recommendation prepared and explained",
    INDEPENDENT_REVIEWER: "Independent safety review completed",
    AUTHORITY_VALIDATOR: "Human approval protected",
  } as Record<string, string>)[stage] ?? humanize(stage);
}

function stageOwner(stage: string): string {
  return ({
    CONTEXT_FROZEN: "Connected records",
    DETERMINISTIC_SOLVER: "Decision checks",
    DECISION_ORCHESTRATOR: "Decision agent",
    INDEPENDENT_REVIEWER: "Safety reviewer",
    AUTHORITY_VALIDATOR: "Approval guardrail",
  } as Record<string, string>)[stage] ?? "ShareStack";
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
      return [["Information version", e.semantic_id], ["Result", "Information format checked"]];
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
