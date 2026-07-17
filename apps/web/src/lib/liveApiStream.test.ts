// @vitest-environment jsdom
import "../test/setup";
import { afterEach, describe, expect, it, vi } from "vitest";
import { streamOperationsAssistant } from "./liveApi";

afterEach(() => vi.unstubAllGlobals());

describe("operations assistant streaming fallback", () => {
  it("returns a verified frozen answer when the stream cannot connect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));
    const events = [];

    for await (const event of streamOperationsAssistant(
      [{ role: "user", content: "Do any records conflict?" }],
      undefined,
      new AbortController().signal,
    )) events.push(event);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "result",
      data: {
        response_type: "SAFE_STOP",
        agent: { effective_mode: "offline" },
      },
    });
  });
});
