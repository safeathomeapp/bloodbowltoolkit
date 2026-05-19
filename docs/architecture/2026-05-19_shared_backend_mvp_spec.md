# Shared Backend MVP Spec

## Purpose

Define the first backend slice required to support:

- multiple users on separate devices
- leagues and league membership
- shared saved teams
- match or session loading
- automatic team preload into block dice

This document intentionally starts from the current frontend domain model instead of inventing a parallel backend-first model.

## Why This Comes First

The current local-first team creator and block-dice integration proved the domain shape is usable, but also exposed the current blocker:

- browser-local storage does not solve cross-device flow
- export/import is a temporary bridge, not the final user path
- league-driven match loading needs shared persistence before deeper local-only features

Because of that, the next step is shared backend/domain work, not more isolated frontend depth.

## Scope

This MVP should support only the minimum shared flow:

1. a user creates an account or otherwise obtains an identity
2. a user creates or joins a league
3. a user creates or saves a team tied to that identity
4. a match session identifies two participating teams
5. block dice loads those two teams directly from shared context

This MVP should not yet include:

- standings
- results processing
- redraft
- tournament overlays
- full progression workflows
- advanced permissions
- real-time synchronization

## Reuse Existing Domain Model

The current canonical frontend team model already lives in:

- [team.ts](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/modules/team-creator/src/shared/types/team.ts)

That model should remain the starting point for backend persistence:

- `SavedTeam`
- `SavedTeamPlayer`
- `RosterTemplate`
- `PositionTemplate`

Do not create a second competing team schema just because backend work starts.

## Canonical Backend Entities

The first backend slice should add these entities around the existing saved-team model.

### User

Purpose:

- identify the owner of teams
- identify league participants
- identify who is using a match session

Minimum fields:

- `id`
- `displayName`
- `createdAt`
- `updatedAt`

### League

Purpose:

- shared container for teams and future fixtures

Minimum fields:

- `id`
- `name`
- `createdByUserId`
- `createdAt`
- `updatedAt`

### LeagueMembership

Purpose:

- connect users to leagues
- support later role expansion without changing league shape

Minimum fields:

- `id`
- `leagueId`
- `userId`
- `role`
- `joinedAt`

Initial role set:

- `OWNER`
- `MEMBER`

### Team

Purpose:

- persist the current canonical `SavedTeam` under shared ownership

Minimum fields in addition to existing team payload:

- `id`
- `ownerUserId`
- `leagueId` nullable for non-league or draft use
- `rosterTemplateId`
- `name`
- `status`
- `draftBudget`
- `rerollCount`
- `assistantCoachCount`
- `cheerleaderCount`
- `dedicatedFans`
- `apothecaryPurchased`
- `createdAt`
- `updatedAt`

### TeamPlayer

Purpose:

- persist the current canonical `SavedTeamPlayer`

Minimum fields:

- `id`
- `teamId`
- `positionTemplateId`
- `name`
- `shirtNumber`
- `currentValue`
- `spp`
- `nigglingInjuries`
- `extraSkills`
- `statAdjustments`
- `displayOrder`

`displayOrder` is important because the current roster ordering behavior already matters to imported block-dice numbering.

### MatchSession

Purpose:

- identify the two participating teams for a given block-dice session
- support preloading attacker and defender sources across devices

Minimum fields:

- `id`
- `leagueId` nullable
- `homeTeamId`
- `awayTeamId`
- `sessionCode`
- `status`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Initial status set:

- `PENDING`
- `ACTIVE`
- `CLOSED`

### MatchSessionParticipant

Purpose:

- identify which user is linked to which side in a session

Minimum fields:

- `id`
- `matchSessionId`
- `userId`
- `teamId`
- `side`

Initial side set:

- `HOME`
- `AWAY`

## Preserve Frontend Boundaries

Keep these boundaries intact:

- `modules/team-creator/` owns team editing UX
- `modules/block-dice-calculator/` owns tactical calculation UX
- `services/api/` owns shared persistence and session loading

Do not move backend logic into the existing frontend modules.

## Repository And Interface Strategy

Current repository interface:

- [teamRepository.ts](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/modules/team-creator/src/shared/repositories/teamRepository.ts)

That interface should be preserved as a frontend-facing abstraction.

Planned path:

1. keep the interface shape
2. add an API-backed repository implementation
3. replace local-only persistence behind the repository boundary
4. avoid rewriting the team creator UI around transport details

For block dice, the same principle applies:

- keep calculation logic independent
- fetch or resolve imported teams before entering the calculation flow

## Initial API Surface

The first API surface should be small and explicit.

### Users

- `POST /users`
- `GET /users/:userId`

### Leagues

- `POST /leagues`
- `GET /leagues/:leagueId`
- `POST /leagues/:leagueId/join`
- `GET /leagues/:leagueId/members`

### Teams

- `GET /teams`
- `GET /teams/:teamId`
- `POST /teams`
- `PUT /teams/:teamId`
- `DELETE /teams/:teamId`

Filter support should include:

- `ownerUserId`
- `leagueId`

### Match Sessions

- `POST /match-sessions`
- `GET /match-sessions/:sessionId`
- `GET /match-sessions/code/:sessionCode`
- `POST /match-sessions/:sessionId/join`

### Block Dice Session Load

Either:

- `GET /match-sessions/:sessionId/block-dice-context`

Or:

- include the resolved block-dice preload payload directly in the session fetch

The payload should resolve to team/player data in the same shape already used by block-dice import helpers.

## First End-To-End Slice

The first implementation slice should be:

1. create user
2. create league
3. join league
4. save a team for each user
5. create a match session between two teams
6. fetch both teams as block-dice preload data

Do not expand into standings or results before this works.

## Deferred Until After MVP Backend Slice

- SPP editing workflows
- injury workflows
- event packs
- resurrection vs league overlays
- standings
- scheduling
- audit history
- invitations
- advanced auth

## Implementation Notes

- prefer adding `services/api/` rather than repurposing a frontend module
- prefer a TypeScript backend to maximize model reuse
- preserve IDs and payload structures where possible to reduce migration risk
- keep roster templates as reference data, not user-editable league records

## Immediate Next Decision

After this spec is accepted, choose the concrete backend stack and scaffold:

- runtime and framework
- database choice
- schema/migration tool
- initial folder layout for `services/api/`

## Current Implementation Status

The repository has now moved past stack selection and initial scaffold-only status.

In place:

- `services/api/` Fastify + TypeScript scaffold
- Prisma schema for:
  - `User`
  - `League`
  - `LeagueMembership`
  - `Team`
  - `TeamPlayer`
  - `MatchSession`
  - `MatchSessionParticipant`
- PostgreSQL local development database
- first live route slice:
  - `POST /users`
  - `GET /users/:userId`
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

Next implementation step:

- block-dice frontend session loading
- session-driven preload flow across the two apps
