# 2026-05-14 Header Menu And Result Compaction

## Summary

Compacted the top header by removing the standalone `CLEAR` button, adding a three-line menu in the top-right, and collapsing the result surface so it starts directly with the useful content instead of a redundant `Result` label.

## Changes

- Removed the `CLEAR` button from the board header in `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Added a three-line menu button in the top-right of the board header.
- Added menu entries for:
  - `Clear pitch`
  - `Help` placeholder
  - `Load teams` placeholder
  - `Save pitch` placeholder
  - `More soon` placeholder
- Moved the `WHY?` control into the result card header row beside the dice summary.
- Removed the visible `Result` heading so the result card starts directly with the meaningful text.
- Added the required menu and compact result styling in `src/tools/block-dice/components/BlockDiceCalculator.module.css`.

## Reasoning

- The top header needs to stay compact enough to support a native-feeling action layout on small screens.
- Moving `Clear pitch` into the menu frees horizontal space without losing the action.
- Removing the separate `Result` label keeps the result surface tighter and more direct.
- The menu placeholders create a stable home for future non-core actions without reworking the header again.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
