ALTER TABLE nourishops_app.runs
ADD COLUMN IF NOT EXISTS contract_snapshot_hash text;

CREATE TABLE IF NOT EXISTS nourishops_app.run_input_documents (
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    document_id text NOT NULL,
    source_id text NOT NULL REFERENCES integration.sources(source_id),
    source_version text NOT NULL,
    observed_at_utc timestamptz NOT NULL,
    payload_text text NOT NULL,
    payload_sha256 text NOT NULL,
    PRIMARY KEY (run_id, document_id)
);

DROP TRIGGER IF EXISTS run_input_documents_no_update
ON nourishops_app.run_input_documents;
CREATE TRIGGER run_input_documents_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.run_input_documents FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();
