// @vitest-environment jsdom
import "../test/setup";
import { useState } from "react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { oCreateRun, oEvaluateRun } from "../lib/offlineApi";
import type { Decision, RunState } from "../lib/runState";
import DecisionReview from "./DecisionReview";
import DraftWorkspace from "./DraftWorkspace";
import SafeStop from "./SafeStop";

describe("core decision flow", () => {
  it("starts with one clear impact-check action and passes axe", async () => {
    const onAnalyze = vi.fn();
    const { container } = render(<DraftWorkspace onAnalyze={onAnalyze} />);
    const primary = screen.getByRole("button", { name: "Check impact" });
    expect(screen.getByRole("heading", { name: "Understand the issue" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.setup().click(primary);
    expect(onAnalyze).toHaveBeenCalledOnce();
    expect((await runAxe(container)).violations).toEqual([]);
  });

  it("requires a manager reason for an alternative before approval", async () => {
    const run = oEvaluateRun(oCreateRun("A").run_id);
    const onDecision = vi.fn<(decision: Decision) => Promise<void>>().mockResolvedValue(undefined);

    function Harness() {
      const [state, setState] = useState<RunState>({ phase: "READY_FOR_REVIEW" });
      return <DecisionReview runId={run.run_id} letter="A" state={state} setState={setState} brief={run.decision_brief!} knowledge={run.knowledge} onDecision={onDecision} />;
    }

    render(<MemoryRouter><Harness /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Show other options" }));
    await user.click(screen.getAllByRole("button", { name: "Choose" })[0]);
    expect(screen.getByRole("button", { name: "Review and approve" })).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /Reason for choosing another response/ }), "Supplier cannot meet the recommended timing.");
    await user.click(screen.getByRole("button", { name: "Review and approve" }));
    expect(screen.getByRole("dialog", { name: "Apply this action to the simulation?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve simulated action" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({ kind: "edit-approve", reason: "Supplier cannot meet the recommended timing." }));
  });

  it("blocks Scenario E and renders no approval control", async () => {
    const run = oEvaluateRun(oCreateRun("E").run_id);
    const { container } = render(<MemoryRouter><SafeStop status="ABSTAINED" brief={run.decision_brief!} onStartClean={() => undefined} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Choose a response" })).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect((await runAxe(container)).violations).toEqual([]);
  });
});

function runAxe(container: Element) {
  return axe.run(container, { rules: { "color-contrast": { enabled: false } } });
}
