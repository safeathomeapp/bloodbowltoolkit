# 2026-05-14 Header Alignment And Background Neutralisation

## Summary

Aligned the board header controls so `EDIT / CALCULATE`, `BLUE / RED`, and the three-line menu sit on one line at matching heights, and neutralized the app background so the red and blue team colors read more clearly.

## Changes

- Normalized the board header control heights in `src/tools/block-dice/components/BlockDiceCalculator.module.css`.
- Center-aligned the header action groups so the controls sit on one line more cleanly.
- Increased the spacing between the `RED` button and the three-line menu.
- Shifted the result panel background to a cooler neutral dark gradient.
- Replaced the global app background in `src/app/global.css` with a darker blue-grey gradient instead of the previous red-heavy wash.

## Reasoning

- Matching control heights makes the board header feel more deliberate and app-like.
- Extra separation before the menu stops the team selector and menu trigger from visually merging.
- The previous red-heavy page background weakened the blue/red team distinction, especially around the red side.
- A more neutral base lets the team colors carry the meaning instead of fighting the page chrome.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
