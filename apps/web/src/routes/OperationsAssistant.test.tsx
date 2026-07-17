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
  getWorkItems: vi.fn(),
  startWorkItem: vi.fn(),
}));

vi.mock("../lib/liveApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/liveApi")>()),
  askOperationsAssistant: mocks.askOperationsAssistant,
  getWorkItems: mocks.getWorkItems,
  startWorkItem: mocks.startWorkItem,
}));

const proteinItem: WorkItem = {
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

const item: WorkItem = {
  schema_version: "work-item/1.0.0",
  work_item_id: "SCN-E-TEST",
  case_key: "scenario_e",
  state: "INFORMATION_NEEDED",
  urgency: "NOW",
  due_label: null,
  source_count: 7,
  connected_sources: [{ source_id: "receiving-erp", display_name: "Receiving and inbound ERP", source_kind: "CURRENT_KNOWLEDGE" }],
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
  mocks.getWorkItems.mockReset();
  mocks.getWorkItems.mockResolvedValue([proteinItem]);
  mocks.startWorkItem.mockReset();
});

describe("operations agent conversation", () => {
  it("uses the scripted demo answer without calling the agent API", async () => {
    render(
      <MemoryRouter initialEntries={["/assistant?prompt=What%20are%20the%20expected%20shipments%3F"]}>
        <Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/USDA Protein \(PO-4471\)/)).toBeInTheDocument();
    expect(screen.getByText(/Prairie Farms/)).toBeInTheDocument();
    expect(mocks.askOperationsAssistant).not.toHaveBeenCalled();
  });

  it("runs the guided two-turn demo with a thinking state and decision handoff", async () => {
    let resolveWorkItems!: (items: WorkItem[]) => void;
    mocks.getWorkItems.mockReturnValueOnce(new Promise((resolve) => { resolveWorkItems = resolve; }));
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/assistant?new=1"]}>
        <Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", { name: "Ask about operations" });
    await user.type(input, "What needs my attention first?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Checking inventory, deliveries, and available responses")).toBeInTheDocument();
    resolveWorkItems([proteinItem]);
    expect(await screen.findByText(/The issue needs review by Aug 10, but no action has been taken/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: proteinItem.presentation.issue.title })).toBeInTheDocument();

    await user.type(input, "Why is the protein shortage urgent?");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText(/purchasing 15,000 lb for \$12,750/)).toBeInTheDocument();
    expect(screen.getByText("Guided demo review completed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open agent recommendation/ })).toBeInTheDocument();
    expect(mocks.askOperationsAssistant).not.toHaveBeenCalled();
  });

  it("hands an unscripted follow-up to the live agent with the guided context", async () => {
    mocks.askOperationsAssistant.mockResolvedValue({
      ...response("The live agent compared cost, arrival timing, and coverage risk."),
      response_type: "DECISION",
      work_item: proteinItem,
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/assistant?new=1"]}>
        <Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes>
      </MemoryRouter>,
    );

    const input = screen.getByRole("textbox", { name: "Ask about operations" });
    await user.type(input, "What needs my attention first?");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText(/The issue needs review by Aug 10, but no action has been taken/)).toBeInTheDocument();

    await user.type(input, "Which tradeoffs should I consider?");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("The live agent compared cost, arrival timing, and coverage risk.")).toBeInTheDocument();

    expect(mocks.askOperationsAssistant).toHaveBeenCalledTimes(1);
    const [messages, currentId] = mocks.askOperationsAssistant.mock.calls[0];
    expect(messages).toEqual(expect.arrayContaining([
      { role: "user", content: "What needs my attention first?" },
      expect.objectContaining({ role: "assistant", content: expect.stringContaining("10,000 lb USDA protein shipment") }),
      { role: "user", content: "Which tradeoffs should I consider?" },
    ]));
    expect(currentId).toBe("SCN-A-TEST");
  });

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
    expect(screen.getByText("Decision agent completed its review")).toBeInTheDocument();
    expect(screen.getByText("What ShareStack did")).toBeInTheDocument();
    expect(screen.getByText("7 case records across 1 connected operational system")).toBeInTheDocument();
    expect(screen.getByText("Discussing")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: item.presentation.issue.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
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

  it("clears the matched scenario when starting a new conversation", async () => {
    const saved = response("The records still need correction.");
    sessionStorage.setItem("nourishops:operations-assistant-session", JSON.stringify({
      messages: [{ role: "assistant", content: [{ type: "text", text: saved.answer }] }],
      response: saved,
    }));
    render(<MemoryRouter initialEntries={["/assistant"]}><Routes><Route path="/assistant" element={<OperationsAssistant />} /></Routes></MemoryRouter>);

    await userEvent.setup().click(await screen.findByRole("button", { name: "New conversation" }));
    expect(await screen.findByText(WELCOME_TEXT)).toBeInTheDocument();
    expect(screen.queryByText("Discussing")).not.toBeInTheDocument();
  });
});

const WELCOME_TEXT = "Tell me what changed or ask what needs attention. I’ll match your question to verified operations data, explain the decision, and keep approval with you.";
