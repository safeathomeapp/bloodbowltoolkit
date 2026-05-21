# Blood Bowl Toolkit API

This service is the planned shared backend for:

- users
- leagues
- competitions
- shared teams
- match sessions
- block-dice preload context

## Current Scope

This scaffold is intentionally thin. It currently establishes:

- the Fastify application entrypoint
- local `.env` loading and environment parsing
- Prisma client wiring
- route registration boundaries for:
  - users
  - competitions
  - leagues
  - teams
  - match sessions

Implemented route slice:

- `POST /users`
- `GET /users/:userId`
- `POST /competitions`
- `GET /competitions`
- `GET /competitions/:competitionId`
- `POST /competitions/:competitionId/join`
- `GET /competitions/:competitionId/entries/:entryId/submission`
- `POST /competitions/:competitionId/entries/:entryId/submission`
- `PUT /competitions/:competitionId/entries/:entryId/submission`
- `POST /competitions/:competitionId/entries/:entryId/approve`
- `POST /leagues`
- `GET /leagues/:leagueId`
- `POST /leagues/:leagueId/join`
- `GET /leagues/:leagueId/members`
- `GET /teams`
- `GET /teams/:teamId`
- `POST /teams`
- `PUT /teams/:teamId`
- `DELETE /teams/:teamId`
- `POST /match-sessions`
- `GET /match-sessions/:sessionId`
- `GET /match-sessions/code/:sessionCode`
- `POST /match-sessions/:sessionId/join`
- `GET /match-sessions/:sessionId/block-dice-context`

Still placeholder-only:

- no remaining route placeholders in the MVP slice

It does not yet implement the full domain workflow.

Current competition scope:

- shared `Competition` parent model
- `CompetitionEntry` join flow
- knockout-capable competition creation fields
- commissioner-owned competition detail and entrant listing
- tournament team submission snapshots copied from saved teams
- submission update and approval flow

Not implemented yet in the competition layer:

- fixture generation
- fixture-backed live matches
- timer, event log, and signoff flows

## Development

1. create `.env` from `.env.example`
2. install dependencies
3. run Prisma generate/migrations
4. start the dev server

```bash
cd services/api
npm install
npm run prisma:generate
npm run dev
```

## Local Database

The current local development database is expected to be PostgreSQL.

After `.env` is in place:

```bash
cd services/api
npm run prisma:migrate:dev -- --name init_shared_backend
```
