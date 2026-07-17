"""Persistence adapters for connector snapshots and append-only run data."""

from .postgres import PostgresStore

__all__ = ["PostgresStore"]
