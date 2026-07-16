"""Agent adapters (05 §6.5).

Offline adapter (default): cached notice extraction + deterministic explanation
templates, no key. Optional live LLM: extract_notice / orchestrate / explain
ONLY. record_manager_decision is never an LLM-callable tool (00 §5). Live and
offline paths must return identical numbers and rankings.
"""
