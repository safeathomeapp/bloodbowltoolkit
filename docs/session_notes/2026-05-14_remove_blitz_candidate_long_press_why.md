# 2026-05-14 Remove Blitz Candidate Long Press Why

## Summary

Removed the blitz candidate long-press `WHY?` gesture and the redundant “current preview uses attack square” text line from the result area.

## Changes

- Removed the candidate-square long-press handler from `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Left the `WHY?` button as the only way to open and close the explanation for the current calculation.
- Removed the blitz result line that repeated the current preview square in text.
- Updated the help popup so Blitz Preview now points users to the `WHY?` button instead of long pressing candidate squares.

## Reasoning

- Long pressing candidate squares conflicted with the need to long press the active attacker to leave blitz mode.
- The current attack square is already visible on the grid, so repeating it as text was unnecessary.
- Keeping `WHY?` on the dedicated button is simpler and avoids gesture overload.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
