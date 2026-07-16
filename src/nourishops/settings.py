"""Runtime settings for the NourishOps backend.

Offline mode is the default and requires no provider key (05 §3.1). The
deterministic engine never reads these — it takes explicit config/clock/seed
(00 §7); only the API and agent-adapter layers consult runtime mode.
"""
from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_CONTEXT = REPO_ROOT / "BUILD_CONTEXT"
SCHEMAS_DIR = BUILD_CONTEXT / "schemas"
FIXTURES_DIR = BUILD_CONTEXT / "fixtures"
GOLDEN_DIR = BUILD_CONTEXT / "golden"

# "offline" (default, no key) | "live" (optional provider adapter) — 05 §3.
AGENT_MODE = os.environ.get("NOURISHOPS_AGENT_MODE", "offline")
