import { beforeEach, describe, expect, it } from "vitest";
import { getGolden, type ScenarioLetter } from "./api";
import {
  oCreateRun,
  oDecideRun,
  oEvaluateRun,
  oGetEvents,
  oGetRun,
  oSubmitFeedback,
  oSubmitOutcomeFeedback,
} from "./offlineApi";

const LETTERS: ScenarioLetter[] = ["A", "B", "C", "D", "E"];

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

beforeEach(() => sessionStorage.clear());

describe("offline demo contract", () => {
  it.each(LETTERS)("mirrors the complete analyzed run contract for Scenario %s", (letter) => {
    const draft = oCreateRun(letter);
    expect(draft.state).toBe("DRAFT");
    expect(draft.decision_brief).toBeNull();

    const run = oEvaluateRun(draft.run_id);
    expect(run.state).toBe(letter === "E" ? "ABSTAINED" : "READY_FOR_REVIEW");
    expect(run.decision_brief?.scenario_id).toBe(getGolden(letter).scenario_id);
    expect(run.decision_brief?.solver.deterministic).toBe(true);
    expect(run.decision_brief?.evidence.length).toBeGreaterThan(0);
    expect(run.decision_trace?.exposes_chain_of_thought).toBe(false);
    expect(run.decision_trace?.stages).toHaveLength(5);
    expect(run.decision_trace?.stages.some((stage) => stage.status === "FALLBACK")).toBe(true);

    if (letter === "E") {
      expect(run.decision_brief?.recommendation).toBeNull();
      expect(run.decision_brief?.blocking_issues.length).toBeGreaterThan(0);
      expect(run.decision_trace?.final_status).toBe("ABSTAINED");
    } else {
      expect(run.decision_brief?.recommendation?.action.action_id).toBe(
        getGolden(letter).recommended_action.action_id,
      );
      expect(run.decision_brief?.alternatives.length).toBeGreaterThan(0);
    }
  });

  it("creates distinct child runs without overwriting history", () => {
    const first = oCreateRun("A");
    const second = oCreateRun("A", first.run_id);
    expect(second.run_id).not.toBe(first.run_id);
    expect(second.parent_run_id).toBe(first.run_id);
    expect(oGetRun(first.run_id).parent_run_id).toBeNull();
  });

  it("records an approval-gated simulated action and no external write", () => {
    const analyzed = oEvaluateRun(oCreateRun("A").run_id);
    const recommendation = analyzed.decision_brief!.recommendation!;
    const approved = oDecideRun(analyzed.run_id, {
      kind: "approve",
      actionId: recommendation.action.action_id,
      quantityLb: recommendation.action.requested_quantity_lb,
    });

    expect(approved.action_intent?.requires_human_approval).toBe(true);
    expect(approved.action_intent?.external_write_allowed).toBe(false);
    expect(approved.execution_receipt?.status).toBe("SIMULATED_COMPLETED");
    expect(approved.execution_receipt?.external_write_performed).toBe(false);
    expect(oGetEvents(approved.run_id).map((event) => event.event_type)).toEqual(
      expect.arrayContaining(["DECISION_TRACE_RECORDED", "MANAGER_APPROVED", "SIMULATED_ACTION_COMPLETED"]),
    );
  });

  it("refuses to fabricate a newly edited quantity offline", () => {
    const analyzed = oEvaluateRun(oCreateRun("A").run_id);
    const recommendation = analyzed.decision_brief!.recommendation!;
    expect(() => oDecideRun(analyzed.run_id, {
      kind: "edit-approve",
      actionId: recommendation.action.action_id,
      quantityLb: recommendation.action.requested_quantity_lb + 1,
      reason: "Manager adjustment",
    })).toThrow("frozen evaluated quantity");
  });

  it("records rejection feedback as part of the decision", () => {
    const analyzed = oEvaluateRun(oCreateRun("A").run_id);
    const recommendation = analyzed.decision_brief!.recommendation!;
    const rejected = oDecideRun(analyzed.run_id, {
      kind: "reject",
      actionId: recommendation.action.action_id,
      quantityLb: recommendation.action.requested_quantity_lb,
      reason: "The delivery timing no longer works.",
    });

    expect(rejected.state).toBe("REJECTED");
    expect(rejected.feedback).toMatchObject({
      rating: "NOT_HELPFUL",
      reason: "The delivery timing no longer works.",
      survey: { source: "decision_rejection" },
    });
    expect(oGetEvents(rejected.run_id).map((event) => event.event_type)).toEqual(
      expect.arrayContaining(["MANAGER_REJECTED", "RECOMMENDATION_FEEDBACK"]),
    );
  });

  it("persists recommendation and outcome feedback into the audit stream", () => {
    const analyzed = oEvaluateRun(oCreateRun("B").run_id);
    const recommendation = analyzed.decision_brief!.recommendation!;
    const approved = oDecideRun(analyzed.run_id, {
      kind: "approve",
      actionId: recommendation.action.action_id,
      quantityLb: recommendation.action.requested_quantity_lb,
    });
    oSubmitFeedback(approved.run_id, "HELPFUL", "Clear recommendation", { actionability: "high" });
    oSubmitOutcomeFeedback(approved.run_id, "SUCCESSFUL");

    const saved = oGetRun(approved.run_id);
    expect(saved.feedback).toMatchObject({ rating: "HELPFUL" });
    expect(saved.outcome_feedback).toMatchObject({ outcome: "SUCCESSFUL" });
    expect(oGetEvents(saved.run_id).map((event) => event.event_type)).toEqual(
      expect.arrayContaining(["RECOMMENDATION_FEEDBACK", "OUTCOME_FEEDBACK_RECORDED"]),
    );
  });
});
