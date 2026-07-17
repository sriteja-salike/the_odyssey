"""User-facing decision presentation derived only from verified solver output.

This module is intentionally semantic rather than scenario-aware.  New scenario
packages opt into one of the supported risk archetypes and receive the same
plain-language presentation contract without adding frontend conditionals.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PresentationIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    title: str
    summary: str


class PresentationRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    quantity_label: str
    cost_label: str
    timing_label: str | None
    effect: str
    caution: str | None = None


class VisualDatum(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    value: str
    formatted_value: str
    tone: Literal["attention", "positive", "neutral"] = "neutral"


class ConflictDatum(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field_label: str
    message: str
    sources: list[str]
    observed_values: list[str]


class DecisionVisualPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["coverage", "capacity", "mismatch", "budget", "conflict"]
    title: str
    summary: str
    unit: Literal["weeks", "lb", "usd", "records"]
    data: list[VisualDatum] = Field(default_factory=list)
    reference_value: str | None = None
    reference_label: str | None = None
    conflicts: list[ConflictDatum] = Field(default_factory=list)


class PresentationFact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    value: str


class DecisionPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["decision-presentation/1.0.0"]
    archetype: Literal[
        "INBOUND_DISRUPTION",
        "PERISHABLE_CAPACITY",
        "DONATION_DISPOSITION",
        "RESOURCE_TRADEOFF",
        "DATA_RECONCILIATION",
    ]
    issue: PresentationIssue
    recommendation: PresentationRecommendation | None
    visual: DecisionVisualPresentation
    result_visual: DecisionVisualPresentation | None
    detail_facts: list[PresentationFact]
    suggested_questions: list[str]


class WorkItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["work-item/1.0.0"]
    work_item_id: str
    case_key: str
    state: Literal["NEEDS_REVIEW", "INFORMATION_NEEDED", "NO_ACTION_REQUIRED"]
    urgency: Literal["NOW", "SOON", "ROUTINE"]
    due_label: str | None
    source_count: int
    presentation: DecisionPresentation
    primary_action_label: str
    synthetic: Literal[True]


def _number(value: Any, default: str = "0") -> Decimal:
    return Decimal(str(default if value is None else value))


def _whole(value: Any) -> int:
    return int(_number(value))


def _lb(value: Any) -> str:
    return f"{_whole(value):,} lb"


def _usd(value: Any) -> str:
    amount = _number(value)
    cents = f"${amount:,.2f}"
    return cents.removesuffix(".00")


def _weeks(value: Any) -> str:
    return f"{_number(value):.1f} weeks"


def _date(value: str | None) -> str | None:
    if not value:
        return None
    parsed = date.fromisoformat(value[:10])
    return f"{parsed.strftime('%b')} {parsed.day}"


def _humanize(value: str | None) -> str:
    if not value:
        return "Inventory"
    return value.replace("_", " ").lower().title()


def _field_label(value: str) -> str:
    labels = {
        "expected_week_start": "Expected arrival",
        "gross_quantity_lb": "Shipment quantity",
        "status": "Shipment status",
        "body": "Source note",
    }
    return labels.get(value, _humanize(value))


def _display_observed(value: Any, field: str) -> str:
    if value is None:
        return "Missing"
    if field == "expected_week_start":
        return _date(str(value)) or "Missing"
    if field.endswith("_lb"):
        return _lb(value)
    return str(value)


def _conflict_message(item: dict[str, Any], field: str) -> str:
    if item.get("message"):
        return str(item["message"])
    values = item.get("observed_values") or []
    label = _field_label(field)
    if not values or all(value is None for value in values):
        return f"{label} is missing."
    if len(values) > 1:
        return f"{label} differs across sources."
    return f"{label} must be checked."


def _primary_risk(analysis: dict[str, Any]) -> dict[str, Any]:
    risks = analysis.get("risks") or []
    return next((item for item in risks if item.get("is_primary")), risks[0] if risks else {})


def _selected_action(
    analysis: dict[str, Any], context: dict[str, Any],
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    recommendation = analysis.get("recommended_action")
    if recommendation is None:
        return None, None
    evaluation = next(
        (
            item for item in analysis.get("action_evaluations") or []
            if item["evaluated_action_id"] == recommendation["evaluated_action_id"]
        ),
        None,
    )
    if evaluation is None:
        return recommendation, None
    action_id = evaluation["action"]["action_id"]
    catalog: dict[str, Any] = next(
        (
            item for item in context["organizational_knowledge"]["action_catalog"]
            if item["action_id"] == action_id
        ),
        {},
    )
    return recommendation, {**evaluation, "catalog": catalog}


def _action_title(action_type: str, category: str, quantity: Any) -> str:
    amount = _lb(quantity)
    category_name = category.lower()
    return {
        "PURCHASE": f"Purchase {amount} of {category_name}",
        "REQUEST_TRANSFER": f"Request a transfer of {amount} of {category_name}",
        "TARGETED_DONOR_REQUEST": f"Request {amount} of {category_name} from donors",
        "PARTIAL_ACCEPT": f"Accept {amount} of the {category_name} offer",
        "ACCEPT_DONATION": f"Accept the {amount} {category_name} offer",
        "REDIRECT_DONATION": f"Redirect {amount} of {category_name} to a partner food bank",
        "DECLINE_DONATION": f"Decline the {category_name} offer",
    }.get(action_type, f"Apply the {category_name} response")


def _recommendation(
    selected: dict[str, Any] | None,
    category: str,
    effect: str,
    timing: str | None,
    caution: str | None = None,
) -> PresentationRecommendation | None:
    if selected is None:
        return None
    action = selected["action"]
    return PresentationRecommendation(
        title=_action_title(action["action_type"], category, action["requested_lb"]),
        quantity_label=_lb(action["requested_lb"]),
        cost_label=_usd(selected["cost_usd"]),
        timing_label=timing,
        effect=effect,
        caution=caution,
    )


def _datum(
    label: str, value: Any, unit: Literal["weeks", "lb", "usd"],
    tone: Literal["attention", "positive", "neutral"] = "neutral",
) -> VisualDatum:
    formatter = {"weeks": _weeks, "lb": _lb, "usd": _usd}[unit]
    return VisualDatum(
        label=label,
        value=str(value),
        formatted_value=formatter(value),
        tone=tone,
    )


def build_decision_presentation(
    analysis: dict[str, Any], context: dict[str, Any],
) -> DecisionPresentation:
    risk = _primary_risk(analysis)
    risk_type = risk.get("risk_type", "DATA_QUALITY")
    category = _humanize(risk.get("category_id"))
    recommendation, selected = _selected_action(analysis, context)

    if risk_type == "SHORTAGE":
        minimum = risk.get("minimum_weeks_of_supply", risk.get("min_wos"))
        before = risk["conservative_end_wos_at_breach"]
        target = risk.get("target_weeks_of_supply", risk.get("target_wos"))
        breach_date = _date(risk.get("first_breach_week_start"))
        projections = analysis.get("projections", {})
        baseline = projections.get("baseline", {}).get(risk["category_id"], {})
        weekly = projections.get("conservative", {}).get(risk["category_id"], [])
        if not weekly:
            weekly = baseline.get("conservative") or []
        data = [
            _datum(_date(item.get("week_start")) or f"Week {index + 1}", item["end_wos"], "weeks",
                   "attention" if item.get("week_start") == risk.get("first_breach_week_start") else "neutral")
            for index, item in enumerate(weekly)
        ]
        after_values = projections.get("recommended_action_after", {}).get(
            risk["category_id"], {},
        ).get("conservative_end_wos", [])
        breach_index = max(int(risk.get("first_breach_week_index", 1)) - 1, 0)
        after = after_values[breach_index] if len(after_values) > breach_index else target
        effect = f"Raises {category.lower()} coverage from {_weeks(before)} to {_weeks(after)}."
        visual_summary = (
            f"Coverage reaches {_weeks(before)} around {breach_date}, below the {_weeks(minimum)} minimum."
        )
        return DecisionPresentation(
            schema_version="decision-presentation/1.0.0",
            archetype="INBOUND_DISRUPTION",
            issue=PresentationIssue(
                label="Needs attention",
                title=f"{category} coverage may fall below the safe minimum.",
                summary=visual_summary,
            ),
            recommendation=_recommendation(selected, category, effect, "Order this week"),
            visual=DecisionVisualPresentation(
                kind="coverage", title=f"Four-week {category.lower()} coverage",
                summary=visual_summary, unit="weeks", data=data,
                reference_value=str(minimum), reference_label=f"Minimum {_weeks(minimum)}",
            ),
            result_visual=DecisionVisualPresentation(
                kind="coverage", title="What the simulation changed", summary=effect,
                unit="weeks", data=[
                    _datum("Before", before, "weeks", "attention"),
                    _datum("After", after, "weeks", "positive"),
                ], reference_value=str(minimum), reference_label=f"Minimum {_weeks(minimum)}",
            ),
            detail_facts=[
                PresentationFact(label="Category", value=category),
                PresentationFact(label="Expected breach", value=breach_date or "Within four weeks"),
                PresentationFact(label="Target coverage", value=_weeks(target)),
            ],
            suggested_questions=[
                "Why is this urgent?", "What information was checked?", "What other responses are feasible?",
            ],
        )

    if risk_type == "SHORT_LIFE_CAPACITY":
        peak = risk.get("full_accept_peak_refrigerated_lb", risk.get("full_accept_peak_lb"))
        capacity = risk.get("refrigerated_capacity_lb", risk.get("capacity_lb"))
        overflow = risk["overflow_lb"]
        recommended_peak = (
            analysis.get("projections", {}).get("recommended_action_after", {})
            .get("maximum_refrigerated_peak_lb", capacity)
        )
        summary = (
            f"Accepting the full offer would use {_lb(peak)}—{_lb(overflow)} above the {_lb(capacity)} limit."
        )
        effect = "Uses available refrigerated space without overflow or added spoilage."
        data = [
            _datum("Accept all", peak, "lb", "attention"),
            _datum("Capacity", capacity, "lb"),
            _datum("Recommended", recommended_peak, "lb", "positive"),
        ]
        return DecisionPresentation(
            schema_version="decision-presentation/1.0.0", archetype="PERISHABLE_CAPACITY",
            issue=PresentationIssue(
                label="Needs attention", title="The full produce offer will not fit in refrigerated storage.",
                summary=summary,
            ),
            recommendation=_recommendation(selected, category, effect, "Respond this week"),
            visual=DecisionVisualPresentation(
                kind="capacity", title="Refrigerated storage", summary=summary, unit="lb",
                data=data, reference_value=str(capacity), reference_label=f"Capacity {_lb(capacity)}",
            ),
            result_visual=DecisionVisualPresentation(
                kind="capacity", title="What the simulation changed", summary=effect, unit="lb",
                data=[_datum("Accept all", peak, "lb", "attention"), _datum("Approved", recommended_peak, "lb", "positive")],
                reference_value=str(capacity), reference_label=f"Capacity {_lb(capacity)}",
            ),
            detail_facts=[
                PresentationFact(label="Offer", value=_lb(risk.get("expected_usable_offer_lb", 0))),
                PresentationFact(label="Potential spoilage", value=_lb(risk.get("full_accept_expiry_spoilage_lb", risk.get("full_accept_spoilage_lb", 0)))),
                PresentationFact(label="Storage limit", value=_lb(capacity)),
            ],
            suggested_questions=["Why not accept the full offer?", "What information was checked?", "What other responses are feasible?"],
        )

    if risk_type == "DONATION_MISMATCH":
        offered = risk["offered_gross_lb"]
        target = risk.get("offered_category_target_inventory_lb", risk.get("offered_target_inventory_lb"))
        redirected = recommendation.get("expected_useful_disposition_lb", offered) if recommendation else offered
        summary = (
            f"The {_lb(offered)} offer is larger than the {_lb(target)} local target while essential categories remain below target."
        )
        effect = f"Redirects all {_lb(redirected)} to a partner food bank that can use it."
        return DecisionPresentation(
            schema_version="decision-presentation/1.0.0", archetype="DONATION_DISPOSITION",
            issue=PresentationIssue(label="Needs attention", title="This donation is not the best fit for local needs.", summary=summary),
            recommendation=_recommendation(selected, category, effect, "Coordinate this week"),
            visual=DecisionVisualPresentation(
                kind="mismatch", title="Offer compared with local need", summary=summary, unit="lb",
                data=[
                    _datum("Offered", offered, "lb", "attention"),
                    _datum("Local target", target, "lb"),
                    _datum("Useful redirect", redirected, "lb", "positive"),
                ],
            ),
            result_visual=DecisionVisualPresentation(
                kind="mismatch", title="What the simulation changed", summary=effect, unit="lb",
                data=[_datum("Offered", offered, "lb", "attention"), _datum("Redirected", redirected, "lb", "positive")],
            ),
            detail_facts=[
                PresentationFact(label="Offer", value=_lb(offered)),
                PresentationFact(label="Local target", value=_lb(target)),
                PresentationFact(label="Essential categories below target", value=str(len(risk.get("essential_categories_below_target", risk.get("essential_below_target")) or []))),
            ],
            suggested_questions=["Why is a redirect better?", "Which local needs were considered?", "What other responses are feasible?"],
        )

    if risk_type == "BUDGET_TRADEOFF":
        available = risk["remaining_budget_usd"]
        combined = risk["required_combined_cost_usd"]
        shortfall = risk["budget_shortfall_usd"]
        cost = selected["cost_usd"] if selected else 0
        remaining = analysis.get("projections", {}).get("recommended_action_after", {}).get(
            "remaining_budget_usd", _number(available) - _number(cost),
        )
        selected_category = _humanize(selected["action"].get("category_id")) if selected else "earlier"
        summary = (
            f"{_usd(available)} is available; addressing both shortages would require {_usd(combined)}, a {_usd(shortfall)} shortfall."
        )
        effect = f"Addresses the earlier {selected_category.lower()} shortage and leaves {_usd(remaining)} available."
        caution = "A second category risk remains open and still needs follow-up."
        return DecisionPresentation(
            schema_version="decision-presentation/1.0.0", archetype="RESOURCE_TRADEOFF",
            issue=PresentationIssue(label="Needs attention", title="The current budget cannot cover both shortages.", summary=summary),
            recommendation=_recommendation(selected, selected_category, effect, "Order this week", caution),
            visual=DecisionVisualPresentation(
                kind="budget", title="Budget tradeoff", summary=summary, unit="usd",
                data=[
                    _datum("Available", available, "usd"),
                    _datum("Both needs", combined, "usd", "attention"),
                    _datum("Recommended", cost, "usd", "positive"),
                ], reference_value=str(available), reference_label=f"Available {_usd(available)}",
            ),
            result_visual=DecisionVisualPresentation(
                kind="budget", title="What the simulation changed", summary=effect, unit="usd",
                data=[
                    _datum("Available", available, "usd"),
                    _datum("Approved", cost, "usd", "positive"),
                    _datum("Remaining", remaining, "usd"),
                ], reference_value=str(available), reference_label=f"Available {_usd(available)}",
            ),
            detail_facts=[
                PresentationFact(label="Available budget", value=_usd(available)),
                PresentationFact(label="Combined need", value=_usd(combined)),
                PresentationFact(label="Remaining after response", value=_usd(remaining)),
            ],
            suggested_questions=["Why address this shortage first?", "What risk remains open?", "What other responses are feasible?"],
        )

    blockers = analysis.get("blocking_issues") or []
    conflicts = []
    for item in blockers:
        if item.get("severity") != "ERROR":
            continue
        field = item.get("field_name") or item.get("field") or "record"
        conflicts.append(ConflictDatum(
            field_label=_field_label(field),
            message=_conflict_message(item, field),
            sources=[str(value) for value in item.get("record_ids") or []],
            observed_values=[
                _display_observed(value, field)
                for value in item.get("observed_values") or []
            ],
        ))
    summary = "Arrival timing, shipment status, or quantity do not agree across the available records."
    return DecisionPresentation(
        schema_version="decision-presentation/1.0.0", archetype="DATA_RECONCILIATION",
        issue=PresentationIssue(
            label="Action paused", title="The records conflict, so a safe recommendation is not possible.", summary=summary,
        ),
        recommendation=None,
        visual=DecisionVisualPresentation(
            kind="conflict", title="Records that need attention", summary=summary,
            unit="records", conflicts=conflicts,
        ),
        result_visual=None,
        detail_facts=[PresentationFact(label="Blocking record issues", value=str(len(conflicts)))],
        suggested_questions=["Which records conflict?", "What needs to be corrected?", "Why did the system stop?"],
    )


def build_work_item(
    scenario_key: str, analysis: dict[str, Any], context: dict[str, Any],
) -> WorkItem:
    presentation = build_decision_presentation(analysis, context)
    status = analysis["decision_status"]
    state: Literal["NEEDS_REVIEW", "INFORMATION_NEEDED", "NO_ACTION_REQUIRED"] = (
        "NEEDS_REVIEW" if status == "READY_FOR_REVIEW"
        else "INFORMATION_NEEDED" if status == "ABSTAINED"
        else "NO_ACTION_REQUIRED"
    )
    primary = _primary_risk(analysis)
    due = _date(primary.get("first_breach_week_start"))
    incidents = context.get("incidents") or []
    if due is None:
        due = next((_date(item.get("response_deadline")) for item in incidents if item.get("response_deadline")), None)
    source_count = len(context.get("organizational_knowledge", {}).get("active_evidence") or [])
    return WorkItem(
        schema_version="work-item/1.0.0",
        work_item_id=context["scenario"]["scenario_id"],
        case_key=scenario_key,
        state=state,
        urgency="NOW" if state == "INFORMATION_NEEDED" or primary.get("priority_score") == "100" else "SOON",
        due_label=f"Review by {due}" if due else None,
        source_count=source_count,
        presentation=presentation,
        primary_action_label=(
            "Ask agent to review" if state == "NEEDS_REVIEW"
            else "Review blocking records" if state == "INFORMATION_NEEDED"
            else "View details"
        ),
        synthetic=True,
    )
