# Session Note: Mode Architecture And Adjacent Previews

## Summary Of Work Completed

- Replaced the old `PLACE / SELECT` interaction framing with top-level `EDIT / CALCULATE` mode architecture.
- Kept board setup controls in Edit Mode only.
- Added adjacent target preview generation in Calculate Mode using the rules layer.
- Added inline dice overlays on adjacent opposing targets for the selected blocker.
- Preserved the existing detailed result panel and Why panel for tapped adjacent targets.

## Files Created

- `src/tools/block-dice/rules/calculateTargetPreviews.ts`
- `src/tools/block-dice/tests/calculateTargetPreviews.test.ts`
- `docs/session_notes/2026-05-14_mode_architecture_and_adjacent_previews.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `src/tools/block-dice/types/blockDice.ts`

## Architectural Decisions

- Keep `calculateBlockDice(...)` as the low-level primitive and add a preview generator above it.
- Treat target tapping in standard calculate mode as optional detail inspection, not the primary discovery mechanism.
- Defer blitz preview and candidate attack squares to a separate pass so the standard adjacent flow is stable first.

## Rejected Approaches

- Keeping the old blocker-then-target selection model as the main calculate interaction
- Putting adjacent preview generation logic directly inside React
- Starting blitz-mode work before standard adjacent previews were functional

## Unresolved Issues

- No Blitz Preview exists yet.
- No candidate attack square evaluation exists yet.
- Manual invalidation of unreachable candidate squares is still pending.

## Next Recommended Step

- Implement long-press blocker interaction for Blitz Preview and add the first engine support for non-adjacent target preview generation.

## Git Branch Used

- `feature/mode-architecture`

## Commit Hashes

- No commit created yet in this session.
