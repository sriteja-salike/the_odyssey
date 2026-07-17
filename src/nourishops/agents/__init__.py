"""Agent adapters (05 §6.5).

Offline adapter (default): cached notice extraction + deterministic explanation
templates, no key. Optional live LLM: extract_notice / orchestrate / explain
ONLY. record_manager_decision is never an LLM-callable tool (00 §5). Live and
offline paths must return identical numbers and rankings.
"""

from nourishops.agents.contracts import AgentExplanation, AgentMetadata, AgentOutcome
from nourishops.agents.runtime import (
    ResilientDecisionAgent,
    ResilientDecisionReviewer,
    build_decision_agent,
    build_decision_reviewer,
)

__all__ = [
    "AgentExplanation",
    "AgentMetadata",
    "AgentOutcome",
    "ResilientDecisionAgent",
    "ResilientDecisionReviewer",
    "build_decision_agent",
    "build_decision_reviewer",
]
