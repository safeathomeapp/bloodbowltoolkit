# 2026-05-14 Help Blitz Marker And Exit Note

## Summary

Updated the help popup so the Blitz Preview section explicitly explains the `*A*` attacker marker and how to leave blitz mode.

## Changes

- Added a help line stating that the active blitzing attacker is shown as `*A*` on the grid.
- Added a help line stating that you leave blitz preview by long pressing the same active attacker again.

## Reasoning

- This behavior is important enough to be explained directly in help rather than left implicit.
- The `*A*` marker and the exit gesture are both mode cues that users need to understand quickly.

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`
