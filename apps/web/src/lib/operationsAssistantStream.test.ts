import { describe, expect, it } from "vitest";
import { parseOperationsAssistantEvent } from "./operationsAssistantStream";

describe("operations assistant stream protocol", () => {
  it("parses a versioned delta", () => {
    expect(parseOperationsAssistantEvent(JSON.stringify({
      protocol: "operations-assistant-stream/1.0.0",
      type: "delta",
      sequence: 2,
      request_id: "REQ-TEST",
      delta: "Verified answer ",
    }))).toMatchObject({ type: "delta", delta: "Verified answer " });
  });

  it("rejects malformed and unsupported events", () => {
    expect(() => parseOperationsAssistantEvent("not-json")).toThrow(/unreadable/);
    expect(() => parseOperationsAssistantEvent(JSON.stringify({
      protocol: "operations-assistant-stream/0.9.0",
      type: "done",
      sequence: 1,
      request_id: "REQ-TEST",
    }))).toThrow(/unsupported/);
  });
});
