# 2026-05-14 Attacker Token Current Square Blitz Dice

## Summary

This pass moves the current-square blitz dice visibility onto the selected attacker token on the grid, not just the attacker info card.

## Clarification

- The previous pass surfaced the current-square blitz value on the attacker card below the grid.
- The intended behavior was to show that dice value on the selected attacker token itself when blitzing from its current square.

## Functional Change

- In `BLITZ MODE`, if the selected attacker is already adjacent to the selected defender:
  - the attacker token on the grid now shows the dice badge for attacking from its current square
- Example:
  - if the attacker would throw a `1D` block from where it already stands, the selected attacker token now shows `1D`
