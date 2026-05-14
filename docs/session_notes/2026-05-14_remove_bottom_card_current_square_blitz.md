# 2026-05-14 Remove Bottom Card Current Square Blitz

## Summary

This pass removes the redundant `Current square blitz` line from the attacker info card below the grid.

## Why This Changed

- The earlier request was initially interpreted as a bottom-card visibility change.
- The intended behavior was later clarified: the current-square blitz dice should appear on the attacker token on the grid, not on the attacker info card below the grid.
- Keeping both would repeat the same information unnecessarily.

## Functional Outcome

- Removed `Current square blitz: ...` from the attacker info card
- Kept the current-square blitz dice badge on the selected attacker token on the grid
