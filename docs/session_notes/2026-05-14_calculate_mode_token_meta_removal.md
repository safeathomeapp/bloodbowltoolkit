# Session Note: Calculate Mode Token Meta Removal

## Summary Of Work Completed

- Removed `ST`, standing state, tackle-zone state, and skill text from player tokens in calculate mode.
- Kept that metadata available in edit mode where board setup still needs it.
- Simplified empty blitz candidate squares so they now show only the dice number in calculate mode.
- Preserved compact role markers in calculate mode:
  - `A` for attacker
  - `*A` for active blitzer
  - `T` for target

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- Treat setup information and calculation information as separate display concerns.
- Keep setup metadata in edit mode only.
- Keep calculate mode focused on block choice and result, not roster detail.

## Rejected Approaches

- Removing token metadata from edit mode as well
- Keeping status labels on blitz candidate squares
- Hiding role markers along with the other calculate-mode text

## Unresolved Issues

- The board may still benefit from a broader visual cleanup pass after more phone testing.

## Next Recommended Step

- Re-test calculate mode on phone and confirm the quieter token treatment and dice-only blitz squares are now readable enough.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
