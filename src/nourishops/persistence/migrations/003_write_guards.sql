DROP TRIGGER IF EXISTS idempotency_records_no_update
ON nourishops_app.idempotency_records;
CREATE TRIGGER idempotency_records_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.idempotency_records FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();

CREATE OR REPLACE FUNCTION nourishops_app.reject_late_run_input()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM nourishops_app.run_events
        WHERE run_id = NEW.run_id AND event_type = 'SCENARIO_VALIDATED'
    ) THEN
        RAISE EXCEPTION 'Run inputs are sealed after scenario validation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS run_input_documents_no_late_insert
ON nourishops_app.run_input_documents;
CREATE TRIGGER run_input_documents_no_late_insert BEFORE INSERT
ON nourishops_app.run_input_documents FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_late_run_input();
