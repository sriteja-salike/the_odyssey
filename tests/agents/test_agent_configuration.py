from __future__ import annotations

from dataclasses import replace

import pytest

from nourishops.agents.runtime import build_decision_agent, build_decision_reviewer
from nourishops.settings import Settings, get_settings


def base_settings(**updates) -> Settings:
    settings = Settings(
        environment="test",
        database_url="postgresql://unused",
        agent_mode="live",
        build_id="test",
        allowed_origin="http://localhost",
        agent_provider="anthropic",
        agent_model="claude-haiku-4-5",
        agent_timeout_seconds=1,
        agent_deadline_seconds=2,
        agent_max_retries=0,
        agent_api_key="synthetic-test-key",
    )
    return replace(settings, **updates)


@pytest.mark.parametrize(("provider", "model"), [
    ("anthropic", "claude-haiku-4-5"),
    ("openai", "gpt-test-model"),
])
def test_provider_clients_are_bound_explicitly_without_network(
    provider: str, model: str,
) -> None:
    agent = build_decision_agent(base_settings(agent_provider=provider, agent_model=model))
    description = agent.describe()
    assert description.provider == provider
    assert description.model == model
    assert description.status == "live_configured"


def test_provider_prefix_mismatch_fails_closed() -> None:
    agent = build_decision_agent(base_settings(agent_model="openai:gpt-test-model"))
    description = agent.describe()
    assert description.effective_mode == "offline_fallback"
    assert description.fallback_code == "AGENT_CONFIG_MISMATCH_FALLBACK"


def test_missing_live_key_fails_closed() -> None:
    agent = build_decision_agent(base_settings(agent_api_key=None))
    description = agent.describe()
    assert description.effective_mode == "offline_fallback"
    assert description.fallback_code == "AGENT_CONFIG_MISSING_FALLBACK"


def test_reviewer_uses_the_same_provider_boundary_and_fails_closed() -> None:
    configured = build_decision_reviewer(base_settings())
    assert configured.describe().role == "INDEPENDENT_REVIEWER"
    assert configured.describe().status == "live_configured"

    fallback = build_decision_reviewer(base_settings(agent_api_key=None))
    assert fallback.describe().effective_mode == "offline_fallback"
    assert fallback.describe().fallback_code == "REVIEWER_CONFIG_MISSING_FALLBACK"


def test_settings_are_read_at_call_time(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NOURISHOPS_AGENT_MODE", "live")
    monkeypatch.setenv("NOURISHOPS_AGENT_PROVIDER", "anthropic")
    monkeypatch.delenv("NOURISHOPS_AGENT_MODEL", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert get_settings().agent_mode == "live"
    assert get_settings().agent_model == "claude-haiku-4-5"

    monkeypatch.setenv("NOURISHOPS_AGENT_MODE", "offline")
    assert get_settings().agent_mode == "offline"


def test_invalid_agent_budget_fails_fast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NOURISHOPS_AGENT_TIMEOUT_SECONDS", "7")
    monkeypatch.setenv("NOURISHOPS_AGENT_DEADLINE_SECONDS", "6")
    with pytest.raises(ValueError, match="deadline"):
        get_settings()
