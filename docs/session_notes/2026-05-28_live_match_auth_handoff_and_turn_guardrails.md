Status: active historical

# 2026-05-28 Live Match Auth Handoff And Turn Guardrails

## Scope

Hardened the live match-room bridge between `team-creator` and `block-dice-calculator` so the suite begins to behave like one authenticated product rather than two disconnected tools.

## What Changed

- Added authenticated handoff from competition fixtures in team creator to block dice:
  - `Open Match Room` now opens block dice with session code plus a bootstrap auth token in the URL fragment.
- Block dice now:
  - bootstraps the shared auth token from the launch URL
  - auto-loads the session code from the URL
  - auto-claims the signed-in user’s assigned side in the room
  - shows assigned side and claimed side in the live match timer header
- Match session context now returns viewer state:
  - signed-in user id
  - assigned side
  - claimed participant side
- Match session join is now authenticated and idempotent:
  - side is inferred from the fixture/team assignment
  - users can only claim their own assigned side
- Match session mutation routes now require authenticated claimed participants for:
  - joining
  - adding events
  - deleting events
  - confirming turns
  - advancing half
  - final signoff
  - casualty result updates
- Timer and turn guardrails added:
  - clock cannot start until both sides have claimed the room
  - clock cannot restart while already running
  - clock cannot restart when a stopped turn is still awaiting both confirmations
  - end turn stops the clock but does not immediately advance the turn
  - second turn confirmation advances active side / turn number
  - half advancement is limited and no longer increments endlessly
- Event guardrails added:
  - events require the clock to be running
  - events now require a player number
  - casualty events now require injured player plus injury result at creation time
  - casualty result can be captured atomically instead of a separate follow-up workflow
- Event locking improved:
  - confirmed turn events cannot be deleted server-side
  - block dice now treats earlier events as locked in the UI
- Added polling in block dice so timer/events/progression/viewer state stay more synchronized across two browsers.

## Intent

This pass moves the suite toward the agreed product direction:

- one main login
- modules talking to each other
- competition-created rooms opening directly into the tactical module
- authenticated player ownership inside the live match room

## Verification

- `services/api`: `npm run build`
- `modules/team-creator`: `npm run build`
- `modules/block-dice-calculator`: `npm run build`

## Remaining Gaps

- Turn flow still needs a focused UX pass now that the server rules are stricter.
- Casualty result editing after creation is intentionally de-emphasized; current direction is “delete and re-add before confirmation” rather than a second-step casualty workflow.
- Live polling is periodic rather than real-time push/websocket sync.
