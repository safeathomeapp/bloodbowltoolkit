# 2026-05-14 Edit Card Compaction And Name Editing

## Summary

This pass compacts the new edit-mode team cards and removes redundant information from edit-mode tokens on the grid.

## Functional Changes

- Edit-mode grid tokens now show only the player number/name
- Removed edit-mode token metadata from the grid because that information now lives in the lower edit cards
- Selected player names are now editable directly in the edit cards
- Removed the redundant `Blue` / `Red` card heading labels because the card colors already communicate team identity
- Removed the separate `Strength` heading and moved the Strength selector into the edit-card header
- Changed the edit-card status row from `Standing` / `Tackle zone` to a more compact `Prone` / `Tackle zone`
- Made the board-header `EDIT / CALCULATE` buttons use the same sizing system as the active-side selector

## Deferred Note

- The suggested future `activeable` state was not added in this pass
- That needs an explicit rules/product decision rather than a layout-only change
