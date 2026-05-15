# 2026-05-15 Install Menu And Phone Guidance

## Summary Of Work Completed

- added an `Install` item to the header menu
- reused the existing bottom-sheet help surface to show phone install guidance inside the app
- added concise iPhone/iPad and Android install instructions for home-screen installation
- kept the existing help guide available as a separate menu action
- reran the standard verification pass after the UI change

## Files Created

- `docs/session_notes/2026-05-15_install_menu_and_phone_guidance.md`

## Files Modified

- `src/tools/block-dice/components/BlockDiceCalculator.tsx`

## Architectural Decisions

- kept install guidance inside the current help bottom sheet instead of creating a new standalone modal
- used a small `HelpTopic` state so the same sheet can open in either general-help or install-focused mode
- avoided adding browser-specific install prompt code in this pass because the immediate beta need was discoverable instructions, not prompt orchestration

## Rejected Approaches

- did not add another top-level panel or route for install instructions because that would add UI weight for a small MVP need
- did not assume automatic install prompts are always available, since manual browser-menu installation still needs to be explained

## Verification Results

- `npm run test -- --run`: passed
- `npm run lint`: passed
- `npm run build`: passed

## Unresolved Issues

- this pass explains installation clearly, but it does not yet add a native in-app install prompt button tied to browser install events
- install wording is intentionally generic across supported mobile browsers rather than deeply branching by platform

## Next Recommended Step

- merge `feature/blitz-why-panel` if no further MVP issue is outstanding
- consider a later follow-up only if you want an explicit install CTA that appears when the browser exposes an install prompt

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Context

- starting `HEAD` before this pass: `a310213`
- commit hash for this pass: pending at time of writing
