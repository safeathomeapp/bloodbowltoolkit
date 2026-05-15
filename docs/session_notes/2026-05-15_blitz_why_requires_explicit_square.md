# 2026-05-15 Blitz Why Requires Explicit Square

## Summary Of Work Completed

- removed the implicit blitz fallback that auto-used the preferred candidate square as soon as a defender was selected
- changed blitz calculation display so it now only exists when:
  - the attacker is already adjacent on its current square, or
  - the user explicitly selects a valid blitz candidate square
- disabled `WHY?` whenever blitz mode does not yet have a concrete attack square
- closed the why panel when entering or leaving blitz preview so stale explanations do not linger across mode changes
- reran the standard verification pass after the interaction fix

## Files Created

- `docs/session_notes/2026-05-15_blitz_why_requires_explicit_square.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- treated blitz explanation as square-specific state rather than target-specific state
- preserved the current-square blitz explanation when attacker and defender are already adjacent, because in that case the attack origin is unambiguous
- avoided trying to explain the "best" blitz square automatically, since equal-dice results can still have materially different assist explanations

## Rejected Approaches

- did not keep the old preferred-candidate fallback with a disabled `WHY?` button, because that would still show an implied blitz result before the user had chosen a square
- did not broaden this into a larger blitz UX rewrite; this pass only fixes the ambiguous explanation trigger

## Verification Results

- `npm run test -- --run`: passed
- `npm run lint`: passed
- `npm run build`: passed

## Unresolved Issues

- no automated component-level UI test was added in this pass; verification relied on the existing suite plus logic inspection

## Next Recommended Step

- merge `feature/blitz-why-panel` if no further MVP beta issue is outstanding

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Context

- starting `HEAD` before this pass: `dbb5e0c`
- commit hash for this pass: pending at time of writing
