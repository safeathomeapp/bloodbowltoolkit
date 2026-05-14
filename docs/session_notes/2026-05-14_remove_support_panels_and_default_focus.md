# 2026-05-14 Remove Support Panels And Default Focus

## Summary

Removed the remaining support panels around the calculator so the screen is centered on the grid, player cards, and result surface. Also fixed defender-focus behavior to stay on by default rather than requiring a visible toggle.

## Changes

- Removed the full `Session Controls` column from `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Removed the visible `Local Toolkit`, `Board Summary`, and `Tactical Flow` cards from the calculator UI.
- Kept the selected-defender focus behavior, but made it a fixed default-on behavior for the current MVP instead of a user-facing toggle.
- Removed the now-unused install-prompt UI state and related explanatory copy.

## Reasoning

- The helper is now strong enough that the support panels add more clutter than value.
- The next visual priority is making the calculator feel closer to a native app surface rather than a documentation page.
- Focused defender mode tested better for the intended workflow, so leaving it on by default simplifies the interface.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
