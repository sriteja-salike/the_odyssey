"""Versioned newline-delimited events for the operations assistant."""
from __future__ import annotations

import json
import re
from collections.abc import Iterator
from typing import Any

PROTOCOL_VERSION = "operations-assistant-stream/1.0.0"


def encode_event(event_type: str, sequence: int, **payload: Any) -> bytes:
    """Encode one self-describing NDJSON event."""
    event = {
        "protocol": PROTOCOL_VERSION,
        "type": event_type,
        "sequence": sequence,
        **payload,
    }
    return (json.dumps(event, separators=(",", ":"), default=str) + "\n").encode()


def answer_chunks(answer: str, target_size: int = 56) -> Iterator[str]:
    """Split prose without changing any characters or breaking words."""
    if not answer:
        return
    current = ""
    for token in re.findall(r"\S+\s*", answer):
        if current and len(current) + len(token) > target_size:
            yield current
            current = ""
        current += token
    if current:
        yield current
