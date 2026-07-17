ALTER TABLE nourishops_app.runs
ADD COLUMN IF NOT EXISTS scenario_package_id text;

ALTER TABLE nourishops_app.runs
ADD COLUMN IF NOT EXISTS scenario_package_version text;

ALTER TABLE nourishops_app.runs
ADD COLUMN IF NOT EXISTS problem_type text;

ALTER TABLE nourishops_app.runs
ADD COLUMN IF NOT EXISTS solver_id text;
