# 2026-05-14 Guard Skill Editor Surface

## Summary

This pass makes `Guard` and the other supported profile skills editable directly from the selected player cards so the existing rules engine can be used without rebuilding tokens.

## Why This Changed

- The rules engine already supported `Guard`, but the practical editing flow was still too dependent on recreating players from the placement draft.
- That made Guard testing and setup slower than it needed to be.
- Selected player cards are always visible, so they are the right place to expose direct profile editing.

## Functional Changes

- Both selected player cards now expose direct skill toggles for:
  - `GUARD`
  - `DEFENSIVE`
  - `DAUNTLESS`
  - `HORNS`
- This works in both `EDIT` and `CALCULATE` because the cards remain visible across both modes.
- The old edit-draft skill controls are now labelled `New player skills` to distinguish them from direct skill editing on selected placed players.

## Guard Outcome

- `Guard` is now easier to test on existing board pieces.
- You can select a player, toggle `Guard`, and immediately see the impact in the calculator and the grouped `Why?` explanation without clearing and rebuilding the setup.
