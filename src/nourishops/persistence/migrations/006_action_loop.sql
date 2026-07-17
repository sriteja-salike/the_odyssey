CREATE TABLE IF NOT EXISTS nourishops_app.action_intents (
    action_intent_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    recommendation_id text NOT NULL,
    action_id text NOT NULL,
    execution_type text NOT NULL,
    payload jsonb NOT NULL,
    payload_sha256 text NOT NULL,
    created_at_utc timestamptz NOT NULL,
    UNIQUE (run_id)
);

CREATE TABLE IF NOT EXISTS nourishops_app.outcome_feedback (
    outcome_feedback_id text PRIMARY KEY,
    run_id text NOT NULL REFERENCES nourishops_app.runs(run_id),
    execution_id text NOT NULL REFERENCES nourishops_app.simulated_executions(execution_id),
    outcome text NOT NULL CHECK (outcome IN ('SUCCESSFUL', 'PARTIAL', 'FAILED', 'UNKNOWN')),
    actual_quantity_lb integer CHECK (actual_quantity_lb IS NULL OR actual_quantity_lb >= 0),
    actual_cost_usd text,
    reason text,
    survey jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at_utc timestamptz NOT NULL
);

DROP TRIGGER IF EXISTS action_intents_no_update
ON nourishops_app.action_intents;
CREATE TRIGGER action_intents_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.action_intents FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();

DROP TRIGGER IF EXISTS simulated_executions_no_update
ON nourishops_app.simulated_executions;
CREATE TRIGGER simulated_executions_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.simulated_executions FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();

DROP TRIGGER IF EXISTS recommendation_feedback_no_update
ON nourishops_app.recommendation_feedback;
CREATE TRIGGER recommendation_feedback_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.recommendation_feedback FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();

DROP TRIGGER IF EXISTS outcome_feedback_no_update
ON nourishops_app.outcome_feedback;
CREATE TRIGGER outcome_feedback_no_update BEFORE UPDATE OR DELETE
ON nourishops_app.outcome_feedback FOR EACH ROW
EXECUTE FUNCTION nourishops_app.reject_event_mutation();
