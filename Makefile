# NourishOps backend — command surface. This is the subset of 05 §17 that is
# live in the current scaffold; dev/build/start/e2e/a11y/visual land with the app.
# Targets must work from paths containing spaces (05 §17) — we invoke $(PYTHON)
# from the repo root and pass no unquoted absolute paths.
PYTHON ?= python3

.PHONY: help doctor guard test-contracts test-golden test

help:
	@echo "Live backend targets:"
	@echo "  make doctor          tool + fixture readiness, no state change"
	@echo "  make guard           fail if the engine leaks binary floats (04 §4.0)"
	@echo "  make test-contracts  schema-validate all goldens/fixtures/overlays (18)"
	@echo "  make test-golden     recompute Scenario A anchors vs golden (Decimal)"
	@echo "  make test            guard + contracts + golden"

doctor:
	@echo "python       : $$($(PYTHON) --version 2>&1)"
	@$(PYTHON) -c "import jsonschema, referencing; print('deps         : jsonschema + referencing ok')"
	@echo "goldens      : $$(ls BUILD_CONTEXT/golden/*.json | wc -l | tr -d ' ')   schemas: $$(ls BUILD_CONTEXT/schemas/*.json | wc -l | tr -d ' ')"
	@echo "agent mode   : $${NOURISHOPS_AGENT_MODE:-offline}"

guard:
	@$(PYTHON) scripts/check_no_float.py

test-contracts:
	@$(PYTHON) -m pytest tests/contracts -q

test-golden:
	@$(PYTHON) -m pytest tests/golden -q

test: guard test-contracts test-golden
