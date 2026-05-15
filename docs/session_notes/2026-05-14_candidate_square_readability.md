# Session Note: Candidate Square Readability

## Summary Of Work Completed

- Improved blitz candidate-square readability for mobile use.
- Added a small in-context legend for `BEST`, `ALT`, `OFF`, and `OCCUPIED` states.
- Added explicit status labels directly onto candidate squares instead of relying on color alone.
- Added status badges to occupied candidate tokens so blocked attack squares remain visible even when a player occupies the square.
- Added clearer `aria-label` text for empty candidate squares.

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Architectural Decisions

- Keep candidate readability improvements in the presentation layer only.
- Preserve the existing rules output and candidate model rather than adding new rules concepts.
- Use short uppercase state labels because they remain legible on small screens and do not add new interaction burden.

## Rejected Approaches

- Adding separate icon assets for candidate states
- Expanding the board cell size to fit more text
- Moving candidate guidance entirely into the bottom sheet

## Unresolved Issues

- Candidate-state colors are still carrying part of the communication load even though text labels now reduce that dependency.
- The occupied candidate badge is intentionally terse and may still want a stronger visual treatment after device testing.

## Next Recommended Step

- Test the current board on a phone-sized viewport and decide whether occupied and invalidated candidate states need stronger contrast or a more explicit symbol.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
