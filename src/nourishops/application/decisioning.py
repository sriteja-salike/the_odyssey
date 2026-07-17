"""Provider-independent planning backend selection."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from nourishops.domain.engine import analyze
from nourishops.domain.model import Snapshot


class UnsupportedDecisionProblem(RuntimeError):
    pass


class InvalidSolverResult(RuntimeError):
    pass


class SolverRisk(BaseModel):
    model_config = ConfigDict(extra="allow")

    risk_id: str = Field(min_length=1)
    risk_type: str = Field(min_length=1)


class SolverAction(BaseModel):
    model_config = ConfigDict(extra="allow")

    action_id: str = Field(min_length=1)
    action_type: str = Field(min_length=1)
    requested_lb: str | int


class SolverActionEvaluation(BaseModel):
    model_config = ConfigDict(extra="allow")

    evaluated_action_id: str = Field(min_length=1)
    action: SolverAction
    cost_usd: str
    feasible: bool


class SolverRecommendation(BaseModel):
    model_config = ConfigDict(extra="allow")

    recommendation_id: str = Field(pattern=r"^REC-[A-Z0-9_-]+$")
    risk_id: str = Field(min_length=1)
    action_id: str = Field(min_length=1)
    evaluated_action_id: str = Field(min_length=1)
    requested_quantity_lb: int = Field(ge=0)
    cost_usd: str
    confidence: Literal["HIGH", "MEDIUM", "LOW", "ABSTAIN"]
    confidence_value: str
    inputs: dict[str, Any]


class SolverResultContract(BaseModel):
    """Minimum result shape every deterministic solver must satisfy."""

    model_config = ConfigDict(extra="allow")

    scenario_id: str = Field(min_length=1)
    decision_status: Literal["READY_FOR_REVIEW", "ABSTAINED", "NO_ACTION_REQUIRED"]
    risks: list[SolverRisk] = Field(default_factory=list)
    action_evaluations: list[SolverActionEvaluation] = Field(default_factory=list)
    recommended_action: SolverRecommendation | None = None

    @model_validator(mode="after")
    def recommendation_matches_status(self) -> SolverResultContract:
        if self.decision_status == "READY_FOR_REVIEW" and self.recommended_action is None:
            raise ValueError("READY_FOR_REVIEW requires a recommendation")
        if self.recommended_action is not None:
            if self.recommended_action.risk_id not in {item.risk_id for item in self.risks}:
                raise ValueError("Recommendation references an unknown risk")
            if self.recommended_action.evaluated_action_id not in {
                item.evaluated_action_id for item in self.action_evaluations
            }:
                raise ValueError("Recommendation references an unknown action evaluation")
        return self


def validate_solver_result(result: dict[str, Any], scenario_id: str) -> None:
    try:
        contract = SolverResultContract.model_validate(result)
    except ValidationError as exc:
        raise InvalidSolverResult("Solver returned an invalid result contract") from exc
    if contract.scenario_id != scenario_id:
        raise InvalidSolverResult("Solver changed the scenario ID")


@dataclass(frozen=True)
class SolverDescriptor:
    solver_id: str
    method: str
    version: str
    deterministic: bool
    problem_types: tuple[str, ...]
    capabilities: tuple[str, ...]
    limitations: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class DecisionSolver(Protocol):
    descriptor: SolverDescriptor

    def supports(self, problem_type: str, snapshot: Snapshot) -> bool: ...

    def solve(self, snapshot: Snapshot) -> dict[str, Any]: ...


class CatalogEnumerationSolver:
    """The frozen A-E engine: exact evaluation of an authored action catalog."""

    supported_risk_types = {
        "SHORTAGE",
        "SHORT_LIFE_CAPACITY",
        "DONATION_MISMATCH",
        "BUDGET_TRADEOFF",
        "DATA_QUALITY",
    }
    descriptor = SolverDescriptor(
        solver_id="catalog-enumeration",
        method="CATALOG_ENUMERATION",
        version="nourishops-engine/1.0.0",
        deterministic=True,
        problem_types=("SINGLE_ACTION_CATALOG",),
        capabilities=(
            "DECIMAL_FORECAST",
            "INVENTORY_PROJECTION",
            "EXPIRY_ALLOCATION",
            "HARD_CONSTRAINT_VALIDATION",
            "CATALOG_ACTION_RANKING",
            "SAFE_ABSTENTION",
        ),
        limitations=(
            "ONE_WAREHOUSE",
            "ONE_ACTION_RECOMMENDATION",
            "AUTHORED_CANDIDATES_ONLY",
            "NO_PORTFOLIO_OPTIMIZATION",
            "NO_ROUTE_OPTIMIZATION",
        ),
    )

    def supports(self, problem_type: str, snapshot: Snapshot) -> bool:
        return (
            problem_type in self.descriptor.problem_types
            and snapshot.primary_risk_type in self.supported_risk_types
        )

    def solve(self, snapshot: Snapshot) -> dict[str, Any]:
        return analyze(snapshot)


class SolverRegistry:
    def __init__(self, solvers: list[DecisionSolver] | None = None):
        self._solvers = solvers or [CatalogEnumerationSolver()]
        solver_ids = [solver.descriptor.solver_id for solver in self._solvers]
        if len(solver_ids) != len(set(solver_ids)):
            raise ValueError("Solver IDs must be unique")

    def select(
        self,
        snapshot: Snapshot,
        problem_type: str = "SINGLE_ACTION_CATALOG",
        solver_id: str | None = None,
    ) -> DecisionSolver:
        solver = next((
            item for item in self._solvers
            if (solver_id is None or item.descriptor.solver_id == solver_id)
            and item.supports(problem_type, snapshot)
        ), None)
        if solver is None:
            raise UnsupportedDecisionProblem(
                f"No registered solver supports {problem_type}/{snapshot.primary_risk_type}",
            )
        return solver

    def describe(self) -> list[dict[str, Any]]:
        return [solver.descriptor.as_dict() for solver in self._solvers]
