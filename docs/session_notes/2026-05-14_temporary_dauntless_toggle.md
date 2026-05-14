# Session Note: Temporary Dauntless Toggle

## Summary Of Work Completed

- Added `DAUNTLESS` as a temporary player setup toggle.
- Implemented the agreed interim behavior:
  - if `DAUNTLESS` is off, the attacker uses their printed Strength
  - if `DAUNTLESS` is on, the attacker base Strength matches the current target Strength
- Applied the temporary Dauntless behavior before assists are added.
- Added tests covering both the off and on cases.

## Files Modified

- `src/shared/types/game.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/tests/calculateBlockDice.test.ts`

## Architectural Decisions

- Treat this as a temporary rules toggle rather than a full final Dauntless implementation.
- Keep the toggle in the existing setup skills controls so no new configuration surface is needed.
- Apply Dauntless at base-strength calculation time before offensive assists are counted.

## Rejected Approaches

- Implementing the full dice-roll Dauntless procedure in this pass
- Adding a separate non-skill UI control outside the existing setup controls
- Hiding the temporary nature of this behavior in the explanation output

## Unresolved Issues

- This is intentionally not the final Dauntless rule handling.
- A later pass may replace this with a fuller and more accurate interaction model.

## Next Recommended Step

- Expand core rules coverage with more interaction tests, or move to local scenario save/load if gameplay utility is the next priority.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
