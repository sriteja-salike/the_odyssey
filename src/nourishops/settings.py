"""Runtime settings for the NourishOps backend.

Offline mode is the default and requires no provider key (05 §3.1). The
deterministic engine never reads these — it takes explicit config/clock/seed
(00 §7); only the API and agent-adapter layers consult runtime mode.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_CONTEXT = REPO_ROOT / "BUILD_CONTEXT"
SCHEMAS_DIR = BUILD_CONTEXT / "schemas"
FIXTURES_DIR = BUILD_CONTEXT / "fixtures"
GOLDEN_DIR = BUILD_CONTEXT / "golden"

@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str
    agent_mode: str
    build_id: str
    allowed_origin: str
    agent_provider: str | None
    agent_model: str | None
    agent_timeout_seconds: float
    agent_deadline_seconds: float
    agent_max_retries: int
    agent_api_key: str | None = field(repr=False)


def _optional(value: str | None) -> str | None:
    clean = value.strip() if value else ""
    return clean or None


def _provider_key(provider: str | None) -> str | None:
    if provider == "anthropic":
        return _optional(os.environ.get("ANTHROPIC_API_KEY"))
    if provider == "openai":
        return _optional(os.environ.get("OPENAI_API_KEY"))
    return None


def get_settings() -> Settings:
    """Read runtime configuration once at the application boundary."""
    mode = (_optional(os.environ.get("NOURISHOPS_AGENT_MODE")) or "offline").lower()
    provider = (_optional(os.environ.get("NOURISHOPS_AGENT_PROVIDER")) or "anthropic").lower()
    model = _optional(os.environ.get("NOURISHOPS_AGENT_MODEL"))
    if model is None and provider == "anthropic":
        model = "claude-haiku-4-5"
    timeout_seconds = float(os.environ.get("NOURISHOPS_AGENT_TIMEOUT_SECONDS", "6"))
    deadline_seconds = float(os.environ.get("NOURISHOPS_AGENT_DEADLINE_SECONDS", "12"))
    max_retries = int(os.environ.get("NOURISHOPS_AGENT_MAX_RETRIES", "1"))
    if mode not in {"offline", "live"}:
        raise ValueError("NOURISHOPS_AGENT_MODE must be 'offline' or 'live'")
    if timeout_seconds <= 0 or deadline_seconds < timeout_seconds:
        raise ValueError("Agent deadline must be at least one positive request timeout")
    if max_retries not in {0, 1}:
        raise ValueError("NOURISHOPS_AGENT_MAX_RETRIES must be 0 or 1")
    return Settings(
        environment=os.environ.get("NOURISHOPS_ENV", "development"),
        database_url=os.environ.get(
            "NOURISHOPS_DATABASE_URL",
            "postgresql://nourishops:nourishops@127.0.0.1:55432/nourishops",
        ),
        agent_mode=mode,
        build_id=os.environ.get("NOURISHOPS_BUILD_ID", "local"),
        allowed_origin=os.environ.get("NOURISHOPS_ALLOWED_ORIGIN", "http://127.0.0.1:5173"),
        agent_provider=provider,
        agent_model=model,
        agent_timeout_seconds=timeout_seconds,
        agent_deadline_seconds=deadline_seconds,
        agent_max_retries=max_retries,
        agent_api_key=_provider_key(provider),
    )
