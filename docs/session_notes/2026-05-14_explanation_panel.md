# Session Note: Explanation Panel

## Summary Of Work Completed

- Added a dedicated `Why?` action to the block result panel.
- Implemented a mobile-first bottom-sheet explanation panel.
- Moved explanation section assembly into the standalone rules engine so React only renders structured explanation data.
- Reused the existing assist and final-dice reasoning to drive the bottom-sheet output.

## Files Created

- `docs/session_notes/2026-05-14_explanation_panel.md`

## Files Modified

- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/tests/calculateBlockDice.test.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Keep explanation section composition in the rules engine rather than in React components.
- Use a bottom-sheet overlay instead of a full modal page to satisfy the mobile-first requirement in the brief.
- Build the panel from existing calculation output instead of creating a second explanation system.

## Rejected Approaches

- Generating base/final explanation copy directly inside JSX
- Building a desktop-first side panel before the mobile bottom-sheet behavior existed
- Adding animation-heavy UI polish before the explanation data flow was stable

## Unresolved Issues

- The explanation panel does not yet include richer visual grouping for valid versus cancelled assists beyond text sections.
- There is no persisted local state yet for restoring board setups after refresh.
- Mobile spacing and typography can still be tightened after the core MVP flow is complete.

## Next Recommended Step

- Refine mobile UX and PWA installability details, then do a focused stabilization pass across the MVP flow.

## Git Branch Used

- `feature/explanation-panel`

## Commit Hashes

- No commit created yet in this session.
