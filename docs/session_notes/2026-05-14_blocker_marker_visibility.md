# Session Note: Blitzer Marker Visibility

## Summary Of Work Completed

- Added an explicit `*` marker to the active blitzer token label on the board.
- Narrowed the marker so it appears only in `BLITZ MODE`, not during standard blocking previews.
- Kept the existing blocker outline styling, but no longer rely on outline alone to identify the active blitzer.
- Applied the marker directly to the existing player name so no extra board control or legend was required.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- Treat blitzer visibility as an interaction clarity issue, not a styling preference.
- Add the marker at the token label layer because it stays visible during the active blitz flow without adding new UI.
- Keep the solution minimal and reversible while broader UI cleanup is still pending.

## Rejected Approaches

- Adding a separate dedicated blitzer badge component
- Relying only on token outline color and glow
- Introducing a new legend entry just for blitz state

## Unresolved Issues

- The wider calculator UI still needs a cleaner overall presentation pass.
- The blitzer marker improves clarity, but the board may still want stronger hierarchy once the candidate-visual pass is complete.

## Next Recommended Step

- Re-test blitzer visibility on phone, then continue with candidate-visual simplification and broader board cleanup.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
