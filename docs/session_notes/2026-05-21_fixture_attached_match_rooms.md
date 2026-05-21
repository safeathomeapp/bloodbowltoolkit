# Fixture Attached Match Rooms

## Summary

This pass moved live match setup from loose session creation to fixture-attached match rooms.

Delivered:

- fixture-attached match room creation in the API
- fixture-to-match-room lookup in the API
- team-creator fixture actions to create and reveal match room codes
- block-dice session loading now consuming fixture-backed tournament submission snapshots

This closes the gap between tournament administration and live in-match tooling.

## Backend Work

Added to `services/api`:

- `MatchSession.fixtureId`
- fixture-to-match-room lookup route
- fixture-to-match-room create route

New routes:

- `GET /competitions/:competitionId/fixtures/:fixtureId/match-session`
- `POST /competitions/:competitionId/fixtures/:fixtureId/match-session`

Important behavior:

- only the competition owner can create a fixture match room
- only `READY` fixtures can create a room
- both fixture sides must have approved submitted teams
- the room reuses the existing `MatchSession` transport instead of inventing a second session type

The block-dice context endpoint was also tightened:

- fixture-backed sessions now resolve from `CompetitionTeamSubmission`
- non-fixture sessions still resolve from live saved teams

That keeps tournaments static while preserving the older ad hoc session path.

## Frontend Work

Added to the API-backed `team-creator` competition fixture view:

- `Create Match Room` action on eligible fixtures
- inline display of the generated session code and room status

Added to the competition client:

- fixture match-room lookup
- fixture match-room creation

No block-dice UI rewrite was needed because the existing `Load session code` path could already consume the shared match-session context.

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:generate`
- `cd services/api && npm run prisma:migrate:deploy`
- `cd services/api && npm run build`
- `cd modules/team-creator && npm run build`
- `cd modules/block-dice-calculator && npm run build`

Live verification passed for:

- fixture lookup
- fixture room creation
- room code fetch
- fixture-backed block-dice context fetch

Browser beta confirmed:

- commissioner can create a match room from a generated fixture
- fixture card shows the room code
- block dice can load that code
- loaded teams match the submitted tournament snapshot

## Product State After This Pass

The tournament flow now reaches:

1. create competition
2. join competition
3. submit and approve static tournament team snapshots
4. generate fixtures
5. create a live match room from a fixture
6. load that room in block dice

That is the correct base to start adding real live-match tools.

## Next Step

Add shared turn-timer and bank-time support on top of fixture-attached match rooms:

- per-turn timer
- bank time consumption
- bank reset at halftime
- shared state visible to both players
