from __future__ import annotations

from pydantic_ai import ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from nourishops.agents.operations import (
    OfflineOperationsAgent,
    PydanticAIOperationsAgent,
)


def work_items() -> list[dict]:
    return [
        {
            "work_item_id": "SCN-A",
            "state": "NEEDS_REVIEW",
            "urgency": "SOON",
            "presentation": {"archetype": "INBOUND_DISRUPTION"},
        },
        {
            "work_item_id": "SCN-E",
            "state": "INFORMATION_NEEDED",
            "urgency": "NOW",
            "presentation": {"archetype": "DATA_RECONCILIATION"},
        },
    ]


def test_offline_agent_does_not_silently_default_unrelated_questions() -> None:
    outcome = OfflineOperationsAgent().route(
        [{"role": "user", "content": "Can you plan a birthday menu?"}],
        work_items(),
    )

    assert outcome.selection.response_type == "CLARIFY"
    assert outcome.selection.work_item_id is None


def test_offline_agent_preserves_context_for_a_follow_up() -> None:
    outcome = OfflineOperationsAgent().route(
        [{"role": "user", "content": "What needs to be corrected?"}],
        work_items(),
        current_work_item_id="SCN-E",
    )

    assert outcome.selection.response_type == "SAFE_STOP"
    assert outcome.selection.answer_style == "CORRECTION"
    assert outcome.selection.work_item_id == "SCN-E"


def test_live_operations_agent_uses_the_read_only_work_item_tool() -> None:
    output = {
        "response_type": "SAFE_STOP",
        "answer_style": "CONFLICTS",
        "work_item_id": "SCN-E",
    }

    def respond(messages, info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart(
                info.function_tools[0].name,
                {},
            )])
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, output)])

    agent = PydanticAIOperationsAgent(
        model_name="anthropic:test-model",
        provider="anthropic",
        request_timeout_seconds=1,
        deadline_seconds=2,
        model=FunctionModel(respond),
    )
    outcome = agent.route(
        [{"role": "user", "content": "Which records conflict?"}],
        work_items(),
    )

    assert outcome.selection.work_item_id == "SCN-E"
    assert outcome.metadata.status == "live_verified"
    assert outcome.metadata.tool_calls == ["get_open_work_items"]
