from __future__ import annotations

from nourishops.application.context import build_scenario_context
from nourishops.application.loader import load_scenario
from nourishops.application.presentation import (
    build_decision_presentation,
    build_work_item,
)
from nourishops.application.service import NourishOpsService
from nourishops.domain.engine import analyze
from nourishops.persistence.postgres import jsonable
from tests.support import FIXTURES


def _context(letter: str) -> dict:
    scenario_key = f"scenario_{letter.lower()}"
    names = [
        "category_policies.json",
        "warehouse.json",
        "historical_weekly_category_flow.json",
        "planned_inbound.json",
        "candidate_actions.json",
        "pending_donation_offers.json",
        "evidence_records.json",
        f"scenarios/{scenario_key}.json",
    ]
    return build_scenario_context(
        {name: (FIXTURES / name).read_text() for name in names}, scenario_key,
    )


def _analysis(letter: str) -> dict:
    return jsonable(analyze(load_scenario(f"scenario_{letter.lower()}")))


def test_presentation_maps_shortage_without_scenario_copy() -> None:
    view = build_decision_presentation(_analysis("A"), _context("A"))
    assert view.archetype == "INBOUND_DISRUPTION"
    assert view.issue.title == "Protein coverage may fall below the safe minimum."
    assert "USDA" not in view.issue.title
    assert [item.formatted_value for item in view.visual.data] == [
        "2.3 weeks", "1.3 weeks", "1.3 weeks", "1.3 weeks",
    ]
    assert view.result_visual is not None
    assert view.result_visual.data[1].formatted_value == "3.0 weeks"


def test_presentation_maps_capacity_disposition_and_budget_anchors() -> None:
    capacity = build_decision_presentation(_analysis("B"), _context("B"))
    disposition = build_decision_presentation(_analysis("C"), _context("C"))
    budget = build_decision_presentation(_analysis("D"), _context("D"))

    assert [item.formatted_value for item in capacity.visual.data] == [
        "50,000 lb", "40,000 lb", "40,000 lb",
    ]
    assert [item.formatted_value for item in disposition.visual.data] == [
        "12,000 lb", "6,000 lb", "12,000 lb",
    ]
    assert [item.formatted_value for item in budget.visual.data] == [
        "$13,000", "$22,350", "$9,600",
    ]


def test_data_reconciliation_has_no_recommendation_or_approval_route() -> None:
    analysis = _analysis("E")
    context = _context("E")
    view = build_decision_presentation(analysis, context)
    item = build_work_item("scenario_e", analysis, context)

    assert view.archetype == "DATA_RECONCILIATION"
    assert view.recommendation is None
    assert len(view.visual.conflicts) == 4
    assert [conflict.field_label for conflict in view.visual.conflicts] == [
        "Shipment status", "Expected arrival", "Expected arrival", "Shipment quantity",
    ]
    assert view.visual.conflicts[0].message == "Shipment status is missing."
    assert view.visual.conflicts[-1].message == "Shipment quantity differs across sources."
    assert item.state == "INFORMATION_NEEDED"
    assert item.primary_action_label == "Review blocking records"


def test_work_item_uses_general_case_identity_and_verified_sources() -> None:
    item = build_work_item("scenario_b", _analysis("B"), _context("B"))
    assert item.schema_version == "work-item/1.0.0"
    assert item.case_key == "scenario_b"
    assert item.source_count > 0
    assert item.due_label == "Review by Aug 3"


def test_work_item_and_guided_shipment_answer_use_verified_inbounds() -> None:
    item = build_work_item("scenario_a", _analysis("A"), _context("A"))
    by_id = {inbound.inbound_id: inbound for inbound in item.expected_inbounds}

    delayed = by_id["INB-USDA-PROTEIN-104"]
    assert delayed.quantity_label == "10,000 lb"
    assert delayed.expected_date_label == "Aug 17"
    assert delayed.status_label == "Probable"

    answer = NourishOpsService._render_operations_answer(
        "SHIPMENTS", item.model_dump(mode="json"), [item.model_dump(mode="json")],
    )
    assert "10,000 lb of Protein from USDA · Probable" in answer
    assert "PO-4471" not in answer


def test_connection_answer_lists_verified_source_registry() -> None:
    item = build_work_item(
        "scenario_a",
        _analysis("A"),
        _context("A"),
        [{
            "source_id": "warehouse-wms",
            "display_name": "Warehouse management system",
            "source_kind": "CURRENT_KNOWLEDGE",
        }],
    )
    answer = NourishOpsService._render_operations_answer(
        "CONNECTIONS", None, [item.model_dump(mode="json")],
    )
    assert "Warehouse management system" in answer
    assert "read-only demo connections" in answer
