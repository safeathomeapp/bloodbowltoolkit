# Session Note: Candidate Squares And Invalidation

## Summary Of Work Completed

- Exposed blitz candidate attack squares around the selected target.
- Added rules-layer support for enumerating all candidate squares, including occupied and invalidated states.
- Added tap-to-select for valid candidate squares.
- Added long-press invalidation for candidate squares and recalculation of the best remaining blitz option.
- Updated the result panel to follow the selected candidate or best remaining candidate.

## Files Created

- `src/tools/block-dice/rules/calculatePotentialBlockCandidates.ts`
- `src/tools/block-dice/tests/calculatePotentialBlockCandidates.test.ts`
- `docs/session_notes/2026-05-14_candidate_squares_and_invalidation.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/rules/calculateBestPotentialBlock.ts`
- `src/tools/block-dice/rules/calculateTargetPreviews.ts`
- `src/tools/block-dice/tests/calculateBestPotentialBlock.test.ts`

## Architectural Decisions

- Keep candidate-square generation in the rules layer so the board UI only renders states and interactions.
- Key invalidations by `blockerId:targetId` so manual reachability adjustments stay tied to a specific blitz context.
- Reuse the selected candidate calculation directly for the result and Why panel instead of creating a second detail pathway.

## Rejected Approaches

- Hardcoding candidate-square ranking in the UI
- Ignoring occupied candidate squares in the candidate model
- Implementing pathfinding or movement validation instead of manual invalidation

## Unresolved Issues

- Long-pressing the target token still does not directly open the Why panel.
- Candidate squares do not yet show a dedicated unreachable icon beyond their dimmed red state.
- The current invalidation model is manual only and intentionally does not validate movement legality.

## Next Recommended Step

- Bind the Why panel more directly to blitz target and candidate interactions, and refine candidate-square visual communication for mobile readability.

## Git Branch Used

- `feature/candidate-squares`

## Commit Hashes

- No commit created yet in this session.
