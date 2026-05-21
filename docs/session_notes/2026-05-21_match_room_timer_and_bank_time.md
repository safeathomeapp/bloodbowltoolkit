# Match Room Timer And Bank Time

## Summary

This pass added the first real live-match tool on top of fixture-attached match rooms.

Delivered:

- shared timer state on `MatchSession`
- turn clock plus bank-time tracking
- halftime reset support
- block-dice timer panel backed by shared API state

This moves the match room from `teams loaded and room exists` to `both players can now use a shared live clock`.

## Backend Work

Added timer state directly to `MatchSession`:

- `timerEnabled`
- `timerTurnSeconds`
- `timerBankSeconds`
- `timerBankResetsAtHalf`
- `timerCurrentHalf`
- `timerCurrentTurnNumber`
- `timerActiveSide`
- `timerTurnStartedAt`
- `timerHomeBankRemainingSeconds`
- `timerAwayBankRemainingSeconds`

Added routes:

- `GET /match-sessions/:sessionId/timer`
- `POST /match-sessions/:sessionId/timer/start`
- `POST /match-sessions/:sessionId/timer/end-turn`
- `POST /match-sessions/:sessionId/timer/reset-half`

Important behavior:

- fixture-created match rooms inherit timer policy from competition config
- ad hoc sessions fall back to a default timer policy
- ending a turn advances side ownership
- ending an away turn advances the turn number
- halftime reset restores bank time and returns the active side to home

The API bootstrap was also pinned to Prisma `library` engine mode so local runtime startup remains stable after client regeneration.

## Frontend Work

Added to block dice:

- live timer panel for loaded sessions
- current half display
- current turn display
- active side display
- turn clock display
- blue and red bank display
- actions:
  - start or restart turn
  - end turn
  - next half

The block-dice client now polls shared timer state from the API once a session is loaded.

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:deploy`
- `cd services/api && npm run build`
- `cd modules/block-dice-calculator && npm run build`

Live API smoke verification passed for:

- timer fetch
- timer start
- turn end
- halftime reset

Browser beta confirmed:

- timer panel appears after loading a live room
- turn clock starts
- active side switches on turn end
- half reset restores bank values and resets turn state

## Product State After This Pass

The fixture-backed live-match flow now reaches:

1. create competition
2. submit and approve static tournament teams
3. generate fixtures
4. create fixture-attached match room
5. load room in block dice
6. run a shared turn timer with bank time

That is enough to move into actual match administration data next.

## Next Step

Add the first match event log and turn-end confirmation layer:

- small SPP-relevant event entry
- event list scoped to the shared room
- turn-end confirmation on top of the timer flow
- keep final match signoff for the following pass
