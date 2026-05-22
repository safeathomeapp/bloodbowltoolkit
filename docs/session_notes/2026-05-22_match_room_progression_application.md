# Match Room Progression Application

## Summary

This pass added the first real progression-application path from signed live-match data back into persistent teams.

Delivered:

- progression summary endpoint on `MatchSession`
- one-time progression apply endpoint for closed live-team rooms
- explicit tournament snapshot protection
- block-dice progression panel beneath final signoff
- persisted SPP updates on the underlying saved teams

This moves the live room from `signed match history` to `signed match history that can drive live team progression`.

## Backend Work

Added progression-application field to `MatchSession`:

- `progressionAppliedAt`

Added routes:

- `GET /match-sessions/:sessionId/progression`
- `POST /match-sessions/:sessionId/progression/apply`

Important behavior:

- only closed rooms may apply progression
- only live-team rooms may apply progression
- tournament snapshot rooms remain history-only
- progression requires all SPP-relevant events to resolve to player shirt numbers
- progression can be applied once per room
- timer or event changes clear previous signoff and progression application state

Current progression rule surface:

- touchdown: `+3 SPP`
- casualty: `+2 SPP`
- completion: `+1 SPP`
- interception: `+2 SPP`
- MVP assignment: `+4 SPP`

## Frontend Work

Added to block dice:

- `Progression` panel beneath final signoff
- live-team versus tournament-snapshot scope messaging
- per-team total SPP award summary
- per-player before/award/after SPP preview
- unresolved-event warnings when progression cannot be applied
- `Apply progression` action for eligible live-team rooms
- persisted applied-state messaging after success

Important behavior:

- the progression panel only becomes actionable after final match signoff
- the panel now makes the distinction between:
  - turn confirmation
  - final match signoff
  - progression application
- applied progression state survives refresh and session reload

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:deploy`
- `cd services/api && npm run prisma:generate`
- `cd services/api && npm run build`
- `cd modules/block-dice-calculator && npm run build`

Live API smoke verification passed for:

- progression preview before apply
- progression apply on a closed live-team room
- persistent applied state
- underlying team SPP update after apply

Browser beta confirmed:

- progression preview renders after final signoff
- expected SPP awards are shown before apply
- progression applies from the UI
- applied state persists after refresh and reload

## Product State After This Pass

The live-match flow now reaches:

1. create or load a shared room
2. run the shared timer
3. log match events
4. confirm turns
5. final-signoff the room
6. apply league-style progression back to live teams

That is enough to start widening the progression contract beyond raw SPP.

## Next Step

Extend progression beyond SPP-only application:

- define injury and casualty-outcome handling
- define match-result and post-game summary structure
- keep tournament result history separate from live team mutation
