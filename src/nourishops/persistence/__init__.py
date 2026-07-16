"""Persistence (05 §6.6, §8) — local SQLite.

Insert-only runs, append-only run_events, idempotency records, and a replaceable
agent_cache. Serialization and transactions only; never recomputes domain math
or edits prior events.
"""
