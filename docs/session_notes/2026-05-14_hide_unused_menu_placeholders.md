# 2026-05-14 Hide Unused Menu Placeholders

## Summary

Removed the unused placeholder actions from the header menu so it only shows real, working options.

## Changes

- Removed the disabled placeholder menu items from `src/tools/block-dice/components/BlockDiceCalculator.tsx`:
  - `Load teams`
  - `Save pitch`
  - `More soon`
- Left the working menu actions in place:
  - `Clear pitch`
  - `Help`

## Reasoning

- Placeholder actions add friction and make the app feel less complete at the point where the MVP is otherwise stable.
- Hiding them now is cleaner than exposing dead-end UI before those features exist.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
