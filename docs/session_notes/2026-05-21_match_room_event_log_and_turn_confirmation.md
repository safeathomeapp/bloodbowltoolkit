# Match Room Event Log And Turn Confirmation

## Summary

This pass added the first shared match-administration layer on top of the live match-room timer.

Delivered:

- shared match-session event storage
- first SPP-relevant event types
- active-turn event entry in block dice
- per-side turn confirmation state
- confirmation reset when the current turn changes

This moves the live room from `shared timer only` to `shared turn record with explicit confirmation`.

## Backend Work

Added new `MatchSession` relations and data models:

- `MatchSessionEvent`
- `MatchSessionTurnConfirmation`

Added the first event enum:

- `TOUCHDOWN`
- `CASUALTY`
- `COMPLETION`
- `INTERCEPTION`
- `MVP_ASSIGNMENT`

Added routes:

- `GET /match-sessions/:sessionId/events`
- `POST /match-sessions/:sessionId/events`
- `DELETE /match-sessions/:sessionId/events/:eventId`
- `POST /match-sessions/:sessionId/turn-confirmation/confirm`

Important behavior:

- newly created events inherit the current room turn context:
  - half
  - turn number
  - acting side
- turn confirmation is stored against the active turn only
- adding or deleting an event resets both confirmations for that turn
- the route file now validates event types without depending on a runtime Prisma enum export, which removed the startup crash on the local API process

## Frontend Work

Added to block dice:

- live event panel beneath the timer
- event type selector
- team side selector
- optional player number field
- optional note field
- current-turn event list
- remove-event action
- blue and red turn-confirm buttons
- confirmation state pills

Important behavior:

- event data polls from the same loaded session context as the timer
- confirmation state refreshes after add, remove, confirm, turn end, and half reset
- current-turn confirmation now visibly resets if the turn record changes

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:deploy`
- `cd services/api && npm run build`
- `cd modules/block-dice-calculator && npm run build`

Live API smoke verification passed for:

- event fetch
- event create
- event delete
- turn confirmation for home
- turn confirmation for away
- confirmation reset after event deletion

Browser beta confirmed:

- the event panel appears after loading a live room
- events can be added to the active turn
- confirmation state updates correctly for both sides
- deleting an event removes it and resets confirmation state

## Product State After This Pass

The fixture-backed live-match flow now reaches:

1. create competition
2. submit and approve static tournament teams
3. generate fixtures
4. create fixture-attached match room
5. load room in block dice
6. run a shared turn timer with bank time
7. log the current turn's SPP-relevant events
8. confirm the turn from both sides

That is enough to add final match signoff next without guessing at the underlying turn record shape.

## Next Step

Add final match signoff on top of the shared event log:

- room-level home and away signoff state
- summary view of logged match events
- explicit closeout action once both sides sign off
- keep progression application separate until signoff semantics are stable
