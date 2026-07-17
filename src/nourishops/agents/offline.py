"""Deterministic explanation adapter used by the primary demo and all fallbacks."""
from __future__ import annotations

from typing import Any

from nourishops.agents.contracts import (
    AgentExplanation,
    AgentMetadata,
    AgentOutcome,
    WhyNotExplanation,
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
        risk = package["primary_risk"]

        why_not: list[WhyNotExplanation] = []
        for option in package["alternatives"][:2]:
            why_not.append(WhyNotExplanation(
                evaluated_action_id=option["evaluated_action_id"],
                explanation=(
                    "This option is feasible but ranks below the selected catalog action "
                    "under the verified scoring rules."
                ),
            ))
        for option in package["rejected_options"][:2]:
            failures = ", ".join(option["failed_constraints"]) or "a hard constraint"
            why_not.append(WhyNotExplanation(
                evaluated_action_id=option["evaluated_action_id"],
                explanation=f"This option is not feasible because it fails {failures}.",
            ))

        confidence = recommendation["confidence"]
        explanation = AgentExplanation(
            recommendation_id=recommendation["recommendation_id"],
            headline=selected["display_name"],
            why_now=(
                f"{risk['risk_type'].replace('_', ' ').title()} is the highest-priority "
                "verified risk in this scenario."
            ),
            why_this_action=(
                "The selected plan is the highest-ranked feasible catalog action under the "
                "verified rules."
            ),
            uncertainty=(
                f"Confidence is {confidence['label']}. The result is simulated and still "
                "requires manager approval."
            ),
            why_not=why_not,
            evidence_ids=selected["evidence_ids"] or [
                item["evidence_id"] for item in package["evidence"][:1]
            ],
            requires_human_approval=True,
            simulation_only=True,
        )
        return AgentOutcome(explanation=explanation, metadata=self._metadata)
