# Session Note: Calculate Mode Annotation Simplification

## Summary Of Work Completed

- Removed the extra square notes from calculate mode.
- Kept empty-square coordinate hints only in edit mode.
- Simplified token role markers in calculate mode to:
  - `A` for active attacker
  - `*A` for active blitzer in blitz mode
  - `T` for current target
- Removed the longer `Blocker` and `Target` token labels from calculate mode.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- Keep calculate mode visually quieter so the board prioritizes interaction state over explanatory text.
- Preserve edit-mode coordinate hints because they still help with placement.
- Use compact token markers instead of full words to reduce clutter on mobile.

## Rejected Approaches

- Removing all token markers entirely
- Keeping candidate status labels on tokens while removing them from empty squares
- Duplicating separate role marker systems for standard and blitz mode

## Unresolved Issues

- The board still needs a broader visual cleanup pass once the interaction flow is fully settled.
- Candidate outline language may still need simplification after further device testing.

## Next Recommended Step

- Re-test calculate mode on phone and confirm the quieter board is more readable before continuing with broader visual cleanup.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
