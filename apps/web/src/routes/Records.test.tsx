// @vitest-environment jsdom
import "../test/setup";
import axe from "axe-core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDecisionPresentation } from "../lib/decisionPresentation";
import type { LiveRun } from "../lib/liveTypes";
import Records from "./Records";

const mocks = vi.hoisted(() => ({ getRun: vi.fn() }));

vi.mock("../lib/liveApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/liveApi")>()),
  getRun: mocks.getRun,
}));

beforeEach(() => {
  sessionStorage.clear();
  mocks.getRun.mockReset();
});

describe("records landing", () => {
  it("keeps Records available before a decision exists", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/records"]}>
        <Routes><Route path="/records" element={<Records />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Records" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "No decision records yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review today’s work" })).toHaveAttribute("href", "/");
    expect(mocks.getRun).not.toHaveBeenCalled();
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("shows the latest decision and opens its audit record", async () => {
    sessionStorage.setItem("nourishops:last-run", "run_scn-a_records");
    mocks.getRun.mockResolvedValue({
      run_id: "run_scn-a_records",
      state: "APPROVED",
      decision: { kind: "approve" },
      execution: { execution_id: "receipt-1" },
      decision_brief: {
        scenario_name: "Protein shipment delay",
        presentation: buildDecisionPresentation("A"),
      },
    } as unknown as LiveRun);

    render(
      <MemoryRouter initialEntries={["/records"]}>
        <Routes><Route path="/records" element={<Records />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Manager approval recorded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See how it was prepared" })).toHaveAttribute("href", "/runs/run_scn-a_records/audit");
    expect(screen.getByRole("link", { name: "Compare responses" })).toHaveAttribute("href", "/runs/run_scn-a_records/compare");
  });

  it("lists earlier decisions from the same browser session", async () => {
    sessionStorage.setItem("nourishops:recent-runs", JSON.stringify([
      { run_id: "run_scn-e_latest", scenario_key: "scenario_e", state: "ABSTAINED", updated_at: "2026-07-17T12:00:00Z" },
      { run_id: "run_scn-a_earlier", scenario_key: "scenario_a", state: "APPROVED", updated_at: "2026-07-17T11:00:00Z" },
    ]));
    mocks.getRun.mockImplementation(async (runId: string) => ({
      run_id: runId,
      state: runId.includes("scn-e") ? "ABSTAINED" : "APPROVED",
      decision: runId.includes("scn-e") ? null : { kind: "approve" },
      execution: null,
      decision_brief: { presentation: buildDecisionPresentation(runId.includes("scn-e") ? "E" : "A") },
    } as unknown as LiveRun));

    render(<MemoryRouter initialEntries={["/records"]}><Routes><Route path="/records" element={<Records />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Earlier decisions" })).toBeInTheDocument();
    expect(screen.getByText("1 more in this session")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/runs/run_scn-a_earlier");
  });
});
