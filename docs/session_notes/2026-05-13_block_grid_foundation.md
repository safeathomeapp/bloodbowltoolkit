# Session Note: Block Grid Foundation

## Summary Of Work Completed

- Replaced the bootstrap placeholder with an actual block-dice workspace.
- Implemented a mobile-first 7x7 tactical grid.
- Added token placement controls for team, strength, skills, standing state, and tackle-zone state.
- Separated permanent `PlayerProfile` data from board `PlacedPlayer` data in local state.
- Added token removal by tapping an occupied square.

## Files Created

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `docs/session_notes/2026-05-13_block_grid_foundation.md`

## Files Modified

- `src/app/App.tsx`
- `src/app/App.module.css`
- `ROADMAP.md`

## Architectural Decisions

- Preserve the `PlayerProfile` versus `PlacedPlayer` split from the start instead of collapsing all player data into board tokens.
- Keep blocker and target selection out of this pass so the board-placement flow remains stable before rules logic is layered on.
- Model `hasTackleZone` independently while forcing it off for non-standing players at placement time.

## Rejected Approaches

- Building placement state directly into the top-level app shell
- Coupling token placement with premature block-selection logic
- Adding drag-and-drop before a stable tap-first mobile interaction existed

## Unresolved Issues

- Blocker and target selection are not implemented yet.
- No assist or block-dice calculation exists yet.
- Token numbering continues increasing after removals instead of recycling identifiers.

## Next Recommended Step

- Implement blocker and target selection, then add recalculation-ready board state transitions for the upcoming rules engine pass.

## Git Branch Used

- `feature/repo-bootstrap`

## Commit Hashes

- No commit created yet in this session.
