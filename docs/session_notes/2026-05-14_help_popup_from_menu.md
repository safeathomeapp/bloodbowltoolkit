# 2026-05-14 Help Popup From Menu

## Summary

Connected the header menu `Help` item to a real in-app help popup.

## Changes

- Added `isHelpOpen` state in `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Replaced the disabled `Help` menu placeholder with a working action.
- Added an in-app help popup using the existing bottom-sheet style.
- Added focused help content covering:
  - edit mode
  - calculate mode
  - blitz preview
  - `WHY?` assist interpretation

## Reasoning

- The menu now has one genuinely useful secondary action instead of being mostly placeholders.
- Reusing the existing bottom-sheet presentation keeps the interaction model consistent with the rest of the app.
- A short, task-focused help surface is more useful for MVP than a large documentation page.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
