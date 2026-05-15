# 2026-05-14 Current Square Blitz Attacker Card

## Summary

This pass surfaces the attacker's current-square blitz result on the attacker card whenever the attacker is already adjacent to the selected defender during `BLITZ MODE`.

## Why This Changed

- The current square was already a valid blitz calculation path when the attacker was adjacent to the defender.
- That result was not visible on the attacker card, which made the immediate local blitz option easy to miss.
- Showing it on the attacker card makes the current-position blitz outcome visible without needing to inspect candidate squares first.

## Functional Change

- In `BLITZ MODE`, if the attacker is already adjacent to the selected defender:
  - the attacker card now shows `Current square blitz: <dice>`
- This is a visibility change only.
- It does not alter the existing blitz candidate calculation logic.
