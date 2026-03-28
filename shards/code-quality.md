# Shard: Code Quality

Applies to agents that write, review, or test code.

## Principles

1. Write tests before implementation (TDD) when task includes new logic
2. Every change must pass existing tests — never break the build
3. Follow existing code patterns in the file you're editing
4. Keep changes minimal — only modify what the task requires
5. No dead code, no commented-out code, no TODO placeholders in committed code
6. Error handling must be explicit — never silently swallow errors

## Review Criteria

When reviewing code, check:
- Does the change match the spec exactly? (no more, no less)
- Are edge cases handled?
- Are there tests for new logic?
- Does `npm run build && npm test` pass?
