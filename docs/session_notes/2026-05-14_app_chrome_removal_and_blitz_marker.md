# 2026-05-14 App Chrome Removal And Blitz Marker

## Summary

Removed the remaining top-level landing-page copy so the app opens directly into the calculator workspace, and updated the grid blitz marker from `*A` to `*A*`.

## Changes

- Simplified `src/app/App.tsx` to render only the block dice workspace.
- Reduced `src/app/App.module.css` to the shell and workspace layout needed after removing the hero, MVP summary, and project status sections.
- Updated the grid token role marker in `src/tools/block-dice/components/BlockDiceCalculator.tsx` so a blitzing attacker shows `*A*`.

## Reasoning

- The extra page explanation was no longer helping the MVP flow and was taking space away from the actual tool.
- Starting directly in the workspace keeps the app closer to a dedicated calculator rather than a project landing page.
- `*A*` makes the blitz state more explicit on the token without introducing a new marker system.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
