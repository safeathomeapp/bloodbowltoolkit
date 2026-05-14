# Session Note: Player Card Live Strength Display

## Summary Of Work Completed

- Added live Strength display to the top-right corner of the attacker and defender player cards.
- The attacker card now reflects the same temporary modifier logic used by the calculator:
  - printed Strength by default
  - target-matching temporary `Dauntless`
  - `+1 ST` from `Horns` during blitz mode
- The defender card shows the current selected defender Strength directly.

## Reason For The Change

- This makes the current temporary `Dauntless` and `Horns` behavior visible without requiring the user to infer it from the result summary alone.
- It provides a direct way to inspect whether the calculator is applying those temporary attacker modifiers as intended.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Mirror the current temporary attacker-modifier logic in the attacker card display rather than inventing a separate display-only model.
- Keep the live Strength readout in the player-card header so it remains visible regardless of the rest of the card content.

## Rejected Approaches

- Showing effective Strength only in the result summary
- Keeping static printed Strength in the card while temporary modifiers happen invisibly elsewhere
- Adding a separate explanation line just for live Strength instead of placing it in the card header

## Unresolved Issues

- The current `Dauntless` handling is still an intentionally simplified temporary model and may later be replaced by a fuller rule implementation.

## Next Recommended Step

- Re-test the player cards and verify the live attacker Strength changes match expected `Dauntless` and `Horns` states.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
