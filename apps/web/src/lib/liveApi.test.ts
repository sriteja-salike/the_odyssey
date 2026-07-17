import { beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  sessionStorage.clear();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("live API fallback boundary", () => {
  it("surfaces a structured backend failure without hiding it as offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Scenario contract is invalid." },
    }), { status: 500, headers: { "Content-Type": "application/json" } })));
    const api = await import("./liveApi");

    await expect(api.createRun("A")).rejects.toThrow("Scenario contract is invalid.");
    expect(api.getConnectionMode()).toBe("LIVE");
  });

  it("surfaces an invalid proxy response without hiding it as offline", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: "ready" } }), { status: 200 })));
    const api = await import("./liveApi");

    await expect(api.createRun("A")).rejects.toThrow("502");
    expect(api.getConnectionMode()).toBe("LIVE");
  });

  it("falls back when both the proxy request and API health check fail", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("Proxy target unavailable", { status: 500 }))
      .mockResolvedValueOnce(new Response("Proxy target unavailable", { status: 500 })));
    const api = await import("./liveApi");

    const run = await api.createRun("D");
    expect(api.getConnectionMode()).toBe("OFFLINE_DEMO");
    expect(run.scenario_id).toContain("SCN-D");
  });

  it("uses the complete frozen fallback only for a connection failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const api = await import("./liveApi");

    const run = await api.createRun("C");
    expect(api.getConnectionMode()).toBe("OFFLINE_DEMO");
    expect(run.state).toBe("DRAFT");
    expect(run.scenario_id).toContain("SCN-C");
  });
});
