"""Production-shaped live-agent smoke through the public API; never prints keys."""
from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

BASE_URL = os.environ.get("NOURISHOPS_API_URL", "http://127.0.0.1:8180/api/v1").rstrip("/")


def request(path: str, method: str = "GET", body: dict | None = None) -> dict:
    payload = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if method == "POST":
        headers["Idempotency-Key"] = f"smoke-{uuid4()}"
    try:
        with urlopen(
            Request(BASE_URL + path, data=payload, headers=headers, method=method),
            timeout=30,
        ) as response:
            return json.load(response)
    except HTTPError as exc:
        message = exc.read().decode(errors="replace")
        raise RuntimeError(f"Agent smoke request failed ({exc.code}): {message}") from exc


def main() -> int:
    ready = request("/health/ready")
    configured = ready["data"]["agent"]
    if configured["effective_mode"] != "live":
        print(
            "Live Anthropic mode is not configured. Set NOURISHOPS_AGENT_MODE=live "
            "and ANTHROPIC_API_KEY in the uncommitted .env, then rebuild the API.",
            file=sys.stderr,
        )
        return 2

    created = request(
        "/runs",
        "POST",
        {"scenario_key": "scenario_b", "parent_run_id": None},
    )
    evaluated = request(f"/runs/{created['data']['run_id']}/evaluate", "POST", {})
    agent = evaluated["data"]["agent"]
    if agent["status"] != "live_verified" or agent["provider"] != "anthropic":
        code = agent.get("fallback_code") or "UNKNOWN"
        print(f"Anthropic call did not verify; safe fallback code: {code}", file=sys.stderr)
        return 3
    recommendation = evaluated["data"]["decision_brief"]["recommendation"]
    print(
        "Anthropic live smoke passed: "
        f"{recommendation['recommendation_id']} / {recommendation['action']['action_id']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
