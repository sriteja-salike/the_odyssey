"""NourishOps backend — nutrition-aware supply-resilience decision engine.

Synthetic data only. Layering (05 §6): domain (pure engine) <- application
(use cases + run state machine) -> agents / persistence / api / cli. The domain
engine computes every number deterministically in Decimal; the LLM never
produces a number, rank, ID, date, probability, or decision (00 §5).
"""
