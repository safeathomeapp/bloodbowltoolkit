# 2026-05-14 Edit Cards And Board Header Refactor

## Summary

This pass moves the primary `EDIT / CALCULATE` mode switch into the board header and turns the two player cards under the grid into the main edit surface for Blue and Red teams while in edit mode.

## Why This Changed

- The mode switch belonged with the board interaction rather than in the side panel.
- The lower cards already sit closest to the board and are a better place for direct player editing.
- The old edit menu duplicated controls that are more naturally expressed as team cards under the grid.

## Functional Changes

- Removed the old top-level mode switch from the side controls panel
- Added the `EDIT / CALCULATE` toggle into the board header
- In `EDIT` mode, the two lower cards now become Blue and Red edit cards
- Each edit card now controls:
  - Strength
  - Guard
  - Defensive
  - Dauntless
  - Horns
  - Standing
  - Tackle zone
- Tapping an occupied square in edit mode now selects that player for editing in the relevant team card
- Tapping an empty square in edit mode places a new player using the currently active side and that side's draft settings
- Long pressing an occupied square in edit mode now removes that player

## Architectural Note

- Edit state is now split into per-team drafts instead of one shared draft object
- Edit selection is now tracked separately per team so each lower card can represent either:
  - a selected placed player
  - or that team's next-placement draft
