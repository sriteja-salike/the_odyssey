"""PostgreSQL integration snapshots and append-only application records."""
from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, TypeVar, cast
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from nourishops.application.context import build_scenario_context
from nourishops.application.loader import FIXTURES, load_scenario_from_documents
from nourishops.application.scenario_registry import (
    ScenarioPackageDefinition,
    ScenarioRegistry,
)

MIGRATIONS = Path(__file__).with_name("migrations")
T = TypeVar("T")

DEFAULT_SCENARIO_REGISTRY = ScenarioRegistry.load()
SOURCE_MAP = {
    document_id: (item.source_id, item.display_name, item.source_kind)
    for document_id, item in DEFAULT_SCENARIO_REGISTRY.source_inputs().items()
}


def jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    if is_dataclass(value):
        return jsonable(asdict(cast(Any, value)))
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    return value


def canonical_json(value: Any) -> str:
    return json.dumps(jsonable(value), sort_keys=True, separators=(",", ":"))


def sha256(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def utcnow() -> datetime:
    return datetime.now(UTC)


class IdempotencyKeyReused(RuntimeError):
    """The same route/key was submitted with a different canonical request."""


class PostgresStore:
    def __init__(
        self, database_url: str, scenario_registry: ScenarioRegistry | None = None,
    ):
        self.database_url = database_url
        self.scenario_registry = scenario_registry or DEFAULT_SCENARIO_REGISTRY

    @staticmethod
    def _require_supported_normalizer(package: ScenarioPackageDefinition) -> None:
        if package.normalizer_id != "nourishops-snapshot-v1":
            raise RuntimeError(
                f"Scenario package {package.package_id} requires unsupported normalizer "
                f"{package.normalizer_id}",
            )

    def _normalize_scenario(
        self, documents: dict[str, str], scenario_key: str,
        package: ScenarioPackageDefinition,
    ):
        self._require_supported_normalizer(package)
        return load_scenario_from_documents(
            documents,
            scenario_key,
            overlay_schema_name=package.overlay.schema_name,
        )

    def connect(self):
        return psycopg.connect(self.database_url, row_factory=dict_row)

    @contextmanager
    def connection_scope(self, connection=None) -> Iterator[Any]:
        """Reuse an outer transaction or own a short transaction when none exists."""
        if connection is not None:
            yield connection
            return
        with self.connect() as owned:
            yield owned

    def execute_idempotent(
        self,
        route: str,
        idempotency_key: str,
        request_payload: Any,
        operation: Callable[[Any], T],
    ) -> T:
        """Run a write and persist its exact response in one serialized transaction."""
        request_sha256 = sha256(request_payload)
        lock_identity = canonical_json([route, idempotency_key])
        with self.connect() as connection:
            connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                (lock_identity,),
            )
            existing = connection.execute(
                """SELECT request_sha256, response
                   FROM nourishops_app.idempotency_records
                   WHERE route = %s AND idempotency_key = %s""",
                (route, idempotency_key),
            ).fetchone()
            if existing is not None:
                if existing["request_sha256"] != request_sha256:
                    raise IdempotencyKeyReused(idempotency_key)
                return cast(T, existing["response"])

            response = operation(connection)
            connection.execute(
                """INSERT INTO nourishops_app.idempotency_records
                   (route, idempotency_key, request_sha256, response, created_at_utc)
                   VALUES (%s, %s, %s, %s, %s)""",
                (
                    route,
                    idempotency_key,
                    request_sha256,
                    Jsonb(jsonable(response)),
                    utcnow(),
                ),
            )
            return response

    @staticmethod
    def lock_run(connection, run_id: str) -> None:
        """Serialize all writes to one run, even when request keys differ."""
        connection.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
            (f"nourishops-run:{run_id}",),
        )

    def migrate(self) -> None:
        with self.connect() as connection:
            for migration in sorted(MIGRATIONS.glob("*.sql")):
                connection.execute(migration.read_text())

    def seed_integrations(self) -> None:
        """Snapshot committed synthetic fixtures as if connector syncs produced them."""
        observed_at = datetime(2026, 8, 3, 13, 0, tzinfo=UTC)
        documents = {
            document_id: (item.source_id, item.display_name, item.source_kind)
            for document_id, item in self.scenario_registry.source_inputs().items()
        }
        for package in self.scenario_registry.packages():
            for scenario_key in package.scenario_keys:
                documents[package.overlay.document_id(scenario_key)] = (
                    "scenario-simulator", "Scenario event simulator", "SIMULATION_CONTROL",
                )

        with self.connect() as connection:
            for document_id, (source_id, display_name, source_kind) in documents.items():
                connection.execute(
                    """INSERT INTO integration.sources
                       (source_id, display_name, source_kind, refresh_mode)
                       VALUES (%s, %s, %s, 'SEEDED_SNAPSHOT')
                       ON CONFLICT (source_id) DO NOTHING""",
                    (source_id, display_name, source_kind),
                )
                payload = (FIXTURES / document_id).read_text()
                parsed = json.loads(payload)
                version = str(parsed.get("data_version") or parsed.get("scenario_version") or "1")
                digest = hashlib.sha256(payload.encode()).hexdigest()
                connection.execute(
                    """INSERT INTO integration.snapshots
                       (source_id, document_id, payload_text, source_version,
                        observed_at_utc, payload_sha256)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (source_id, document_id, source_version)
                       DO NOTHING""",
                    (source_id, document_id, payload, version, observed_at, digest),
                )

    def _scenario_names(self, scenario_key: str) -> list[str]:
        return self.scenario_registry.get(scenario_key).document_ids(scenario_key)

    def load_scenario(self, scenario_key: str):
        package = self.scenario_registry.get(scenario_key)
        names = self._scenario_names(scenario_key)
        documents = self._latest_documents(names)
        return self._normalize_scenario(documents, scenario_key, package)

    def scenario_context(self, scenario_key: str) -> dict[str, Any]:
        names = self._scenario_names(scenario_key)
        return jsonable(build_scenario_context(self._latest_documents(names), scenario_key))

    def load_run_scenario(self, run_id: str, connection=None):
        run, documents = self._run_documents(run_id, connection)
        package = self._package_for_run(run)
        return self._normalize_scenario(documents, run["scenario_key"], package)

    def run_context(self, run_id: str, connection=None) -> dict[str, Any]:
        run, documents = self._run_documents(run_id, connection)
        return jsonable(build_scenario_context(documents, run["scenario_key"]))

    def _package_for_run(self, run: dict[str, Any]) -> ScenarioPackageDefinition:
        package = self.scenario_registry.get(run["scenario_key"])
        pinned = run.get("scenario_package_id")
        pinned_version = run.get("scenario_package_version")
        if pinned is not None and (
            pinned != package.package_id or pinned_version != package.package_version
        ):
            raise RuntimeError("The run's pinned scenario package is unavailable")
        return package

    def list_scenarios(self) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """SELECT DISTINCT ON (document_id) document_id, payload_text
                   FROM integration.snapshots
                   WHERE document_id LIKE 'scenarios/scenario_%.json'
                   ORDER BY document_id, observed_at_utc DESC"""
            ).fetchall()
        scenarios = []
        for row in rows:
            document_id = row["document_id"]
            scenario = json.loads(row["payload_text"], parse_float=Decimal)
            scenario_key = Path(document_id).stem
            package = self.scenario_registry.get(scenario_key)
            parts = scenario["scenario_id"].split("-")
            short_code = parts[1] if len(parts) > 1 else scenario_key.removeprefix("scenario_")
            scenarios.append({
                "key": scenario_key,
                "letter": short_code,
                "short_code": short_code,
                "name": scenario["display_name"],
                "scenario_id": scenario["scenario_id"],
                "scenario_version": scenario["scenario_version"],
                "primary_risk_type": scenario["primary_risk_type"],
                "scenario_package_id": package.package_id,
                "scenario_package_version": package.package_version,
                "problem_type": package.problem_type,
                "solver_id": package.solver_id,
                "backend_status": "READY",
                "ui_status": "LEGACY_GOLDEN_RENDERER",
            })
        return jsonable(scenarios)

    def _latest_documents(self, names: list[str]) -> dict[str, str]:
        with self.connect() as connection:
            rows = self._latest_document_rows(connection, names)
        documents = {row["document_id"]: row["payload_text"] for row in rows}
        missing = sorted(set(names) - documents.keys())
        if missing:
            raise RuntimeError(f"Integration snapshots missing: {', '.join(missing)}")
        return documents

    @staticmethod
    def _latest_document_rows(connection, names: list[str]) -> list[dict]:
        placeholders = ",".join(["%s"] * len(names))
        return connection.execute(
            f"""SELECT DISTINCT ON (document_id)
                       document_id, source_id, source_version, observed_at_utc,
                       payload_text, payload_sha256
                FROM integration.snapshots
                WHERE document_id IN ({placeholders})
                ORDER BY document_id, observed_at_utc DESC,
                         source_version DESC, payload_sha256 DESC""",
            names,
        ).fetchall()

    def _run_documents(
        self, run_id: str, connection=None,
    ) -> tuple[dict[str, Any], dict[str, str]]:
        with self.connection_scope(connection) as active:
            run = active.execute(
                """SELECT scenario_key, scenario_package_id, scenario_package_version,
                          problem_type, solver_id
                   FROM nourishops_app.runs WHERE run_id = %s""",
                (run_id,),
            ).fetchone()
            if run is None:
                raise KeyError(run_id)
            rows = active.execute(
                """SELECT document_id, payload_text
                   FROM nourishops_app.run_input_documents
                   WHERE run_id = %s ORDER BY document_id""",
                (run_id,),
            ).fetchall()
        documents = {row["document_id"]: row["payload_text"] for row in rows}
        expected = set(self._scenario_names(run["scenario_key"]))
        missing = sorted(expected - documents.keys())
        if missing:
            raise RuntimeError(f"Run input documents missing: {', '.join(missing)}")
        return run, documents

    def knowledge_summary(self, scenario_key: str) -> dict[str, Any]:
        names = self._scenario_names(scenario_key)
        placeholders = ",".join(["%s"] * len(names))
        with self.connect() as connection:
            rows = connection.execute(
                f"""SELECT DISTINCT ON (s.document_id)
                           s.document_id, s.source_id, c.display_name, c.source_kind,
                           s.source_version, s.observed_at_utc, s.payload_sha256
                    FROM integration.snapshots s
                    JOIN integration.sources c USING (source_id)
                    WHERE s.document_id IN ({placeholders})
                    ORDER BY s.document_id, s.observed_at_utc DESC""",
                names,
            ).fetchall()
        return self._group_knowledge(rows)

    def run_knowledge_summary(self, run_id: str, connection=None) -> dict[str, Any]:
        with self.connection_scope(connection) as active:
            rows = active.execute(
                """SELECT d.document_id, d.source_id, c.display_name, c.source_kind,
                          d.source_version, d.observed_at_utc, d.payload_sha256
                   FROM nourishops_app.run_input_documents d
                   JOIN integration.sources c USING (source_id)
                   WHERE d.run_id = %s ORDER BY d.document_id""",
                (run_id,),
            ).fetchall()
        return self._group_knowledge(rows)

    @staticmethod
    def _group_knowledge(rows: list[dict]) -> dict[str, Any]:
        sources = [jsonable(row) for row in rows]
        return {
            "current": [row for row in sources if row["source_kind"] == "CURRENT_KNOWLEDGE"],
            "organizational": [row for row in sources if row["source_kind"] == "ORGANIZATIONAL_KNOWLEDGE"],
            "simulation": [row for row in sources if row["source_kind"] == "SIMULATION_CONTROL"],
        }

    def create_run(self, scenario_key: str, parent_run_id: str | None, connection=None) -> str:
        slug = scenario_key.removeprefix("scenario_").replace("_", "-")[:24]
        run_id = f"run_scn-{slug}_{uuid4().hex[:8]}"
        now = utcnow()
        with self.connection_scope(connection) as active:
            package = self.scenario_registry.get(scenario_key)
            self._require_supported_normalizer(package)
            names = self._scenario_names(scenario_key)
            rows = self._latest_document_rows(active, names)
            documents = {row["document_id"]: row["payload_text"] for row in rows}
            missing = sorted(set(names) - documents.keys())
            if missing:
                raise RuntimeError(f"Integration snapshots missing: {', '.join(missing)}")
            snapshot = self._normalize_scenario(documents, scenario_key, package)
            scenario_id = snapshot.scenario_id
            overlay = json.loads(documents[f"scenarios/{scenario_key}.json"], parse_float=Decimal)
            version_bundle = {
                row["document_id"]: row["source_version"] for row in rows
            }
            contract_snapshot_hash = sha256({
                "base_snapshot": {
                    name: json.loads(documents[name], parse_float=Decimal)
                    for name in (item.document_id for item in package.source_inputs)
                },
                "staged_overlay": overlay,
                "version_bundle": version_bundle,
                "scenario_package": package.model_dump(mode="json"),
            })
            active.execute(
                """INSERT INTO nourishops_app.runs
                   (run_id, scenario_key, scenario_id, parent_run_id, created_at_utc,
                    contract_snapshot_hash, scenario_package_id,
                    scenario_package_version, problem_type, solver_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (run_id, scenario_key, scenario_id, parent_run_id, now,
                 contract_snapshot_hash, package.package_id, package.package_version,
                 package.problem_type, package.solver_id),
            )
            for row in rows:
                active.execute(
                    """INSERT INTO nourishops_app.run_input_documents
                       (run_id, document_id, source_id, source_version, observed_at_utc,
                        payload_text, payload_sha256)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (run_id, row["document_id"], row["source_id"], row["source_version"],
                     row["observed_at_utc"], row["payload_text"], row["payload_sha256"]),
                )
            manifest = [
                {
                    "document_id": row["document_id"],
                    "source_id": row["source_id"],
                    "source_version": row["source_version"],
                    "payload_sha256": row["payload_sha256"],
                }
                for row in rows
            ]
            self._append_event(active, run_id, "RUN_CREATED", "SYSTEM", {
                "state": "DRAFT", "scenario_key": scenario_key,
                "scenario_id": scenario_id, "parent_run_id": parent_run_id,
                "contract_snapshot_hash": contract_snapshot_hash,
                "scenario_package_id": package.package_id,
                "scenario_package_version": package.package_version,
                "problem_type": package.problem_type,
                "solver_id": package.solver_id,
                "input_manifest": manifest,
            }, now)
            self._append_event(active, run_id, "SCENARIO_VALIDATED", "SYSTEM", {
                "state": "DRAFT",
                "scenario_id": scenario_id,
                "contract_snapshot_hash": contract_snapshot_hash,
                "scenario_package_id": package.package_id,
                "scenario_package_version": package.package_version,
                "document_count": len(manifest),
            }, now)
        return run_id

    def append_event(
        self, run_id: str, event_type: str, actor_type: str, payload: dict,
        connection=None,
    ) -> None:
        with self.connection_scope(connection) as active:
            self._append_event(active, run_id, event_type, actor_type, payload, utcnow())

    def append_decision_with_execution(
        self, run_id: str, event_type: str, decision: dict, execution: dict | None,
        connection=None,
    ) -> None:
        now = utcnow()
        with self.connection_scope(connection) as active:
            self._append_event(active, run_id, event_type, "MANAGER_UI", decision, now)
            if execution:
                active.execute(
                    """INSERT INTO nourishops_app.simulated_executions
                       (execution_id, run_id, action_id, execution_type, status, payload, created_at_utc)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (execution["execution_id"], run_id, execution["action_id"],
                     execution["execution_type"], execution["status"], Jsonb(execution), now),
                )
                self._append_event(
                    active, run_id, "SIMULATED_ACTION_APPLIED", "SYSTEM",
                    {"state": "APPROVED", "execution": execution}, now,
                )

    def add_feedback(self, run_id: str, recommendation_id: str, rating: str,
                     reason: str | None, survey: dict, connection=None) -> dict:
        feedback = {
            "feedback_id": f"FB-{uuid4().hex[:10].upper()}",
            "recommendation_id": recommendation_id,
            "rating": rating,
            "reason": reason,
            "survey": survey,
            "created_at_utc": jsonable(utcnow()),
        }
        with self.connection_scope(connection) as active:
            active.execute(
                """INSERT INTO nourishops_app.recommendation_feedback
                   (feedback_id, run_id, recommendation_id, rating, reason, survey, created_at_utc)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (feedback["feedback_id"], run_id, recommendation_id, rating, reason,
                 Jsonb(survey), feedback["created_at_utc"]),
            )
            self._append_event(active, run_id, "RECOMMENDATION_FEEDBACK", "MANAGER_UI",
                               {"feedback": feedback}, utcnow())
        return feedback

    def get_run(self, run_id: str, connection=None) -> dict | None:
        with self.connection_scope(connection) as active:
            run = active.execute(
                "SELECT * FROM nourishops_app.runs WHERE run_id = %s", (run_id,),
            ).fetchone()
            if run is None:
                return None
            events = active.execute(
                """SELECT event_id, sequence_no, event_type, actor_type,
                          occurred_at_utc, payload
                   FROM nourishops_app.run_events WHERE run_id = %s
                   ORDER BY sequence_no""", (run_id,),
            ).fetchall()
            input_manifest = active.execute(
                """SELECT document_id, source_id, source_version, observed_at_utc,
                          payload_sha256
                   FROM nourishops_app.run_input_documents
                   WHERE run_id = %s ORDER BY document_id""",
                (run_id,),
            ).fetchall()

        state = "DRAFT"
        analysis = decision = execution = feedback = decision_brief = None
        solver = agent = None
        for event in events:
            payload = event["payload"]
            state = payload.get("state", state)
            analysis = payload.get("analysis", analysis)
            decision = payload.get("decision", decision)
            execution = payload.get("execution", execution)
            feedback = payload.get("feedback", feedback)
            decision_brief = payload.get("decision_brief", decision_brief)
            solver = payload.get("solver", solver)
            agent = payload.get("agent", agent)
        return {
            **jsonable(run), "state": state, "revision": len(events),
            "analysis": analysis, "decision": decision, "execution": execution,
            "feedback": feedback, "decision_brief": decision_brief,
            "solver": solver, "agent": agent,
            "input_manifest": jsonable(input_manifest),
        }

    def get_events(self, run_id: str, connection=None) -> list[dict]:
        with self.connection_scope(connection) as active:
            rows = active.execute(
                """SELECT event_id, sequence_no, event_type, actor_type,
                          occurred_at_utc, payload, payload_sha256
                   FROM nourishops_app.run_events WHERE run_id = %s
                   ORDER BY sequence_no""", (run_id,),
            ).fetchall()
        return jsonable(rows)

    def ready(self) -> bool:
        try:
            with self.connect() as connection:
                count = connection.execute(
                    "SELECT count(*) AS count FROM integration.snapshots"
                ).fetchone()["count"]
            return count >= 12
        except psycopg.Error:
            return False

    @staticmethod
    def _append_event(connection, run_id: str, event_type: str, actor_type: str,
                      payload: dict, occurred_at: datetime) -> None:
        sequence = connection.execute(
            "SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next FROM nourishops_app.run_events WHERE run_id = %s",
            (run_id,),
        ).fetchone()["next"]
        connection.execute(
            """INSERT INTO nourishops_app.run_events
               (event_id, run_id, sequence_no, event_type, actor_type,
                occurred_at_utc, payload, payload_sha256)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (f"EVT-{uuid4().hex[:12].upper()}", run_id, sequence, event_type,
             actor_type, occurred_at, Jsonb(jsonable(payload)), sha256(payload)),
        )
