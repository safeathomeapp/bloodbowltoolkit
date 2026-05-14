# 2026-05-14 Fix Edit Vs Calculate Skill Sets

## Summary

Corrected the lower-card skill sets so edit mode keeps the full six controls, while calculate mode stays role-specific.

## Changes

- Restored edit-mode lower cards in `src/tools/block-dice/components/BlockDiceCalculator.tsx` to show:
  - `GUARD`
  - `DEFENSIVE`
  - `DAUNTLESS`
  - `HORNS`
  - `Prone`
  - `Tackle zone`
- Set the calculate-mode attacker card to show only:
  - `DAUNTLESS`
  - `HORNS`
- Set the calculate-mode defender card to show only:
  - `GUARD`
  - `DEFENSIVE`

## Reasoning

- The previous role-specific pass accidentally changed the edit cards as well as the calculate cards.
- Edit mode still needs the full setup and correction surface.
- Calculate mode should stay narrower and role-specific to reduce clutter.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
