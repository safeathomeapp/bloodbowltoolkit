# 2026-05-14 Hide Blitz Invalidation Action

## Summary

This pass hides the explicit `Mark unreachable` blitz action from the MVP UI while leaving the underlying invalidation logic in the codebase.

## Why This Changed

- The current invalidation behavior is too loose for MVP:
  - it is scoped only to the selected defender path
  - it is not strong enough as a global board-state rule
- The visible action adds complexity without enough trustworthiness for release

## Functional Outcome

- Removed the visible `Mark unreachable` action from the result panel
- Kept the underlying invalidation logic and state in place
- Marked the feature as intentionally dormant rather than deleted
