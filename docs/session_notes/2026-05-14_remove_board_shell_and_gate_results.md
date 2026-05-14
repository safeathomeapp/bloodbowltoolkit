# 2026-05-14 Remove Board Shell And Gate Results

## Summary

Removed the extra outer board container so the grid area sits more naturally within the device bounds, and tightened result visibility so it only appears when it is actually useful.

## Changes

- Removed the styled outer board shell from `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Scoped the heavy card styling in `src/tools/block-dice/components/BlockDiceCalculator.module.css` to the result panel only.
- Hid the result section entirely in `EDIT` mode.
- Hid the result section in `CALCULATE` mode until both an attacker and defender are selected and a real calculation exists.

## Reasoning

- The board is now the main product surface, so it should not sit inside an unnecessary extra card.
- Showing a result card before a valid matchup exists creates visual weight without adding value.
- This keeps the screen closer to a native app layout with clearer state transitions.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
