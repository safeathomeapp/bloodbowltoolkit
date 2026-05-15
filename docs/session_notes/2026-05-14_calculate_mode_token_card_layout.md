# Session Note: Calculate Mode Token Card Layout

## Summary Of Work Completed

- Reworked calculate-mode player tokens into a compact card layout.
- Moved the player name to the top-right corner of the token.
- Moved the attacker/target marker to the top-left corner of the token.
- Moved the dice value to the bottom-center of the token.
- Added size-aware text styling so the anchored token content scales with the square size and stays inside the card.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Treat calculate-mode tokens as anchored information cards rather than stacked text blocks.
- Keep edit mode’s setup-oriented token layout intact while giving calculate mode its own compact presentation.
- Use CSS positioning and `clamp(...)` sizing so the content remains stable across phone and desktop sizes.

## Rejected Approaches

- Keeping the old vertically stacked token layout and only shrinking text
- Moving the role marker below the player name
- Leaving dice badges in the text flow instead of anchoring them to the card edge

## Unresolved Issues

- More mobile testing is still needed to confirm the name truncation threshold feels right across different phone widths.

## Next Recommended Step

- Re-test calculate mode on phone and confirm the top-left / top-right / bottom-center card layout is materially easier to read.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
