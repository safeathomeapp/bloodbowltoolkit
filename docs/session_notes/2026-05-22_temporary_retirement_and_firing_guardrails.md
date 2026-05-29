# 2026-05-22 Temporary Retirement And Firing Guardrails

## Summary

This pass tightened the already-landed roster management work against the post-game rulebook page for hiring, firing, and temporarily retiring players.

The goal was to finish the current roster-state slice before starting broader post-game bookkeeping.

## What Changed

- kept the existing `RETIRED` player status in code, but aligned its behavior with temporary retirement
- temporarily retired players now:
  - stay on the team list
  - keep their shirt numbers reserved
  - still count against roster slot and position-limit checks
  - do not count toward active team value
- firing guardrails now use players eligible for the next game rather than raw active-player count
- `MNG` players no longer count as eligible for that firing check

## Team Creator

Updated `modules/team-creator`:

- active-roster summary now distinguishes:
  - active players
  - rostered players
  - players eligible for the next game
- retire action copy now reads as temporary retirement rather than permanent retirement
- inactive-player messaging now distinguishes:
  - historical inactive players such as sold/dead
  - temporarily retired players who still occupy team-list space
- position-slot and shared-group limits now continue to count temporarily retired players

Important behavior:

- a player cannot be fired if doing so would leave fewer than 11 players eligible for the next game
- a player with `MNG` may still be fired if the eligible-player threshold remains satisfied

## API

Updated `services/api`:

- locked-team shirt-number normalization now keeps temporarily retired players in the reserved-number set

This keeps the shared repository path aligned with the corrected team-list semantics.

## Verification

Verified locally:

- `modules/team-creator`: `npm run test`
- `modules/team-creator`: `npm run build`
- `services/api`: `npm run build`

## Next Step

The next post-game pass should now build on these corrected semantics instead of revisiting basic roster state again:

- dead-player removal ordering
- journeyman hiring
- treasury and winnings
- dedicated fans changes
- sideline staff and reroll post-game admin
- MVP and remaining post-game SPP bookkeeping
