# Session Note: Tie-Aware Blitz Candidates

## Summary Of Work Completed

- Refactored blitz candidate evaluation to return top-tier tied squares instead of forcing a single mathematical winner.
- Replaced the old single `bestCandidate` assumption with:
  - `topTierCandidates`
  - `preferredCandidate`
- Updated the board logic to consume top-tier candidate keys rather than assuming one uniquely preferred square for styling.
- Added tests proving that equally strong blitz candidates are returned together in the same top tier.

## Files Modified

- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/rules/calculatePotentialBlockCandidates.ts`
- `src/tools/block-dice/rules/calculateBestPotentialBlock.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/tests/calculatePotentialBlockCandidates.test.ts`

## Architectural Decisions

- The rules layer now distinguishes between:
  - all candidate squares
  - top-tier valid candidate squares
  - one stable preferred candidate for fallback preview purposes only
- A fallback preferred candidate is still retained so the rest of the blitz preview flow can continue to function without a larger rewrite.
- The mechanical correction happens before any broader beautification pass.

## Rejected Approaches

- Leaving the single-winner model in place and only hiding it in CSS
- Performing a full board visual redesign in the same pass
- Removing the fallback preview candidate before the surrounding result flow is ready

## Unresolved Issues

- The board still uses lightweight text labels and styling that should be simplified in a later UI pass.
- The result panel still falls back to one preferred top-tier candidate when no exact square is selected, even though the rules layer now preserves ties correctly.

## Next Recommended Step

- Simplify the blitz candidate presentation so tied top-tier squares share one visual state without extra invented ranking language.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
