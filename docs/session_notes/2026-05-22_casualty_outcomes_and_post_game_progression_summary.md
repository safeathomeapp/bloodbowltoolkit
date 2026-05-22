# 2026-05-22 Casualty Outcomes And Post-Game Progression Summary

## Summary

This pass widened signed-match progression beyond raw SPP application.

The match room progression flow now supports:

- casualty events with separate causing and injured players
- final-outcome injury capture without forcing dice-sequence substeps
- persistent `miss next game` and `niggling injury` application on live teams
- a clearer split between:
  - live team mutation
  - tournament snapshot history

The block-dice live-room flow was also tightened so casualty outcomes are resolved from the event log rather than only from the progression panel.

## Backend

Updated `services/api`:

- `MatchSessionEvent` now stores:
  - causing side and player
  - injured side and player
- progression summary now:
  - awards casualty SPP to the causing player
  - applies injury outcomes to the injured player
  - blocks progression until casualty events have a resolved final outcome
- live-team progression apply now persists:
  - `spp`
  - `missNextGame`
  - `nigglingInjuries`

Important behavior:

- changing a casualty outcome clears final signoff
- if the room was already closed, it reopens and requires signoff again before progression can be applied

## Frontend

Updated `modules/block-dice-calculator`:

- casualty event entry now captures:
  - causing player
  - injured opposing player
- casualty event cards in the turn log now show:
  - causer
  - injured player
  - injury result dropdown
- earlier logged events remain accessible from the turn-log section so injury results can still be resolved after the active turn changes
- the progression panel now acts as a post-game summary rather than the main place to edit casualty results

## Team Model

Updated shared saved-team handling so player records consistently carry:

- `missNextGame`

This was wired through:

- API persistence
- local repository normalization
- API repository normalization
- team factory defaults

## Verification

Verified locally:

- `services/api`: `npm run build`
- `modules/block-dice-calculator`: `npm run build`
- `modules/team-creator`: `npm run build`

Browser-tested:

- casualty SPP goes to the causing player
- injury outcome applies to the injured player only
- injury result selection works from the event log
- progression apply persists after refresh

## Next Step

The next clean progression slice is roster-side progression editing in team creator:

- expose saved player progression fields in the editor
- show live persistent state clearly on the roster
- keep this compatible with both local and API repositories
