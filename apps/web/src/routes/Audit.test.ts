import { describe, expect, it } from "vitest";
import type { AuditEvent } from "../types/golden";
import { eventDetail } from "./Audit";

const prepared: AuditEvent = {
  sequence: 6,
  event_type: "RECOMMENDATION_PREPARED",
  semantic_id: "EVT-RECOMMENDATION",
};

describe("audit event details", () => {
  it("uses the live recommendation after a Scenario E blocker is resolved", () => {
    const detail = eventDetail(prepared, "E", {
      analysis: {
        recommended_action: {
          action_id: "ACT-A-PURCHASE-PROTEIN-15000",
          requested_quantity_lb: 15000,
          cost_usd: "12750.00",
          confidence: "HIGH",
        },
      },
      decision_brief: {
        rationale: { evidence_ids: ["EVD-A-VENDOR-STANDARD"] },
      },
    });

    expect(detail).toContainEqual(["Action", "ACT-A-PURCHASE-PROTEIN-15000"]);
    expect(detail).toContainEqual(["Quantity", "15,000 lb"]);
    expect(detail).toContainEqual(["Simulated cost", "$12,750"]);
    expect(detail).toContainEqual(["Source records", "EVD-A-VENDOR-STANDARD"]);
  });

  it("shows a safe fallback when no recommendation was recorded", () => {
    expect(eventDetail(prepared, "E")).toContainEqual([
      "Result",
      "No recommendation details were recorded for this event",
    ]);
  });
});
