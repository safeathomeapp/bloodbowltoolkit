# Session Note: Dauntless Non-Reduction Fix

## Summary Of Work Completed

- Fixed the temporary `Dauntless` behavior so it no longer lowers a stronger attacker down to a weaker target’s Strength.
- `Dauntless` now only raises the attacker to match the target when the target is stronger.
- Updated the live attacker Strength display in the player card to match the corrected rules behavior.
- Added test coverage for the non-reduction case.

## Reason For The Change

- The previous temporary implementation incorrectly forced the attacker to match the target in all cases.
- That meant a stronger attacker could lose Strength when `Dauntless` was enabled, which is not the intended behavior for this temporary model.
- The correction keeps the temporary implementation aligned with the intended “only ever up, never down” rule of thumb.

## Files Modified

- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/tests/calculateBlockDice.test.ts`

## Architectural Decisions

- Keep the temporary `Dauntless` model but refine it so it behaves as a one-way floor-to-target mechanic.
- Mirror the same logic in the attacker card display so the visible Strength and calculation output cannot drift apart.

## Rejected Approaches

- Leaving the existing match-target behavior in place
- Hiding the discrepancy only in the UI while keeping the engine wrong
- Delaying the fix until a future full Dauntless implementation

## Next Recommended Step

- Re-check the attacker card and result output with stronger and weaker targets to confirm the visible Strength now tracks the corrected behavior.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
