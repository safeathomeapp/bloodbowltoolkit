# Blood Bowl Toolkit API

This service is the planned shared backend for:

- users
- leagues
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
  - leagues
  - teams
  - match sessions

Implemented route slice:

- `POST /users`
- `GET /users/:userId`
- `POST /leagues`
- `GET /leagues/:leagueId`
- `POST /leagues/:leagueId/join`
- `GET /leagues/:leagueId/members`

Still placeholder-only:

- team routes
- match session routes

It does not yet implement the full domain workflow.

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
