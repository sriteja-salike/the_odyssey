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
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from pydantic_ai.providers.openai import OpenAIProvider

from nourishops.agents.contracts import (
    AgentAuthorityError,
    AgentMetadata,
    AgentOutcome,
    DecisionAgent,
    DecisionReviewer,
    ReviewerOutcome,
)
from nourishops.agents.live import PydanticAIDecisionAgent
from nourishops.agents.offline import OfflineDecisionAgent
from nourishops.agents.operations import (
    OfflineOperationsAgent,
    PydanticAIOperationsAgent,
    ResilientOperationsAgent,
)
from nourishops.agents.reviewer import (
    OfflineDecisionReviewer,
    PydanticAIDecisionReviewer,
)
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


class ResilientDecisionReviewer:
    def __init__(
        self,
        primary: DecisionReviewer | None,
        fallback: OfflineDecisionReviewer,
    ):
        self.primary = primary
        self.fallback = fallback

    def describe(self) -> AgentMetadata:
        if self.primary is not None:
            return self.primary.describe()
        return self.fallback.describe()

    def review(self, package, explanation) -> ReviewerOutcome:
        if self.primary is None:
            return self.fallback.review(package, explanation)
        try:
            return self.primary.review(package, explanation)
        except TimeoutError:
            code = "REVIEWER_TIMEOUT_FALLBACK"
        except AgentAuthorityError:
            code = "REVIEWER_AUTHORITY_VIOLATION_FALLBACK"
        except (ValidationError, UnexpectedModelBehavior):
            code = "REVIEWER_OUTPUT_INVALID_FALLBACK"
        except UsageLimitExceeded:
            code = "REVIEWER_USAGE_LIMIT_FALLBACK"
        except ModelHTTPError as exc:
            code = (
                "REVIEWER_TIMEOUT_FALLBACK"
                if exc.status_code in {408, 504}
                else "REVIEWER_PROVIDER_UNAVAILABLE_FALLBACK"
            )
        except ModelAPIError as exc:
            code = (
                "REVIEWER_TIMEOUT_FALLBACK"
                if _caused_by_timeout(exc)
                else "REVIEWER_PROVIDER_UNAVAILABLE_FALLBACK"
            )
        except Exception:
            code = "REVIEWER_INTERNAL_ERROR_FALLBACK"

        primary_metadata = self.primary.describe()
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            role="INDEPENDENT_REVIEWER",
            provider=primary_metadata.provider,
            model=primary_metadata.model,
            prompt_version="reviewer-system/1.0.0",
            output_schema_version="reviewer-output/1.0.0",
            tool_contract_version="reviewer-tools/1.0.0",
            fallback_code=code,
        )
        return OfflineDecisionReviewer(metadata).review(package, explanation)


def _provider_model(provider: str, model: str, api_key: str) -> Model:
    if provider == "anthropic":
        anthropic_client = AsyncAnthropic(api_key=api_key, max_retries=0)
        return AnthropicModel(
            model,
            provider=AnthropicProvider(anthropic_client=anthropic_client),
        )
    openai_client = AsyncOpenAI(api_key=api_key, max_retries=0)
    return OpenAIResponsesModel(
        model,
        provider=OpenAIProvider(openai_client=openai_client),
    )


def _live_configuration(settings: Settings) -> tuple[str, str, str] | None:
    provider = settings.agent_provider
    model = settings.agent_model
    api_key = settings.agent_api_key
    if provider not in {"anthropic", "openai"} or not model or not api_key:
        return None
    if ":" in model:
        model_provider, model = model.split(":", 1)
        if model_provider != provider or not model:
            return None
    return provider, model, api_key


def build_decision_agent(settings: Settings) -> ResilientDecisionAgent:
    if settings.agent_mode != "live":
        return ResilientDecisionAgent(
            requested_mode="offline",
            primary=None,
            fallback=OfflineDecisionAgent(),
        )

    provider = settings.agent_provider
    model = settings.agent_model
    configuration = _live_configuration(settings)
    if configuration is None:
        model_prefix = model.split(":", 1)[0] if model and ":" in model else None
        fallback_code = (
            "AGENT_CONFIG_MISMATCH_FALLBACK"
            if model_prefix is not None and model_prefix != provider
            else "AGENT_CONFIG_MISSING_FALLBACK"
        )
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            provider=provider,
            model=model,
            fallback_code=fallback_code,
        )
        return ResilientDecisionAgent(
            requested_mode="live",
            primary=None,
            fallback=OfflineDecisionAgent(metadata),
        )

    provider, model, api_key = configuration
    provider_model = _provider_model(provider, model, api_key)

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


def build_decision_reviewer(settings: Settings) -> ResilientDecisionReviewer:
    if settings.agent_mode != "live":
        return ResilientDecisionReviewer(
            primary=None,
            fallback=OfflineDecisionReviewer(),
        )

    configuration = _live_configuration(settings)
    if configuration is None:
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            role="INDEPENDENT_REVIEWER",
            provider=settings.agent_provider,
            model=settings.agent_model,
            prompt_version="reviewer-system/1.0.0",
            output_schema_version="reviewer-output/1.0.0",
            tool_contract_version="reviewer-tools/1.0.0",
            fallback_code="REVIEWER_CONFIG_MISSING_FALLBACK",
        )
        return ResilientDecisionReviewer(
            primary=None,
            fallback=OfflineDecisionReviewer(metadata),
        )

    provider, model, api_key = configuration
    primary = PydanticAIDecisionReviewer(
        model_name=model,
        provider=provider,
        request_timeout_seconds=settings.agent_timeout_seconds,
        deadline_seconds=settings.agent_deadline_seconds,
        model=_provider_model(provider, model, api_key),
    )
    return ResilientDecisionReviewer(
        primary=primary,
        fallback=OfflineDecisionReviewer(),
    )


def build_operations_agent(settings: Settings) -> ResilientOperationsAgent:
    """Build the read-only conversation router on the configured provider path."""
    if settings.agent_mode != "live":
        return ResilientOperationsAgent(
            primary=None,
            fallback=OfflineOperationsAgent(),
        )

    configuration = _live_configuration(settings)
    if configuration is None:
        metadata = AgentMetadata(
            requested_mode="live",
            effective_mode="offline_fallback",
            status="fallback",
            role="OPERATIONS_ASSISTANT",
            provider=settings.agent_provider,
            model=settings.agent_model,
            prompt_version="operations-agent/1.0.0",
            output_schema_version="operations-agent-output/1.0.0",
            tool_contract_version="operations-agent-tools/1.0.0",
            fallback_code="OPERATIONS_AGENT_CONFIG_MISSING_FALLBACK",
        )
        return ResilientOperationsAgent(
            primary=None,
            fallback=OfflineOperationsAgent(metadata),
        )

    provider, model, api_key = configuration
    return ResilientOperationsAgent(
        primary=PydanticAIOperationsAgent(
            model_name=model,
            provider=provider,
            request_timeout_seconds=settings.agent_timeout_seconds,
            deadline_seconds=settings.agent_deadline_seconds,
            model=_provider_model(provider, model, api_key),
        ),
        fallback=OfflineOperationsAgent(),
    )
