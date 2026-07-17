import { beforeEach, describe, expect, it } from "vitest";
import { assistantSuggestions, respond } from "./Assistant";
import { oCreateRun, oEvaluateRun } from "../lib/offlineApi";

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

describe("grounded decision guide", () => {
  it("uses the current scenario decision brief for explanations", () => {
    const run = oEvaluateRun(oCreateRun("B").run_id);
    const response = respond(run, "B", "Why this action?");
    expect(response.reply).toContain(run.decision_brief!.rationale!.why_this_action);
    expect(response.reply).not.toMatch(/undefined|NaN/);
  });

  it("shows recorded alternatives without Scenario A assumptions", () => {
    const run = oEvaluateRun(oCreateRun("D").run_id);
    const response = respond(run, "D", "What alternatives were considered?");
    expect(response.reply).toContain("Other evaluated actions");
    expect(response.reply).not.toContain("peer transfer");
    expect(response.reply).not.toMatch(/undefined|NaN/);
  });

  it("opens Compare only where a verified comparison exists", () => {
    const scenarioA = oEvaluateRun(oCreateRun("A").run_id);
    const scenarioB = oEvaluateRun(oCreateRun("B").run_id);
    expect(respond(scenarioA, "A", "Open Compare").action).toMatchObject({ type: "navigate" });
    expect(respond(scenarioB, "B", "Open Compare").action).toBeUndefined();
  });

  it("explains abstention from decision-critical issues", () => {
    const run = oEvaluateRun(oCreateRun("E").run_id);
    const response = respond(run, "E", "Why was this withheld?");
    expect(response.reply).toContain("withheld");
    expect(response.reply).toContain("does not guess");
  });

  it("surfaces the stage-level trace without claiming chain-of-thought", () => {
    const run = oEvaluateRun(oCreateRun("C").run_id);
    const response = respond(run, "C", "Show the decision process");
    expect(response.reply).toContain("Deterministic Solver");
    expect(response.reply).toContain("not private chain-of-thought");
  });

  it("changes prompts with the current run state", () => {
    const draft = oCreateRun("A");
    const ready = oEvaluateRun(draft.run_id);
    expect(assistantSuggestions(draft, "A")).toContain("What can this scenario decide?");
    expect(assistantSuggestions(ready, "A")).toContain("Why this action?");
  });
});
