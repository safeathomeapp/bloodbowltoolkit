# 2026-05-14 Why Irrelevant Assist Grouping

## Summary

This pass makes the `Why?` explanation more human-readable by grouping repeated irrelevant-assist entries instead of listing the same sentence once per player.

## Why This Changed

- The explanation was reading like debug output when several players were not involved in the current block.
- Repeating `A3 is not marking the relevant player for this assist`, `A4 is not marking...`, `A5 is not marking...` added noise without adding new information.
- Grouping these entries makes the explanation easier to scan while preserving the actual rules outcome.

## Functional Change

- Repeated assist reasons of the form `X is not marking the relevant player for this assist.` are now collapsed into one grouped line such as:
  - `A3, A4 and A5 are not relevant in this block.`
- This grouping is applied in:
  - `Offensive Assists`
  - `Defensive Assists`
  - `Cancelled / Ignored`

## Scope Note

- This pass only groups the repeated `not relevant` assist case.
- More specific assist outcomes such as valid assists, Guard usage, Defensive suppression, prone players, or marked cancellers still appear individually.
