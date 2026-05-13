# Session Note: Assist Engine

## Summary Of Work Completed

- Implemented the standalone block dice rules engine outside React.
- Added structured outputs for blocker, target, strength totals, assist details, and final dice ownership.
- Added a minimal result panel that renders engine output without embedding rules logic in the component.
- Added rules tests covering the required MVP assist and recalculation scenarios.

## Files Created

- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/tests/calculateBlockDice.test.ts`
- `docs/session_notes/2026-05-13_assist_engine.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Keep all block/assist rules in a standalone module that consumes `BoardState` and `PlayerProfile[]`.
- Return structured explanation records per assist candidate so the UI can render the reasoning without generating it locally.
- Limit this pass to calculation and summary rendering, not the full bottom-sheet `Why?` interaction.

## Rejected Approaches

- Calculating assists inside React component state
- Hiding cancelled and ineligible assists from the output
- Building the bottom-sheet UI before the explanation data model was stable

## Unresolved Issues

- The dedicated `Why?` button and bottom-sheet explanation panel are still pending.
- The current result panel is functional but not yet fully optimized for compact mobile reading.
- Token movement is still implemented as remove-and-replace rather than drag or reposition.

## Next Recommended Step

- Build the dedicated explanation panel and refine the result presentation around the structured engine output.

## Git Branch Used

- `feature/assist-engine`

## Commit Hashes

- No commit created yet in this session.
