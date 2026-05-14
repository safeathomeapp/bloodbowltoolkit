# Session Note: Blocker Marker Visibility

## Summary Of Work Completed

- Added an explicit `*` marker to the active blocker token label on the board.
- Kept the existing blocker outline styling, but no longer rely on outline alone to identify the active blitzer.
- Applied the marker directly to the existing player name so no extra board control or legend was required.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- Treat blocker visibility as an interaction clarity issue, not a styling preference.
- Add the marker at the token label layer because it stays visible in both standard and blitz calculation flows.
- Keep the solution minimal and reversible while broader UI cleanup is still pending.

## Rejected Approaches

- Adding a separate dedicated blocker badge component
- Relying only on token outline color and glow
- Introducing a new legend entry just for blocker state

## Unresolved Issues

- The wider calculator UI still needs a cleaner overall presentation pass.
- The blocker marker improves clarity, but the board may still want stronger hierarchy once the candidate-visual pass is complete.

## Next Recommended Step

- Re-test blocker visibility on phone, then continue with candidate-visual simplification and broader board cleanup.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
