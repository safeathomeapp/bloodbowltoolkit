# Session Note: Blitz Target Switch From Occupied Candidate

## Summary Of Work Completed

- Fixed a blitz-mode interaction bug where occupied candidate squares intercepted taps before the player-selection logic could run.
- Restored the expected behavior that tapping an occupied candidate square selects the player on that square as the new target.
- Preserved the existing empty-square candidate behavior for:
  - valid candidate inspection
  - invalidated candidate restoration

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- Keep the candidate routing logic in the board interaction layer.
- Resolve player occupancy before treating a blitz square purely as a candidate-state interaction.
- Preserve occupied candidate semantics visually while allowing the underlying player to remain selectable.

## Rejected Approaches

- Removing occupied squares from the candidate model entirely
- Adding a separate mode just for target switching
- Requiring users to clear the current target before selecting another occupied target

## Unresolved Issues

- Broader candidate-visual simplification is still pending.
- The overall calculator surface still needs a later UI cleanup pass after the interaction bugs are settled.

## Next Recommended Step

- Re-test blitz target switching on occupied candidate squares, then continue with candidate-visual cleanup.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
