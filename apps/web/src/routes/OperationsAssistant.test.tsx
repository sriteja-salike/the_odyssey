// @vitest-environment jsdom
import "../test/setup";
import axe from "axe-core";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDecisionPresentation } from "../lib/decisionPresentation";
import type { OperationsAssistantResponse, WorkItem } from "../lib/liveApi";
import OperationsAssistant from "./OperationsAssistant";

const mocks = vi.hoisted(() => ({
  askOperationsAssistant: vi.fn(),
  startWorkItem: vi.fn(),
}));

vi.mock("../lib/liveApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/liveApi")>()),
  askOperationsAssistant: mocks.askOperationsAssistant,
  startWorkItem: mocks.startWorkItem,
}));

const item: WorkItem = {
  schema_version: "work-item/1.0.0",
  work_item_id: "SCN-E-TEST",
  case_key: "scenario_e",
  state: "INFORMATION_NEEDED",
  urgency: "NOW",
  due_label: null,
  source_count: 7,
  presentation: buildDecisionPresentation("E"),
  primary_action_label: "Review blocking records",
  synthetic: true,
};

function response(answer: string): OperationsAssistantResponse {
  return {
    schema_version: "operations-assistant-response/2.0.0",
    response_type: "SAFE_STOP",
    answer,
    work_item: item,
    suggested_questions: item.presentation.suggested_questions,
    authority_note: "Only a manager can approve a simulated action.",
    agent: {
      requested_mode: "live",
      effective_mode: "live",
      status: "live_verified",
      role: "OPERATIONS_ASSISTANT",
      provider: "anthropic",
      model: "test-model",
      prompt_version: "operations-agent/1.0.0",
      output_schema_version: "operations-agent-output/1.0.0",
      tool_contract_version: "operations-agent-tools/1.0.0",
      tool_calls: ["get_open_work_items"],
      fallback_code: null,
    },
    guardrails: {
      facts: "Backend-rendered from verified snapshots",
      constraints: "Rechecked by the deterministic safety engine",
      approval: "Human manager required",
    },
    synthetic: true,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  mocks.askOperationsAssistant.mockReset();
  mocks.startWorkItem.mockReset();
});

describe("operations agent conversation", () => {
  it("sends full history on follow-up and exposes agent provenance", async () => {
    mocks.askOperationsAssistant
      .mockResolvedValueOnce(response("I found a decision-critical record conflict."))
      .mockResolvedValueOnce(response("Expected arrival differs across the two records."));
    const { container } = render(
      <MemoryRouter initialEntries={["/assistant?prompt=Do%20any%20records%20conflict%3F"]}>
        <Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("I found a decision-critical record conflict.")).toBeInTheDocument();
    expect(screen.getByText("Live anthropic agent · verified output")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Ask about operations" });
    await userEvent.setup().type(input, "Which records differ?");
    await userEvent.setup().click(screen.getByRole("button", { name: "Send message" }));

    await screen.findByText("Expected arrival differs across the two records.");
    await waitFor(() => expect(mocks.askOperationsAssistant).toHaveBeenCalledTimes(2));
    const [messages, currentId] = mocks.askOperationsAssistant.mock.calls[1];
    expect(messages).toEqual(expect.arrayContaining([
      { role: "user", content: "Do any records conflict?" },
      { role: "assistant", content: "I found a decision-critical record conflict." },
      { role: "user", content: "Which records differ?" },
    ]));
    expect(currentId).toBe("SCN-E-TEST");
    expect((await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  });

  it("restores the conversation after a refresh", async () => {
    const saved = response("The records still need correction.");
    sessionStorage.setItem("nourishops:operations-assistant-session", JSON.stringify({
      messages: [
        { role: "user", content: [{ type: "text", text: "Which records conflict?" }] },
        { role: "assistant", content: [{ type: "text", text: saved.answer }] },
      ],
      response: saved,
    }));
    render(
      <MemoryRouter initialEntries={["/assistant"]}>
        <Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("The records still need correction.")).toBeInTheDocument();
    expect(mocks.askOperationsAssistant).not.toHaveBeenCalled();
  });
});
