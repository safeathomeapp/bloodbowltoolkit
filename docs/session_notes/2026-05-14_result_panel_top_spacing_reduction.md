# 2026-05-14 Result Panel Top Spacing Reduction

## Summary

Reduced the unused vertical space at the top of the result panel so the result content sits closer to the player cards and reads as part of the same active workflow.

## Changes

- Reduced the top padding on `resultsPanel` in `src/tools/block-dice/components/BlockDiceCalculator.module.css`.
- Removed the extra top margin from `resultStack`.
- Tightened the mobile result-panel top padding as well.

## Reasoning

- The result panel no longer needs a large visual lead-in now that the visible `Result` heading has been removed.
- The extra top padding and stack margin were combining to create a dead band between the player cards and the actual result content.
- This keeps the result visible without making it feel detached from the grid interaction above it.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
