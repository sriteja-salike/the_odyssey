# NourishOps backend — command surface. This is the subset of 05 §17 that is
# live in the current scaffold; dev/build/start/e2e/a11y/visual land with the app.
# Targets must work from paths containing spaces (05 §17) — we invoke $(PYTHON)
# from the repo root and pass no unquoted absolute paths.
PYTHON ?= python3

.PHONY: help doctor guard lint typecheck test-contracts test-golden test-agent test-integration test verify agent-smoke demo demo-down demo-logs

help:
	@echo "Live backend targets:"
	@echo "  make doctor          tool + fixture readiness, no state change"
	@echo "  make guard           fail if the engine leaks binary floats (04 §4.0)"
	@echo "  make lint            check source and test quality"
	@echo "  make typecheck       verify backend type contracts"
	@echo "  make test-contracts  schema-validate all goldens/fixtures/overlays (18)"
	@echo "  make test-golden     recompute Scenario A anchors vs golden (Decimal)"
	@echo "  make test-agent      provider-neutral agent and safety tests (no network/key)"
	@echo "  make test-integration PostgreSQL lifecycle, parity, and idempotency tests"
	@echo "  make test            guard + contracts + golden + agent tests"
	@echo "  make verify          run all backend quality and PostgreSQL/API checks"
	@echo "  make agent-smoke     one real Anthropic call through the running API"
	@echo "  make demo            start PostgreSQL, API, and UI with synthetic data"
	@echo "  make demo-down       stop Docker services and retain demo data"
	@echo "  make demo-logs       follow API and UI logs"

demo:
	docker compose up --build -d
	@echo "NourishOps: http://127.0.0.1:5173"
	@echo "API docs:   http://127.0.0.1:8180/docs"

demo-down:
	docker compose down

demo-logs:
	docker compose logs -f api web

doctor:
	@echo "python       : $$($(PYTHON) --version 2>&1)"
	@$(PYTHON) -c "import jsonschema, referencing; print('deps         : jsonschema + referencing ok')"
	@echo "goldens      : $$(ls BUILD_CONTEXT/golden/*.json | wc -l | tr -d ' ')   schemas: $$(ls BUILD_CONTEXT/schemas/*.json | wc -l | tr -d ' ')"
	@echo "agent mode   : $${NOURISHOPS_AGENT_MODE:-offline}"

guard:
	@$(PYTHON) scripts/check_no_float.py

lint:
	@uv run ruff check src tests

typecheck:
	@uv run mypy src/nourishops

test-contracts:
	@uv run pytest tests/contracts -q

test-golden:
	@uv run pytest tests/golden -q

test-agent:
	@uv run pytest tests/agents -q

test-integration:
	@NOURISHOPS_TEST_DATABASE_URL=$${NOURISHOPS_TEST_DATABASE_URL:-postgresql://nourishops:nourishops@127.0.0.1:55432/nourishops} uv run pytest tests/integration -q

agent-smoke:
	@uv run python scripts/smoke_agent.py

test: guard lint typecheck test-contracts test-golden test-agent

verify: test test-integration
