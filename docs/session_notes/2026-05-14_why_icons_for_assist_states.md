# 2026-05-14 Why Icons For Assist States

## Summary

Updated the `WHY?` assist lines to use both color and explicit icons so the assist state is not communicated by color alone.

## Changes

- Added a shared explanation-entry renderer in `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Successful assists now show a green check mark.
- Marked or failed assists now show an orange/yellow warning triangle.
- Non-relevant lines now show a grey forbidden marker.
- Added assist-entry layout and screen-reader-only support styles in `src/tools/block-dice/components/BlockDiceCalculator.module.css`.

## Reasoning

- This keeps the existing color grouping while adding a second accessibility cue.
- The icons make the assist state easier to scan quickly inside the explanation panel.
- It is a better base for a later accessibility pass than relying on hue alone.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
