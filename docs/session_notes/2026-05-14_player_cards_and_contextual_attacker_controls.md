# Session Note: Player Cards And Contextual Attacker Controls

## Summary Of Work Completed

- Added persistent attacker and defender player cards to the board area.
- In portrait, the cards sit beneath the grid side by side.
- In landscape, the cards sit to the right of the grid stacked vertically.
- Moved temporary attacker-only controls out of setup and into the selected attacker card.
- Added a temporary `Horns` toggle alongside the temporary `Dauntless` toggle.
- Added temporary `Horns` rules support: `+1 ST` only when the block is part of a blitz.
- Removed `Dauntless` from the player-creation setup controls.

## Reason For The Change In Direction

- The calculator has reached the point where transient in-play modifiers should no longer live in the setup flow.
- `Dauntless` and `Horns` are context-sensitive attacker decisions, not core roster-definition data.
- Keeping those controls near the selected attacker makes the board easier to reason about and reduces the risk of setup-state confusion.
- The attacker/defender cards also establish the correct foundation for future player-context controls without overloading the grid itself.

## Files Modified

- `src/shared/types/game.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/rules/calculatePotentialBlockCandidates.ts`
- `src/tools/block-dice/rules/calculateTargetPreviews.ts`
- `src/tools/block-dice/tests/calculateBlockDice.test.ts`

## Architectural Decisions

- Treat `Dauntless` and `Horns` as attacker-context controls in the player card rather than setup metadata.
- Keep the attacker and defender cards visible in both edit and calculate mode so the layout stays stable.
- Thread explicit blitz context into the rules engine so `Horns` can be handled correctly without leaking UI assumptions into the calculation logic.

## Rejected Approaches

- Leaving `Dauntless` in the setup controls while also duplicating it in the player card
- Adding `Horns` to the setup controls first and moving it later
- Keeping the board as the only interaction surface and forcing more toggles into token-level UI

## Unresolved Issues

- The temporary `Dauntless` behavior is still intentionally simplified and not the final rule implementation.
- Future player-context controls may still require a tighter information hierarchy once more gameplay features arrive.

## Next Recommended Step

- Re-test the new player-card layout and attacker toggles, then continue expanding functional rules coverage or scenario save/load depending on project priority.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
