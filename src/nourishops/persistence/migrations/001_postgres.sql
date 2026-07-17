CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS nourishops_app;

CREATE TABLE IF NOT EXISTS integration.sources (
    source_id text PRIMARY KEY,
    display_name text NOT NULL,
    source_kind text NOT NULL,
    refresh_mode text NOT NULL,
    synthetic boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS integration.snapshots (
    source_id text NOT NULL REFERENCES integration.sources(source_id),
    document_id text NOT NULL,
    payload_text text NOT NULL,
    source_version text NOT NULL,
    observed_at_utc timestamptz NOT NULL,
    payload_sha256 text NOT NULL,
    PRIMARY KEY (source_id, document_id, source_version)
);

CREATE INDEX IF NOT EXISTS integration_snapshots_document_idx
    ON integration.snapshots (document_id, observed_at_utc DESC);

CREATE TABLE IF NOT EXISTS nourishops_app.runs (
    run_id text PRIMARY KEY,
    scenario_key text NOT NULL,
    scenario_id text NOT NULL,
    parent_run_id text REFERENCES nourishops_app.runs(run_id),
    created_at_utc timestamptz NOT NULL,
    synthetic boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS nourishops_app.run_events (
    event_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    sequence_no integer NOT NULL,
    event_type text NOT NULL,
    actor_type text NOT NULL,
    occurred_at_utc timestamptz NOT NULL,
    payload jsonb NOT NULL,
    payload_sha256 text NOT NULL,
    UNIQUE (run_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS nourishops_app.simulated_executions (
    execution_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    action_id text NOT NULL,
    execution_type text NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL,
    created_at_utc timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS nourishops_app.recommendation_feedback (
    feedback_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    recommendation_id text NOT NULL,
    rating text NOT NULL CHECK (rating IN ('HELPFUL', 'NOT_HELPFUL')),
    reason text,
    survey jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at_utc timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS nourishops_app.idempotency_records (
    route text NOT NULL,
    idempotency_key text NOT NULL,
    request_sha256 text NOT NULL,
    response jsonb NOT NULL,
    created_at_utc timestamptz NOT NULL,
    PRIMARY KEY (route, idempotency_key)
);

CREATE OR REPLACE FUNCTION nourishops_app.reject_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'NourishOps audit rows are append-only';
END;
$$;

DROP TRIGGER IF EXISTS run_events_no_update ON nourishops_app.run_events;
CREATE TRIGGER run_events_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.run_events FOR EACH ROW EXECUTE FUNCTION nourishops_app.reject_event_mutation();

DROP TRIGGER IF EXISTS runs_no_update ON nourishops_app.runs;
CREATE TRIGGER runs_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.runs FOR EACH ROW EXECUTE FUNCTION nourishops_app.reject_event_mutation();
