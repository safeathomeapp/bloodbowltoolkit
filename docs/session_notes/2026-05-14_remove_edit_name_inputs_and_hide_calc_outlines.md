# 2026-05-14 Remove Edit Name Inputs And Hide Calc Outlines

## Summary

Removed the unused editable player-name inputs from edit mode and stopped calculate-mode attacker/defender outlines from remaining visible when switching back into edit mode.

## Changes

- Removed the edit-mode player name input behavior from `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Removed the now-unused `updatePlacedPlayerName(...)` helper.
- Edit cards in edit mode now always show the player name as static text.
- Gated `tokenBlocker` and `tokenTarget` styling so those outlines only appear in `CALCULATE` mode.
- Removed the now-unused `playerCardNameInput` styles from `src/tools/block-dice/components/BlockDiceCalculator.module.css`.

## Reasoning

- The editable name field was not being used meaningfully and was adding unnecessary UI weight.
- Attacker and defender outlines are calculate-mode meaning, not edit-mode meaning.
- Leaving those outlines visible in edit mode made it harder to tell which lower edit card was actually selected.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
