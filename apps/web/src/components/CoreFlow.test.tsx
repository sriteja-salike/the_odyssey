// @vitest-environment jsdom
import "../test/setup";
import { useState } from "react";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { oCreateRun, oEvaluateRun } from "../lib/offlineApi";
import type { Decision, RunState } from "../lib/runState";
import DecisionReview from "./DecisionReview";
import DraftWorkspace from "./DraftWorkspace";
import ResultWorkspace from "./ResultWorkspace";
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
    expect(screen.getByRole("dialog", { name: "Approve this action?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve action" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({ kind: "edit-approve", reason: "Supplier cannot meet the recommended timing." }));
  });

  it("makes rejection visible, requires feedback, and keeps non-final paths available", async () => {
    const run = oEvaluateRun(oCreateRun("A").run_id);
    const onDecision = vi.fn<(decision: Decision) => Promise<void>>().mockResolvedValue(undefined);

    function Harness() {
      const [state, setState] = useState<RunState>({ phase: "READY_FOR_REVIEW" });
      return <DecisionReview runId={run.run_id} letter="A" state={state} setState={setState} brief={run.decision_brief!} knowledge={run.knowledge} onDecision={onDecision} />;
    }

    const { container } = render(<MemoryRouter><Harness /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Ask the agent" })).toHaveAttribute("href", expect.stringContaining("/assistant?prompt="));
    expect(screen.getByRole("button", { name: "Decide later" })).toBeVisible();

    await userEvent.setup().click(screen.getByRole("button", { name: "Reject and record feedback" }));
    const dialog = screen.getByRole("dialog", { name: "Reject this recommendation?" });
    const confirm = within(dialog).getByRole("button", { name: "Reject and record feedback" });
    expect(confirm).toBeDisabled();
    await userEvent.setup().type(within(dialog).getByRole("textbox", { name: "What makes this recommendation unsuitable?" }), "The vendor timing is no longer workable.");
    expect(confirm).toBeEnabled();
    await userEvent.setup().click(confirm);
    expect(onDecision).toHaveBeenCalledWith(expect.objectContaining({
      kind: "reject",
      reason: "The vendor timing is no longer workable.",
    }));
    expect((await runAxe(container)).violations).toEqual([]);
  });

  it("offers chat or a clear end to the flow after rejection", async () => {
    const run = oEvaluateRun(oCreateRun("A").run_id);
    const recommendation = run.decision_brief!.recommendation!.action;
    const { container } = render(
      <MemoryRouter>
        <ResultWorkspace
          letter="A"
          runId={run.run_id}
          decision={{ kind: "reject", actionId: recommendation.action_id, quantityLb: recommendation.requested_quantity_lb, reason: "Timing does not work." }}
          feedbackRecorded
          outcomeRecorded={false}
          brief={run.decision_brief!}
          onReset={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Recommendation rejected" })).toBeInTheDocument();
    expect(screen.getByText("Your reason is attached to this recommendation in the audit record.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask the agent" })).toHaveAttribute("href", expect.stringContaining("/assistant?prompt="));
    expect(screen.getByRole("link", { name: "Finish and return to Today" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("Give feedback on this recommendation")).not.toBeInTheDocument();
    expect((await runAxe(container)).violations).toEqual([]);
  });

  it("asks for feedback only once after an approved action", () => {
    const run = oEvaluateRun(oCreateRun("A").run_id);
    const recommendation = run.decision_brief!.recommendation!.action;
    render(
      <MemoryRouter>
        <ResultWorkspace
          letter="A"
          runId={run.run_id}
          decision={{ kind: "approve", actionId: recommendation.action_id, quantityLb: recommendation.requested_quantity_lb }}
          feedbackRecorded={false}
          outcomeRecorded
          brief={run.decision_brief!}
          onReset={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Outcome recorded. Thank you.")).toBeInTheDocument();
    expect(screen.queryByText("Give feedback on this recommendation")).not.toBeInTheDocument();
    expect(screen.queryByText("Was this recommendation useful?")).not.toBeInTheDocument();
  });

  it("blocks Scenario E and renders no approval control", async () => {
    const run = oEvaluateRun(oCreateRun("E").run_id);
    const onResolve = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<MemoryRouter><SafeStop status="ABSTAINED" brief={run.decision_brief!} onStartClean={() => undefined} onResolve={onResolve} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Choose a response" })).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Resolve record conflict" }));
    const dialog = screen.getByRole("dialog", { name: "Resolve the record conflict" });
    const submit = within(dialog).getByRole("button", { name: "Confirm and run check again" });
    expect(submit).toBeDisabled();
    await userEvent.setup().click(within(dialog).getByRole("radio", { name: /Planned inbound ledger/ }));
    await userEvent.setup().click(within(dialog).getByRole("checkbox", { name: /I verified this source/ }));
    expect(submit).toBeEnabled();
    await userEvent.setup().click(submit);
    expect(onResolve).toHaveBeenCalledWith("INBOUND_LEDGER");
    expect((await runAxe(container)).violations).toEqual([]);
  });
});

function runAxe(container: Element) {
  return axe.run(container, { rules: { "color-contrast": { enabled: false } } });
}
