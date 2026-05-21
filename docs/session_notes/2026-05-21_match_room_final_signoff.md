# Match Room Final Signoff

## Summary

This pass completed the first shared live-match closeout flow.

Delivered:

- room-level final signoff state on `MatchSession`
- blue and red final signoff actions in block dice
- event-summary-driven closeout panel
- automatic room closure once both sides sign off
- mutation lockout after match closure

This moves the live room from `shared turn log` to `shared match closeout with persistent signed state`.

## Backend Work

Added final signoff fields directly to `MatchSession`:

- `homeFinalSignoffAt`
- `awayFinalSignoffAt`
- `closedAt`

Added route:

- `POST /match-sessions/:sessionId/final-signoff`

Important behavior:

- final signoff requires at least one logged match event
- first signoff records one side only
- second signoff closes the room automatically
- closed rooms reject:
  - timer start
  - turn end
  - half reset
  - event create
  - event delete
  - turn confirmation
- event or timer changes clear final signoff state so signoff cannot survive later edits

## Frontend Work

Added to block dice:

- `Final Signoff` panel beneath the turn log
- room summary showing:
  - total logged events
  - event totals by type
- blue signoff button
- red signoff button
- persistent closed-state messaging
- disabled timer and event controls after closure

Important behavior:

- signoff status reloads with the rest of the session room state
- the same session code reopens into the same closed state after refresh
- the UI now makes it explicit when the room is no longer editable

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:deploy`
- `cd services/api && npm run prisma:generate`
- `cd services/api && npm run build`
- `cd modules/block-dice-calculator && npm run build`

Live API smoke verification passed for:

- event create before signoff
- first-side signoff
- second-side signoff
- automatic `CLOSED` status
- rejection of later event edits with `409`

Browser beta confirmed:

- final signoff panel appears after loading a live room
- both sides can sign off in sequence
- room closes automatically after the second signoff
- closed state persists after refresh and reload
- timer and event actions are disabled after closure

## Product State After This Pass

The fixture-backed live-match flow now reaches:

1. create competition
2. submit and approve static tournament teams
3. generate fixtures
4. create fixture-attached match room
5. load room in block dice
6. run a shared turn timer with bank time
7. log the current turn's SPP-relevant events
8. confirm turns
9. close the match with final signoff

That is enough to begin the next real step: deciding how signed match data should feed progression and broader competition administration.

## Next Step

Start the first progression-application pass:

- define how signed match events map into persistent team and player changes
- keep tournament and league consequences separate
- do not apply progression from unsigned or reopened room state
