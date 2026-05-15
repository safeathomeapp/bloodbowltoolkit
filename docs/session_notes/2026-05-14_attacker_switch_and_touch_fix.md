# Session Note: Attacker Switch And Touch Fix

## Summary Of Work Completed

- Fixed the calculate-mode interaction so either team can become the active blocker without resetting the board.
- Added a direct promotion flow: tapping the currently selected target again now makes that player the blocker.
- Disabled text selection and iOS-style long-press callouts on the interactive board surface to stop browser text selection from blocking game gestures.
- Updated in-app guidance text so the new attacker-switch interaction is explained where the user already looks.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Keep the attacker-switch fix in the interaction layer rather than creating a separate attacker toggle control.
- Use a second tap on the selected target as the minimal mechanic because it works with the existing mental model and requires no new UI affordance.
- Treat long-press text selection as a platform interaction bug on the board surface and suppress it at the CSS layer.

## Rejected Approaches

- Adding a new dedicated “switch attacker” button
- Forcing users to return to edit mode or clear selection before changing teams
- Leaving browser text selection behavior in place and trying to work around it with longer gesture timings

## Unresolved Issues

- The overall calculator presentation still needs a broader cleanup pass after the mechanics and touch issues are settled.
- Candidate presentation still contains more board text than the final interaction likely wants.

## Next Recommended Step

- Re-test attacker switching and long-press behavior on a phone, then continue with the narrower candidate-visual simplification pass.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
