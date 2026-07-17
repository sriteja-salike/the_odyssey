"""Versioned, declarative scenario-package discovery."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from nourishops.settings import REPO_ROOT

ScenarioKey = Annotated[
    str,
    Field(pattern=r"^scenario_[a-z0-9][a-z0-9_-]*$", min_length=10, max_length=72),
]


class ScenarioInputDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    document_id: str = Field(pattern=r"^[a-z0-9_./-]+\.json$")
    source_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    source_kind: Literal[
        "CURRENT_KNOWLEDGE", "ORGANIZATIONAL_KNOWLEDGE", "SIMULATION_CONTROL"
    ]
    schema_name: str = Field(pattern=r"^[a-z0-9_.-]+\.schema\.json$")

    @model_validator(mode="after")
    def reject_parent_paths(self) -> ScenarioInputDefinition:
        if ".." in Path(self.document_id).parts:
            raise ValueError("Scenario input paths may not traverse parent directories")
        return self


class ScenarioOverlayDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    document_template: Literal["scenarios/{scenario_key}.json"]
    schema_name: str = Field(pattern=r"^[a-z0-9_.-]+\.schema\.json$")

    def document_id(self, scenario_key: str) -> str:
        return self.document_template.format(scenario_key=scenario_key)


class ScenarioPackageDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal["scenario-package/1.0.0"]
    package_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    package_version: str = Field(min_length=1)
    scenario_keys: list[ScenarioKey] = Field(min_length=1)
    problem_type: str = Field(pattern=r"^[A-Z][A-Z0-9_]*$")
    solver_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    normalizer_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    context_builder_id: str = Field(
        default="nourishops-decision-context-v1",
        pattern=r"^[a-z0-9][a-z0-9-]*$",
    )
    result_contract: str = Field(min_length=1)
    source_inputs: list[ScenarioInputDefinition] = Field(min_length=1)
    overlay: ScenarioOverlayDefinition

    @model_validator(mode="after")
    def unique_entries(self) -> ScenarioPackageDefinition:
        if len(self.scenario_keys) != len(set(self.scenario_keys)):
            raise ValueError("Scenario keys must be unique within a package")
        document_ids = [item.document_id for item in self.source_inputs]
        if len(document_ids) != len(set(document_ids)):
            raise ValueError("Input document IDs must be unique within a package")
        return self

    def document_ids(self, scenario_key: str) -> list[str]:
        if scenario_key not in self.scenario_keys:
            raise KeyError(scenario_key)
        return [
            *(item.document_id for item in self.source_inputs),
            self.overlay.document_id(scenario_key),
        ]


class ScenarioRegistry:
    def __init__(self, packages: list[ScenarioPackageDefinition]):
        self._packages = packages
        self._by_scenario: dict[str, ScenarioPackageDefinition] = {}
        for package in packages:
            for scenario_key in package.scenario_keys:
                if scenario_key in self._by_scenario:
                    raise ValueError(f"Scenario {scenario_key} is declared by multiple packages")
                self._by_scenario[scenario_key] = package

    @classmethod
    def load(cls, directory: Path | None = None) -> ScenarioRegistry:
        package_dir = directory or REPO_ROOT / "scenarios" / "packages"
        packages = [
            ScenarioPackageDefinition.model_validate(json.loads(path.read_text()))
            for path in sorted(package_dir.glob("*.json"))
        ]
        if not packages:
            raise RuntimeError(f"No scenario packages found in {package_dir}")
        return cls(packages)

    def get(self, scenario_key: str) -> ScenarioPackageDefinition:
        try:
            return self._by_scenario[scenario_key]
        except KeyError as exc:
            raise KeyError(f"No scenario package declares {scenario_key}") from exc

    def packages(self) -> list[ScenarioPackageDefinition]:
        return list(self._packages)

    def source_inputs(self) -> dict[str, ScenarioInputDefinition]:
        inputs: dict[str, ScenarioInputDefinition] = {}
        for package in self._packages:
            for item in package.source_inputs:
                existing = inputs.get(item.document_id)
                if existing is not None and existing != item:
                    raise ValueError(
                        f"Conflicting source definitions for {item.document_id}"
                    )
                inputs[item.document_id] = item
        return inputs
