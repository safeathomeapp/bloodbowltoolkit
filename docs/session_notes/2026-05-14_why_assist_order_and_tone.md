# 2026-05-14 Why Assist Order And Tone

## Summary

This pass standardises the `Why?` assist lists so they always read in the same order and use consistent visual emphasis.

## Ordering Rule

Both `Offensive Assists` and `Defensive Assists` now render in this order:

1. Successful assists
2. Marked or cancelled assists
3. Non-relevant players

## Visual Rule

- Successful assists use the existing green success color
- Marked or cancelled assists use the existing yellow warning color
- Non-relevant or otherwise muted entries use the existing grey muted color

## Implementation Note

- The explanation layer now emits typed entries with both text and tone instead of plain strings.
- This keeps the UI rendering simple and avoids trying to infer colors from free-form text.
