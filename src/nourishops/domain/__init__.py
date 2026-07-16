"""Deterministic engine (05 §6.4) — pure Python, no IO/clock/random/network/LLM.

Owns forecast, three projection views (conservative/expected/capacity-stress),
WOS/gap/breach, five risk types + priority scores, catalog action generation,
hard constraints, action effects, scoring, confidence, ranking, and the two
baselines. All arithmetic is base-10 Decimal, Context(prec=28, ROUND_HALF_EVEN);
no binary float (04 §4.0) — enforced by scripts/check_no_float.py.
"""
