# 2026-05-14 Result Surface Consolidation

## Summary

This pass removes the duplicate `Block Dice Summary` versus `Why?` split and consolidates the calculator output into one compact result surface with an expandable explanation.

## Why This Changed

- The previous result area duplicated information across a summary block and a separate explanation view.
- Keeping both would create drift risk as more rules and edge cases are added.
- A single result surface is easier to maintain and clearer for users.

## Functional Changes

- The result panel now shows one compact block result headline.
- The compact result always includes:
  - the final dice outcome
  - attacker total Strength versus defender total Strength
  - blitz candidate-square context when relevant
- `Why?` is now an inline expand/collapse control inside the result panel.
- The old separate assist/result cards and bottom-sheet explanation flow were removed.

## UX Outcome

- One source of truth for rules reasoning
- Less repeated wording
- Lower risk of summary and explanation drifting apart later
- Better foundation before adding more rules controls such as Guard
