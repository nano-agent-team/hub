# Shard: Pipeline

Applies to agents that orchestrate tasks, route work, or manage status transitions.

## Principles

1. Status transitions must be deterministic — no LLM decides ticket routing
2. Always use expected_status for optimistic locking on ticket updates
3. Never skip pipeline steps — every ticket follows the full route
4. Scope enforcement: verify agent output matches task description before advancing
5. On ambiguity, hold (do not advance) and request clarification
