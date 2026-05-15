# 2026-05-14 Selected Defender Focus Toggle

## Summary

This pass adds a temporary toggle for whether non-selected defender dice previews stay visible after a valid defender has been chosen.

## Why This Changed

- Once a defender is selected, the remaining dice labels on other possible defenders can add visual noise.
- It was not yet clear whether hiding those labels would feel cleaner or too restrictive in practice.
- A toggle allows the behavior to be evaluated without hard-committing to it.

## Functional Change

- Added a `Selected defender focus` toggle in calculate mode:
  - `Show all`: all preview dice labels remain visible
  - `Focused`: once a defender is selected, other defender dice labels are hidden
- This only affects the visibility of other target dice labels.
- It does not change attacker selection, defender selection, blitz candidate squares, or calculations.
