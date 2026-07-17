import { describe, expect, it } from "vitest";
import { getCannedAnswer } from "./cannedAnswers";

describe("scripted demo answers", () => {
  it("returns the expected shipment walkthrough for the guided prompt", () => {
    const response = getCannedAnswer("What are the expected shipments?");

    expect(response?.response_type).toBe("ANSWER");
    expect(response?.answer).toContain("USDA Protein (PO-4471)");
    expect(response?.answer).toContain("Prairie Farms");
    expect(response?.work_item).toBeNull();
    expect(response?.guardrails.facts).toBe("Hardcoded synthetic demonstration data");
  });

  it("normalizes punctuation but does not intercept unrelated questions", () => {
    expect(getCannedAnswer("  Show inventory concerns!!! ")?.answer).toContain("Protein — 1.3 weeks");
    expect(getCannedAnswer("How should I resolve the conflicting records?")).toBeNull();
  });
});
