CREATE TABLE IF NOT EXISTS nourishops_app.run_contract_snapshots (
    run_id text PRIMARY KEY REFERENCES nourishops_app.runs(run_id),
    package_definition jsonb NOT NULL,
    schema_documents jsonb NOT NULL,
    created_at_utc timestamptz NOT NULL
);

DROP TRIGGER IF EXISTS run_contract_snapshots_no_update
ON nourishops_app.run_contract_snapshots;
CREATE TRIGGER run_contract_snapshots_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.run_contract_snapshots FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();

DROP TRIGGER IF EXISTS run_contract_snapshots_no_late_insert
ON nourishops_app.run_contract_snapshots;
CREATE TRIGGER run_contract_snapshots_no_late_insert BEFORE INSERT
ON nourishops_app.run_contract_snapshots FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_late_run_input();
