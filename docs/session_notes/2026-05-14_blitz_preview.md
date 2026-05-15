# Session Note: Blitz Preview

## Summary Of Work Completed

- Added Blitz Preview as a secondary calculate-mode state.
- Added long-press on the active blocker to toggle Blitz Preview.
- Added engine support for non-adjacent target previews by evaluating empty adjacent attack squares around each target.
- Added a required disclaimer that movement legality is not checked.
- Surfaced the selected blitz attack square in the result view.

## Files Created

- `src/tools/block-dice/rules/calculateBestPotentialBlock.ts`
- `src/tools/block-dice/tests/calculateBestPotentialBlock.test.ts`
- `docs/session_notes/2026-05-14_blitz_preview.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/rules/calculateTargetPreviews.ts`
- `src/tools/block-dice/tests/calculateTargetPreviews.test.ts`

## Architectural Decisions

- Keep blitz preview generation in the rules layer instead of approximating it in React.
- Reuse the existing low-level `calculateBlockDice(...)` engine by simulating blocker position on candidate attack squares.
- Defer candidate-square rendering and manual invalidation to the next pass even though the engine now evaluates the best available candidate.

## Rejected Approaches

- Showing non-adjacent blitz overlays without real calculation
- Adding movement/path legality checks
- Jumping straight to manual invalidation before blitz preview state existed

## Unresolved Issues

- Candidate attack squares are not yet rendered on the board.
- Manual invalidation of unreachable candidate squares is not implemented yet.
- Long-press on target tokens still does not directly open the Why panel in this pass.

## Next Recommended Step

- Expose candidate attack squares for the selected blitz target and add manual invalidation of unreachable squares.

## Git Branch Used

- `feature/blitz-preview`

## Commit Hashes

- No commit created yet in this session.
