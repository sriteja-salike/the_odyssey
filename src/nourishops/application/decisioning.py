"""Provider-independent planning backend selection."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Protocol

from nourishops.domain.engine import analyze
from nourishops.domain.model import Snapshot


class UnsupportedDecisionProblem(RuntimeError):
    pass


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

    def solve(self, snapshot: Snapshot) -> Any: ...


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

    def solve(self, snapshot: Snapshot) -> Any:
        return analyze(snapshot)


class SolverRegistry:
    def __init__(self, solvers: list[DecisionSolver] | None = None):
        self._solvers = solvers or [CatalogEnumerationSolver()]

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
