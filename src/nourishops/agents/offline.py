"""Deterministic explanation adapter used by the primary demo and all fallbacks."""
from __future__ import annotations

from typing import Any

from nourishops.agents.contracts import (
    AgentExplanation,
    AgentMetadata,
    AgentOutcome,
    WhyNotExplanation,
    grounded_primary_narrative,
    grounded_why_not_narrative,
)


class OfflineDecisionAgent:
    def __init__(self, metadata: AgentMetadata | None = None):
        self._metadata = metadata or AgentMetadata(
            requested_mode="offline",
            effective_mode="offline",
            status="verified",
        )

    def describe(self) -> AgentMetadata:
        return self._metadata

    def explain(self, package: dict[str, Any]) -> AgentOutcome:
        recommendation = package["recommendation"]
        selected = package["selected_action"]
        grounded = grounded_primary_narrative(package)
        grounded_why_not = grounded_why_not_narrative(package)

        why_not: list[WhyNotExplanation] = []
        for option in package["alternatives"][:2]:
            why_not.append(WhyNotExplanation(
                evaluated_action_id=option["evaluated_action_id"],
                explanation=grounded_why_not[option["evaluated_action_id"]],
            ))
        for option in package["rejected_options"][:2]:
            why_not.append(WhyNotExplanation(
                evaluated_action_id=option["evaluated_action_id"],
                explanation=grounded_why_not[option["evaluated_action_id"]],
            ))

        explanation = AgentExplanation(
            recommendation_id=recommendation["recommendation_id"],
            headline=selected["display_name"],
            why_now=grounded["why_now"],
            why_this_action=grounded["why_this_action"],
            uncertainty=grounded["uncertainty"],
            why_not=why_not,
            evidence_ids=selected["evidence_ids"] or [
                item["evidence_id"] for item in package["evidence"][:1]
            ],
            requires_human_approval=True,
            simulation_only=True,
        )
        return AgentOutcome(explanation=explanation, metadata=self._metadata)
