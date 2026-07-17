"""Safe live/offline agent selection and provider-failure fallback."""
from __future__ import annotations

from typing import Any

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from pydantic import ValidationError
from pydantic_ai import (
    ModelAPIError,
    ModelHTTPError,
    UnexpectedModelBehavior,
    UsageLimitExceeded,
)
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.providers.openai import OpenAIProvider

from nourishops.agents.contracts import (
    AgentAuthorityError,
    AgentMetadata,
    AgentOutcome,
    DecisionAgent,
)
from nourishops.agents.live import PydanticAIDecisionAgent
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.settings import Settings


def _caused_by_timeout(exc: BaseException) -> bool:
    current: BaseException | None = exc
    seen: set[int] = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, TimeoutError) or "timeout" in type(current).__name__.lower():
            return True
        current = current.__cause__ or current.__context__
    return False


class ResilientDecisionAgent:
    def __init__(
        self, requested_mode: str, primary: DecisionAgent | None,
        fallback: OfflineDecisionAgent,
    ):
        self.requested_mode = requested_mode
        self.primary = primary
        self.fallback = fallback

    def describe(self) -> AgentMetadata:
        if self.primary is not None:
            return self.primary.describe()
        return self.fallback.describe()

    def explain(self, package: dict[str, Any]) -> AgentOutcome:
        if self.primary is None:
            return self.fallback.explain(package)
        try:
            return self.primary.explain(package)
        except TimeoutError:
            code = "AGENT_TIMEOUT_FALLBACK"
        except AgentAuthorityError:
            code = "AGENT_AUTHORITY_VIOLATION_FALLBACK"
        except (ValidationError, UnexpectedModelBehavior):
            code = "AGENT_OUTPUT_INVALID_FALLBACK"
        except UsageLimitExceeded:
            code = "AGENT_USAGE_LIMIT_FALLBACK"
        except ModelHTTPError as exc:
            code = (
                "AGENT_TIMEOUT_FALLBACK"
                if exc.status_code in {408, 504}
                else "AGENT_PROVIDER_UNAVAILABLE_FALLBACK"
            )
        except ModelAPIError as exc:
            code = (
                "AGENT_TIMEOUT_FALLBACK"
                if _caused_by_timeout(exc)
                else "AGENT_PROVIDER_UNAVAILABLE_FALLBACK"
            )
        except Exception:
            code = "AGENT_INTERNAL_ERROR_FALLBACK"

        primary_metadata = self.primary.describe()
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            provider=primary_metadata.provider,
            model=primary_metadata.model,
            fallback_code=code,
        )
        return OfflineDecisionAgent(metadata).explain(package)


def build_decision_agent(settings: Settings) -> ResilientDecisionAgent:
    if settings.agent_mode != "live":
        return ResilientDecisionAgent(
            requested_mode="offline",
            primary=None,
            fallback=OfflineDecisionAgent(),
        )

    provider = settings.agent_provider
    model = settings.agent_model
    if provider not in {"anthropic", "openai"} or not model or not settings.agent_api_key:
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            provider=provider,
            model=model,
            fallback_code="AGENT_CONFIG_MISSING_FALLBACK",
        )
        return ResilientDecisionAgent(
            requested_mode="live",
            primary=None,
            fallback=OfflineDecisionAgent(metadata),
        )

    if ":" in model:
        model_provider, model = model.split(":", 1)
        if model_provider != provider or not model:
            metadata = AgentMetadata(
                requested_mode="live",
                effective_mode="offline_fallback",
                status="fallback",
                provider=provider,
                model=settings.agent_model,
                fallback_code="AGENT_CONFIG_MISMATCH_FALLBACK",
            )
            return ResilientDecisionAgent(
                requested_mode="live",
                primary=None,
                fallback=OfflineDecisionAgent(metadata),
            )

    if provider == "anthropic":
        client = AsyncAnthropic(
            api_key=settings.agent_api_key,
            max_retries=0,
        )
        provider_model = AnthropicModel(
            model,
            provider=AnthropicProvider(anthropic_client=client),
        )
    else:
        client = AsyncOpenAI(
            api_key=settings.agent_api_key,
            max_retries=0,
        )
        provider_model = OpenAIResponsesModel(
            model,
            provider=OpenAIProvider(openai_client=client),
        )

    live = PydanticAIDecisionAgent(
        model_name=model,
        provider=provider,
        request_timeout_seconds=settings.agent_timeout_seconds,
        deadline_seconds=settings.agent_deadline_seconds,
        max_retries=settings.agent_max_retries,
        model=provider_model,
    )
    return ResilientDecisionAgent(
        requested_mode="live",
        primary=live,
        fallback=OfflineDecisionAgent(),
    )
