# Session Note: Blocker Target Selection

## Summary Of Work Completed

- Added an explicit interaction-mode split between placement and selection.
- Implemented blocker selection on any placed player.
- Implemented target selection restricted to adjacent opposing players.
- Added reusable selection state using `BoardState.blockerId` and `BoardState.targetId`.
- Added blocker, target, and eligible-target visual states to the grid.

## Files Created

- `docs/session_notes/2026-05-13_blocker_target_selection.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Keep blocker/target interaction in the board component for now because it is UI flow, not rules calculation.
- Restrict target eligibility to adjacency and opposing team only in this pass, leaving assist and strength logic for the rules engine pass.
- Preserve selection while the board layout remains unchanged so the same setup can be reused for multiple block checks.

## Rejected Approaches

- Auto-selecting a target as soon as a blocker is chosen
- Mixing assist or strength calculation into the selection pass
- Allowing selection and placement gestures to happen in the same mode

## Unresolved Issues

- Selection currently does not explain why a non-adjacent opponent cannot be targeted.
- No recalculated block result is shown yet because the rules engine does not exist.
- Assist visualization and explanation output are still pending.

## Next Recommended Step

- Implement the standalone block dice rules engine and have the selection state feed structured calculation input into it.

## Git Branch Used

- `feature/block-selection`

## Commit Hashes

- No commit created yet in this session.
