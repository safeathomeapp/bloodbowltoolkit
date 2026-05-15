# 2026-05-14 Header Menu Spacing And Scale

## Summary

Adjusted the board header so the three-line menu reads more clearly as a separate control from the `BLUE / RED` selector, and increased the menu trigger scale so it matches the visual size of the other header buttons more closely.

## Changes

- Increased the spacing between the `BLUE / RED` selector group and the menu trigger in `src/tools/block-dice/components/BlockDiceCalculator.module.css`.
- Increased the desktop and mobile size of the three-line menu button.
- Added internal padding to the menu button so it has more comparable visual weight to the other header controls.

## Reasoning

- The previous spacing still made the team selector and menu read as one cluster.
- The previous menu trigger height matched the other controls mathematically, but it still looked smaller because of its compact internal content.
- This pass is purely visual refinement to improve header grouping and balance.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
