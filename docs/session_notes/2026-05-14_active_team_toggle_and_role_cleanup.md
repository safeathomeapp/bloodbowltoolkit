# 2026-05-14 Active Team Toggle And Role Cleanup

## Summary

This pass replaced the clunky attacker-side switching behavior with an explicit active-team toggle in the board header and cleaned up the visible role/icon system around `Attacker` and `Defender`.

## Why This Direction Changed

- Changing attacking side by tapping pieces was too implicit and easy to trigger by accident.
- Tapping the same defender twice could incorrectly promote that defender to attacker.
- Side-switching also depended on nearby valid targets, which was not obvious and made the tool feel inconsistent.
- The board was still showing team-letter naming while also using `A` and `D` as role markers, which risked confusion.

## Functional Changes

- Added a `Blue / Red` active-team toggle beside `Tactical Grid`.
- Only the selected active team can now be chosen as the attacker in `CALCULATE` mode.
- Opposing-team taps are reserved for defender selection only.
- Tapping a defender twice no longer flips that defender into the attacker role.
- Switching the active team now updates the attacker/defender cards so their color direction follows the selected side.
- Existing saved local state now restores the active team from the saved attacker when the older persisted payload does not yet contain the new field.

## Visibility Changes

- Grid tokens now show only the player number instead of `A1`, `B2`, etc.
- The attacker card and defender card now show the selected player number instead of the team-prefixed token label.
- The Why sheet now includes explicit blue/red attacker and defender role chips at the top.

## Next Step

- Implement the next formula-changing skill pass for `Guard`, now that attacker-side selection and role signaling are explicit.
