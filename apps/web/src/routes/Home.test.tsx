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
    expect(screen.getByText("Verified issue ready for agent review")).toBeInTheDocument();
    expect(screen.queryByText(/USDA protein shipment delay/i)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Are any deliveries at risk?" }));
    expect(screen.getByText(/Route: \/assistant\?prompt=Are%20any%20deliveries%20at%20risk%3F/)).toBeInTheDocument();
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("creates and evaluates the matched case without exposing fixture selection", async () => {
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
});
