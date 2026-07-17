// @vitest-environment jsdom
import "../test/setup";
import axe from "axe-core";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildDecisionPresentation } from "../lib/decisionPresentation";
import type { WorkItem } from "../lib/liveApi";
import Home from "./Home";

const mocks = vi.hoisted(() => ({
  getWorkItems: vi.fn(),
  startWorkItem: vi.fn(),
}));

vi.mock("../lib/liveApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/liveApi")>()),
  getWorkItems: mocks.getWorkItems,
  startWorkItem: mocks.startWorkItem,
}));

const item: WorkItem = {
  schema_version: "work-item/1.0.0",
  work_item_id: "SCN-A-TEST",
  case_key: "scenario_a",
  state: "NEEDS_REVIEW",
  urgency: "SOON",
  due_label: "Review by Aug 10",
  source_count: 7,
  connected_sources: [{ source_id: "warehouse-wms", display_name: "Warehouse management system", source_kind: "CURRENT_KNOWLEDGE" }],
  presentation: buildDecisionPresentation("A"),
  primary_action_label: "Ask agent to review",
  synthetic: true,
};

function Location() {
  const location = useLocation();
  return <div>Route: {location.pathname}{location.search}</div>;
}

describe("adaptive operations home", () => {
  it("starts with one briefing and routes a plain-language question", async () => {
    mocks.getWorkItems.mockResolvedValue([item]);
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Protein coverage may fall below the safe minimum." })).toBeInTheDocument();
    expect(screen.getByText("Highest-priority decision")).toBeInTheDocument();
    expect(screen.getByText("Ready to help with today’s decisions")).toBeInTheDocument();
    expect(screen.getByText("1 connected operational system")).toBeInTheDocument();
    expect(screen.queryByText(/USDA protein shipment delay/i)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Are any deliveries at risk?" }));
    expect(screen.getByText(/Route: \/assistant\?prompt=Are%20any%20deliveries%20at%20risk%3F/)).toBeInTheDocument();
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("starts the matched case immediately without exposing fixture selection", async () => {
    mocks.getWorkItems.mockResolvedValue([item]);
    mocks.startWorkItem.mockResolvedValue({ run_id: "run_scn-a_test" });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/runs/:runId" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.setup().click(await screen.findByRole("button", { name: "Ask agent to review" }));
    await waitFor(() => expect(mocks.startWorkItem).toHaveBeenCalledWith(item));
    expect(screen.getByText("Route: /runs/run_scn-a_test")).toBeInTheDocument();
  });

  it("shows every situation, prioritizes a blocking conflict, and routes its questions to Ask", async () => {
    const conflict: WorkItem = {
      ...item,
      work_item_id: "SCN-E-TEST",
      case_key: "scenario_e",
      state: "INFORMATION_NEEDED",
      urgency: "NOW",
      due_label: null,
      presentation: buildDecisionPresentation("E"),
      primary_action_label: "Review blocking records",
    };
    mocks.getWorkItems.mockResolvedValue([item, conflict]);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assistant" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "The records conflict, so a safe recommendation is not possible." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Protein coverage may fall below the safe minimum." })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText(/Route: \/assistant\?prompt=/)).toHaveTextContent("Protein%20coverage");
  });
});
