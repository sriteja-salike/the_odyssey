import { describe, expect, it } from "vitest";
import { buildDecisionPresentation } from "./decisionPresentation";
import type { ScenarioLetter } from "./api";

function presentation(letter: ScenarioLetter) {
  return buildDecisionPresentation(letter);
}

describe("decision presentation mappings", () => {
  it("maps Scenario A to the verified coverage breach and recovery", () => {
    const view = presentation("A");
    expect(view.visual.kind).toBe("coverage");
    expect(view.issue.summary).toContain("1.3 weeks");
    expect(view.issue.summary).toContain("1.5-week minimum");
    expect(view.recommendation?.effect).toBe("Restores protein coverage from 1.3 to 3.0 weeks.");
  });

  it("maps Scenario B to the refrigerated capacity constraint", () => {
    const view = presentation("B");
    expect(view.visual.kind).toBe("capacity");
    expect(view.issue.summary).toContain("50,000 lb");
    expect(view.issue.summary).toContain("10,000 lb above the 40,000 lb limit");
    expect(view.recommendation?.effect).toContain("40,000 lb");
  });

  it("maps Scenario C to offer, target, and full redirect", () => {
    const view = presentation("C");
    expect(view.visual.kind).toBe("mismatch");
    expect(view.issue.summary).toContain("12,000 lb");
    expect(view.issue.summary).toContain("6,000 lb");
    expect(view.recommendation?.effect).toBe("Redirects all 12,000 lb to a food bank that can use it.");
  });

  it("maps Scenario D to the verified budget tradeoff", () => {
    const view = presentation("D");
    expect(view.visual.kind).toBe("budget");
    expect(view.issue.summary).toContain("$13,000");
    expect(view.issue.summary).toContain("$22,350");
    expect(view.issue.summary).toContain("$9,350 shortfall");
    expect(view.recommendation?.effect).toContain("$3,400 available");
  });

  it("maps Scenario E to conflict without any recommendation", () => {
    const view = presentation("E");
    expect(view.visual.kind).toBe("conflict");
    expect(view.recommendation).toBeNull();
    expect(view.issue.title).toContain("safe recommendation is not possible");
  });
});
