# 2026-05-14 Move Clear Board To Header

## Summary

This pass moves the board-clearing action into the main board-header control row.

## Why This Changed

- `CLEAR BOARD` belongs with the core board interaction controls rather than in the side utility card.
- Keeping `EDIT`, `CALCULATE`, and `CLEAR BOARD` together makes the main workflow easier to find.

## Functional Change

- Added `CLEAR BOARD` beside `EDIT / CALCULATE` in the board header
- Removed the old `Reset board` button from the `Local Toolkit` card
