# 2026-05-14 Flatten Result Surface

## Summary

Removed the inner result container so the result text and `WHY?` control now sit directly in the outer result panel.

## Changes

- Removed the inner `resultStack` and `resultCard` wrappers from `src/tools/block-dice/components/BlockDiceCalculator.tsx`.
- Kept the existing explanation cards under `WHY?`, but flattened the main result summary into the outer panel.
- Removed the now-unused `resultStack` and `resultCard` styles from `src/tools/block-dice/components/BlockDiceCalculator.module.css`.

## Reasoning

- The remaining inner result container was causing an awkward centering/composition issue after the previous spacing reduction.
- Flattening the result surface is cleaner than trying to compensate for nested panel spacing.
- The result now reads as a direct continuation of the grid interaction rather than a card inside a card.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
