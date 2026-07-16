"""Application layer (05 §6.3) — use cases + run state-machine coordination.

DRAFT -> ANALYZING -> READY_FOR_REVIEW | ABSTAINED | NO_ACTION_REQUIRED | FAILED
-> APPROVED / EDITED_APPROVED / REJECTED / DEFERRED. Orchestrates only; the math
lives in domain and persistence writes are append-only.
"""
