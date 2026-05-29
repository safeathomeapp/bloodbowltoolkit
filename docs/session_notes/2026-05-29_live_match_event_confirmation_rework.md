Status: active historical

# 2026-05-29 Live Match Event Confirmation Rework

## Summary

This pass replaced the old whole-turn confirmation model with a cleaner live-match workflow:

- match rooms now use explicit turn phases:
  - `READY`
  - `RUNNING`
  - `PAUSE_REQUESTED`
  - `PAUSED`
  - `REVIEW`
- only the side taking the turn can start, resume, pause, or end that turn
- either participant can log events for either team during the running turn or the post-turn review window
- each event is now confirmed independently by blue and red
- dual-confirmed events are locked from removal or change
- the next turn cannot start until all events from the ended turn are resolved
- casualty events now allow self-inflicted injuries and do not award casualty SPP in that case
- event player selection now comes from real team rosters instead of free numeric text

## Backend Changes

- added `timerTurnPhase` and `timerTurnRemainingSeconds` to `MatchSession`
- added `homeConfirmedAt` and `awayConfirmedAt` to `MatchSessionEvent`
- kept the old turn-confirmation table in place for now, but live flow no longer relies on it
- added pause request and pause confirmation routes
- changed timer start logic so the side about to take the turn must be the one that starts it
- changed event creation rules:
  - allowed in `RUNNING` and `REVIEW`
  - blocked in `READY`, `PAUSED`, and `PAUSE_REQUESTED`
  - validated against real players on the session teams
- changed casualty validation:
  - injured player and injury result still required
  - same-team/self-inflicted casualties now allowed
- final signoff now requires all logged events to be dual-confirmed

## Frontend Changes

- block dice now shows actual competition team names in the live-room timer header
- the live panels are accented based on the claimed side
- start button now behaves as:
  - `Start <team>` in normal ready/review flow
  - `Resume <team>` from paused state
- active side can request a pause
- non-active side can confirm the pause
- event entry now uses dropdowns with shirt number, player name, and position
- casualty entry now lets the user choose the injured team explicitly
- each event shows blue/red confirmation state and allows side-owned confirmation

## Smoke Checks Run

- `services/api`: `npm run prisma:generate`
- `services/api`: `npm run build`
- `services/api`: `npm run prisma:migrate:deploy`
- `modules/block-dice-calculator`: `npm run build`
- `modules/team-creator`: `npm run build`

## Beta Priority

Next beta should focus on:

1. turn start ownership
2. pause request and confirm flow
3. event entry with roster dropdowns
4. self-inflicted casualty logging
5. per-event confirmation and event locking
6. next-turn gating after review
7. final signoff only after all events are confirmed
