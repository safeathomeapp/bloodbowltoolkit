# 2026-05-14 Role Specific Calculate Skill Buttons

## Summary

Reduced the calculate-mode player cards so each role only shows the skill toggles that matter for that side of the interaction.

## Changes

- Added `ATTACKER_CARD_SKILL_OPTIONS` in `src/tools/block-dice/components/BlockDiceCalculator.tsx` with:
  - `DAUNTLESS`
  - `HORNS`
- Added `DEFENDER_CARD_SKILL_OPTIONS` with:
  - `GUARD`
  - `DEFENSIVE`
- Updated the calculate-mode attacker card to render only attacker-relevant toggles.
- Updated the calculate-mode defender card to render only defender-relevant toggles.
- Left edit-mode team/player setup controls unchanged so full skill assignment is still available there.

## Reasoning

- `GUARD` and `DEFENSIVE` do not need to be edited from the attacker card.
- `DAUNTLESS` and `HORNS` do not need to be edited from the defender card.
- This reduces clutter and makes each lower card read more clearly as a role-specific control surface.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
