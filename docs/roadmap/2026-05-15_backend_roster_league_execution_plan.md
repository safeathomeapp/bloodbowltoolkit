# 2026-05-15 Backend, Roster, And League Execution Plan

## Goal

Build the next stage of the suite systematically without destabilizing the finished block-dice module.

The existing application under `modules/block-dice-calculator/` stays the working software baseline.

## Phase Breakdown

### Phase 1: Repository Mainline Cleanup

Definition of done:

- MVP PR merged
- stable mainline branch established
- default branch no longer points at early bootstrap history

### Phase 2: Backend Scaffold

Definition of done:

- `services/api/` exists
- backend runs locally
- PostgreSQL connection works
- migration system works
- health endpoint works

Deliverables:

- service package scaffold
- env handling
- DB client setup
- first migration
- local run instructions

### Phase 3: Domain Schema

Definition of done:

- first persistent schema exists for profiles, rosters, teams, leagues, competitions, fixtures, and standings
- architecture note documents entity boundaries

Deliverables:

- schema or ORM model definitions
- migration files
- seed strategy decision

### Phase 4: Roster APIs

Definition of done:

- create/list/update/delete player profiles
- create/list/update/delete rosters
- create/list/update/delete roster players
- create teams from roster data

Deliverables:

- backend endpoints
- validation schemas
- basic integration notes for the frontend

### Phase 5: League And Competition APIs

Definition of done:

- leagues can be created
- competitions can be created inside leagues
- teams can be assigned
- fixtures can be generated
- results can be stored
- standings can be returned

Deliverables:

- competition format decisions
- fixture generation logic
- standings calculation logic

### Phase 6: Frontend Integration

Definition of done:

- block-dice module can pull saved player/roster/team data from backend
- local tactical testing flow still works
- integration is additive rather than destructive

## Order Constraint

Do not start broad frontend roster screens before Phase 2 and Phase 3 are stable.

Do not start league-generation UI before competition data modelling is stable.

## Recommended Technical Stack

- PostgreSQL
- Node + TypeScript
- Fastify
- Prisma or Drizzle
- Zod

## Immediate Recommendation

Start with:

1. `services/api/`
2. Postgres connection
3. migrations
4. first domain schema draft
