from __future__ import annotations

import json

from nourishops.api.assistant_stream import (
    PROTOCOL_VERSION,
    answer_chunks,
    encode_event,
)


def test_answer_chunks_preserve_the_exact_answer() -> None:
    answer = "First line.\n\nSecond line keeps every character intact."
    chunks = list(answer_chunks(answer, target_size=14))

    assert len(chunks) > 1
    assert "".join(chunks) == answer


def test_stream_events_are_versioned_ndjson() -> None:
    encoded = encode_event("delta", 4, request_id="REQ-TEST", delta="hello ")
    event = json.loads(encoded)

    assert encoded.endswith(b"\n")
    assert event == {
        "protocol": PROTOCOL_VERSION,
        "type": "delta",
        "sequence": 4,
        "request_id": "REQ-TEST",
        "delta": "hello ",
    }
