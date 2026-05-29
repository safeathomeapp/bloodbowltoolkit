Status: reference architecture doc

# Competition Backend Spec

This file is still useful as implementation history and backend-shape reference.

For current canonical startup architecture assumptions, use:

- `docs/ARCHITECTURE_CANON.md`

## Purpose

This document is now the active implementation contract for the shared suite backend.

It no longer describes only a future plan. It describes:

- what is already implemented in `services/api/`
- what the frontend modules already depend on
- what the next backend and frontend contract should be

## System Boundaries

### Tactical Module

- `modules/block-dice-calculator/`
- remains the source-of-truth tactical helper
- consumes resolved team/session context
- should not own canonical team management state

### Team Management Module

- `modules/team-creator/`
- owns canonical team editing flow
- supports both local browser persistence and shared API persistence through one repository interface

### Shared Backend

- `services/api/`
- owns persistence, competition flow, and match-room state

## Implemented Backend Entities

The following entities are implemented and live in the current Prisma schema:

- `User`
- `League`
- `LeagueMembership`
- `Team`
- `TeamPlayer`
- `Competition`
- `CompetitionEntry`
- `CompetitionTeamSubmission`
- `CompetitionTeamSubmissionPlayer`
- `Fixture`
- `MatchSession`
- `MatchSessionParticipant`
- `MatchSessionEvent`
- `MatchSessionTurnConfirmation`
- `MatchSessionCasualtyResolution`

## Implemented Product Rules

- leagues and tournaments are different competition types
- one user may enter one team per competition
- leagues use live progressing teams
- tournaments use frozen submitted team snapshots
- block dice loads shared room/team context from the backend
- signed live-team match rooms may apply progression back to persistent teams
- tournament snapshot rooms remain history-only

## Implemented API Surface

### Teams

- team create/read/update/delete
- list teams by owner/league
- persisted player lifecycle and progression fields

### Competitions

- competition create/list/detail
- join flow
- team submission create/update/read
- submission approval
- fixture generation
- fixture listing
- fixture-attached match-room creation and lookup

### Match Sessions

- session-code room loading
- timer and bank-time state
- event log
- turn confirmation
- final signoff
- progression preview
- one-time progression application

## Canonical Team Contract

### Team

The canonical saved team remains the core mutable object for league play.

Important fields:

- identity and roster template
- purchased team resources
- player list
- team status

### TeamPlayer

Important mutable fields:

- `playerStatus`
- `shirtNumber`
- `currentValue`
- `spp`
- `nigglingInjuries`
- `missNextGame`
- `isDead`
- `extraSkills`
- `statAdjustments`

### Current Lifecycle Semantics

The currently implemented `playerStatus` values are:

- `ACTIVE`
- `SOLD`
- `DEAD`
- `RETIRED`

Current intended semantics:

- `SOLD` and `DEAD` are historical inactive states
- `RETIRED` currently behaves as temporary retirement for roster-management purposes
- temporarily retired players:
  - stay on the team list
  - keep shirt numbers reserved
  - continue to count against roster/position limits
  - do not count toward active TV

## Competition Contract

### League Flow

League competition behavior uses the live `Team` record.

Implications:

- progression persists across fixtures
- injuries remain on the canonical team
- post-game admin mutates the same saved team

### Tournament Flow

Tournament competition behavior uses `CompetitionTeamSubmission` snapshots.

Implications:

- event history stays frozen
- later team edits do not mutate tournament records
- event-specific changes stay on the submission snapshot path

## Match Room Contract

`MatchSession` is still the active live-room backbone.

Current responsibilities:

- side assignment
- team preload
- timer state
- event log
- turn confirmation
- final signoff
- progression preview/apply

Do not replace it yet merely for architectural neatness.

## Persistence And Runtime Contract

### API Defaults

`services/api/.env.example` defines:

- `HOST=127.0.0.1`
- `PORT=3001`

### Team Creator Defaults

`modules/team-creator/.env.local` currently points at the shared API:

- `VITE_TEAM_REPOSITORY_MODE=api`
- `VITE_API_BASE_URL=http://127.0.0.1:3001`

### Important Local-Storage Caveat

Browser local storage is origin-specific.

That means:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

do not share the same browser-local team data.

Any future session that changes hostnames while testing must treat that as a persistence-affecting change.

## Immediate Next Contract To Add

The next contract should not be standings or redraft.

It should be a `Post-Game Sequence` contract for live league teams.

Minimum scope:

1. remove dead players in post-game order
2. hire replacement players
3. fire players subject to `eligible for next game >= 11`
4. handle temporary retirement explicitly in the post-game flow
5. hire journeymen from the just-played match
6. update treasury and winnings
7. update dedicated fans
8. support post-game staff/reroll administration
9. support MVP and remaining post-game SPP decisions

## What Must Stay True During That Pass

- do not mutate tournament snapshots with league progression
- do not duplicate team management state into block dice
- do not bypass the repository boundary
- do not assume local browser storage is the canonical source anymore
- do not rewrite the stable tactical module

## Recommended Implementation Order

### Pass 1

- formalize post-game sequence data shape in API and frontend
- model treasury/winnings/fans updates

### Pass 2

- wire team creator UI for post-game sequence actions
- preserve current ad hoc lifecycle editing as fallback until the dedicated flow is stable

### Pass 3

- connect post-game sequence to live-team match-room closure
- ensure tournament rooms remain history-only

### Pass 4

- only after the above, widen league administration into results/standings/redraft questions
