// @vitest-environment jsdom
import "../test/setup";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScenarioMenu from "./ScenarioMenu";

const mocks = vi.hoisted(() => ({ startCase: vi.fn() }));

vi.mock("../lib/liveApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/liveApi")>()),
  startCase: mocks.startCase,
}));

function Location() {
  const location = useLocation();
  return <div>Route: {location.pathname}</div>;
}

beforeEach(() => mocks.startCase.mockReset());

describe("prepared demo situations", () => {
  it("restores direct scenario access without changing the Home workflow", async () => {
    mocks.startCase.mockResolvedValue({ run_id: "run_scn-b_test" });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScenarioMenu />
        <Routes><Route path="*" element={<Location />} /></Routes>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Demo cases" }));
    await user.click(screen.getByRole("menuitem", { name: "B · Short-life produce offer" }));

    await waitFor(() => expect(mocks.startCase).toHaveBeenCalledWith("scenario_b"));
    expect(screen.getByText("Route: /runs/run_scn-b_test")).toBeInTheDocument();
  });
});
