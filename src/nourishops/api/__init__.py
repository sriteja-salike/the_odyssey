"""API transport (05 §6.2, §9) — thin FastAPI routes under /api/v1.

Handlers serialize domain output to golden-shaped JSON; they never compute
domain math. Pydantic models are the transport contract with the frontend.
"""
