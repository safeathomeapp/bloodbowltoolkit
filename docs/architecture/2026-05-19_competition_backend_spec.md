# Competition Backend Spec

## Purpose

Turn the competition-domain direction into a concrete backend contract that can be implemented incrementally inside `services/api/`.

This note is intended to bridge:

- the current MVP backend models
- the new `Competition` parent model
- knockout-first tournament support
- future league support without rebuilding the core ownership flow

It should be read together with:

- `docs/architecture/2026-05-19_competition_domain_model.md`
- `docs/architecture/2026-05-19_shared_backend_mvp_spec.md`

## Design Constraints

The implementation needs to preserve the parts that are already working:

- `User`
- `Team`
- `TeamPlayer`
- `MatchSession`
- repository-backed frontend modules

The new competition layer should sit above that work rather than replacing it.

Key rules already locked:

- leagues and tournaments are different competition types
- one user may enter one team only per competition
- user joins competition first and may submit a team later
- leagues use live progressing teams
- tournaments use static submitted team snapshots
- live matches use one shared room
- knockout is the first tournament format to implement

## Implementation Strategy

Do not delete `League` immediately.

Instead:

1. introduce `Competition` as the long-term parent model
2. keep `League` and existing league-backed team/session paths working during migration
3. add competition-backed tournament flow first
4. later migrate league behavior onto the same parent model
5. finally decide whether `League` becomes:
   - a compatibility alias
   - a thin derived view
   - or a retired transitional model

This keeps the current API useful while the new structure lands.

## Canonical Entity Set

### Existing Entities To Keep

- `User`
- `Team`
- `TeamPlayer`
- `MatchSession`

### Transitional Entities To Keep For Now

- `League`
- `LeagueMembership`

### New Competition Entities

- `Competition`
- `CompetitionEntry`
- `CompetitionTeamSubmission`
- `CompetitionTeamSubmissionPlayer`
- `Fixture`
- `LiveMatch`
- `CompetitionInvite` optional in first pass

### Later Live-Match Support Entities

- `TimerPolicy`
- `LiveTimerState`
- `MatchEvent`
- `TurnConfirmation`
- `FinalMatchSignoff`

## Proposed Prisma Shape

The following is the intended domain shape, not a copy-paste migration yet.

### Enums

#### `CompetitionType`

- `LEAGUE`
- `TOURNAMENT`

#### `CompetitionFormat`

- `KNOCKOUT`
- `SWISS`
- `ROUND_ROBIN`

Only `KNOCKOUT` needs live behavior in the first implementation pass.

#### `CompetitionVisibility`

- `PRIVATE`
- `INVITE_ONLY`
- `OPEN`

#### `CompetitionStatus`

- `DRAFT`
- `OPEN_FOR_JOIN`
- `TEAM_SUBMISSION_OPEN`
- `IN_PROGRESS`
- `COMPLETED`
- `ARCHIVED`

#### `CompetitionEntryStatus`

- `JOINED`
- `TEAM_PENDING`
- `TEAM_SUBMITTED`
- `TEAM_APPROVED`
- `ELIMINATED`
- `COMPLETED`
- `WITHDRAWN`

#### `FixtureStatus`

- `PENDING`
- `READY`
- `IN_PROGRESS`
- `COMPLETED`
- `VOID`

#### `FixtureSourceType`

- `GENERATED`
- `COMMISSIONER_OVERRIDE`

#### `LiveMatchStatus`

- `PENDING`
- `ACTIVE`
- `AWAITING_SIGNOFF`
- `COMPLETED`
- `CANCELLED`

#### `TournamentTeamSourceType`

- `COPIED_FROM_TEAM`
- `DIRECT_EVENT_BUILD`

The first implementation can support `COPIED_FROM_TEAM` only, but the model should not block a future direct event roster build.

## Core Model Definitions

### `Competition`

Purpose:

- shared parent for leagues and tournaments

Minimum fields:

- `id`
- `createdByUserId`
- `name`
- `description` nullable
- `type`
- `format`
- `status`
- `visibility`
- `maxEntrants`
- `submissionDeadline` nullable
- `allowUnofficialRosters`
- `configJson`
- `createdAt`
- `updatedAt`

Notes:

- `configJson` should hold type-specific and format-specific options until the config surface stabilizes
- do not explode this into many narrow tables too early

### `CompetitionEntry`

Purpose:

- one user's seat in one competition

Minimum fields:

- `id`
- `competitionId`
- `userId`
- `status`
- `joinedAt`
- `submittedAt` nullable
- `approvedAt` nullable
- `seed` nullable
- `notes` nullable

Constraints:

- unique on `[competitionId, userId]`

Behavior:

- user joins first
- team may be attached later
- one entry per user per competition

### `CompetitionTeamSubmission`

Purpose:

- frozen event snapshot for tournaments

Minimum fields:

- `id`
- `competitionEntryId`
- `sourceType`
- `sourceTeamId` nullable
- `rosterTemplateId`
- `teamName`
- `tierId` nullable
- `teamValue`
- `draftBudget`
- `rerollCount`
- `assistantCoachCount`
- `cheerleaderCount`
- `dedicatedFans`
- `apothecaryPurchased`
- `extraSkillsPackageJson`
- `submittedAt`
- `createdAt`
- `updatedAt`

Constraints:

- unique on `competitionEntryId`

Notes:

- this is tournament-only behavior
- leagues should not write progression state into this snapshot path

### `CompetitionTeamSubmissionPlayer`

Purpose:

- frozen player list attached to a submitted tournament roster

Minimum fields:

- `id`
- `competitionTeamSubmissionId`
- `sourcePlayerId` nullable
- `positionTemplateId`
- `name`
- `shirtNumber` nullable
- `currentValue`
- `displayOrder`
- `extraSkills`
- `statAdjustments`

Notes:

- this mirrors the current `TeamPlayer` structure closely on purpose
- reuse current saved-team serialization patterns where possible

### `Fixture`

Purpose:

- pairing record inside a competition

Minimum fields:

- `id`
- `competitionId`
- `roundNumber`
- `bracketPosition` nullable
- `homeEntryId` nullable
- `awayEntryId` nullable
- `status`
- `sourceType`
- `scheduledAt` nullable
- `liveMatchId` nullable
- `nextFixtureId` nullable
- `winnerEntryId` nullable
- `createdAt`
- `updatedAt`

Notes:

- for knockout, `nextFixtureId` and `bracketPosition` are enough to seed future bracket progression
- commissioner overrides should mutate fixtures without losing the fact that they were manually changed

### `LiveMatch`

Purpose:

- shared source-of-truth room for one fixture

Minimum fields:

- `id`
- `fixtureId`
- `status`
- `homeEntryId`
- `awayEntryId`
- `homeTeamId` nullable
- `awayTeamId` nullable
- `homeSubmissionId` nullable
- `awaySubmissionId` nullable
- `currentHalf`
- `currentTurnNumber`
- `activeSide`
- `startedAt` nullable
- `endedAt` nullable
- `createdAt`
- `updatedAt`

Notes:

- for leagues, use `homeTeamId` and `awayTeamId`
- for tournaments, use `homeSubmissionId` and `awaySubmissionId`
- if needed, the existing `MatchSession` can temporarily coexist as the block-dice preload layer until `LiveMatch` fully replaces it

## Config Shape

Keep the first-pass config flexible by using a typed JSON payload behind `Competition.configJson`.

### Shared config fields

- `seatCount`
- `submissionDeadline`
- `allowUnofficialRosters`
- `timerPolicy`

### League-oriented config fields

- `progressionEnabled` should always be `true`
- `fixtureStrategy`
- `standingsPolicy`

### Tournament-oriented config fields

- `tierDefinitions`
- `teamValueCapByTier`
- `extraSkillAllowanceByTier`
- `submissionRequiresApproval`
- `staticRosterLock`

### Knockout-oriented config fields

- `thirdPlaceMatch`
- `seedStrategy`
- `allowByes`

## Ownership And Authorization Rules

### Commissioner powers

The competition owner or commissioner may:

- edit competition settings
- open or close join flow
- review entries
- approve submitted tournament teams
- generate fixtures
- override fixtures
- start live matches from fixtures

### Participant powers

An entered user may:

- view competitions they joined
- submit their own team
- update their own pending submission before the deadline
- view their fixtures and live matches
- operate within their side of a live match

### Restrictions

- users may not submit teams for other users
- users may not join more than once
- users may not attach more than one team to the same competition
- tournament submissions should lock after approval or after deadline, depending on config

## Team Handling Rules

### League flow

League entries should point at a live `Team`.

Implications:

- progression continues across fixtures
- match-confirmed SPP later applies back to the same team
- injuries and value changes remain part of the persistent team record

### Tournament flow

Tournament entries should point at `CompetitionTeamSubmission`.

Implications:

- the event uses a fixed submitted snapshot
- later edits to the user's base team do not mutate event history
- event-only tier packages and extra skills belong on the submission snapshot, not on the source team

## Initial API Surface

This is the recommended first endpoint set after the current backend MVP.

### Competitions

- `POST /competitions`
- `GET /competitions`
- `GET /competitions/:competitionId`
- `PUT /competitions/:competitionId`

### Competition Entries

- `POST /competitions/:competitionId/join`
- `GET /competitions/:competitionId/entries`
- `GET /competitions/:competitionId/entries/:entryId`

### Tournament Team Submission

- `POST /competitions/:competitionId/entries/:entryId/submission`
- `PUT /competitions/:competitionId/entries/:entryId/submission`
- `GET /competitions/:competitionId/entries/:entryId/submission`
- `POST /competitions/:competitionId/entries/:entryId/approve`

### Fixtures

- `POST /competitions/:competitionId/fixtures/generate`
- `GET /competitions/:competitionId/fixtures`
- `PUT /competitions/:competitionId/fixtures/:fixtureId`

### Live Matches

- `POST /fixtures/:fixtureId/live-match`
- `GET /live-matches/:liveMatchId`
- `GET /live-matches/:liveMatchId/block-dice-context`

## Response-Shape Guidance

Do not force frontend modules to understand raw Prisma internals.

Use response shapes that map closely to current needs:

- `CompetitionSummary`
- `CompetitionDetail`
- `CompetitionEntryDetail`
- `TournamentSubmissionDetail`
- `FixtureDetail`
- `LiveMatchContext`

For block dice and other in-match tools, keep the preload payload close to the existing resolved team shape:

- team identity
- roster template id
- player list
- side assignment

## Knockout-First Workflow

### Competition setup

1. commissioner creates `Competition` with:
   - `type=TOURNAMENT`
   - `format=KNOCKOUT`
2. commissioner configures:
   - seat count
   - submission deadline
   - unofficial roster allowance
   - tier and TV rules

### Entry flow

1. users join competition
2. each user gets one `CompetitionEntry`
3. entry begins in `TEAM_PENDING`

### Team submission flow

1. user chooses one owned team
2. backend copies that team into `CompetitionTeamSubmission`
3. commissioner approves if required
4. entry moves to `TEAM_APPROVED`

### Fixture flow

1. commissioner generates bracket fixtures from approved entries
2. system creates first-round `Fixture` records
3. commissioner may override pairings before play begins

### Match flow

1. commissioner or system creates `LiveMatch` from fixture
2. live match exposes block-dice preload context
3. later passes add timer, event log, and signoff

## Migration Relationship To Current Models

### Keep now

- `League`
- `LeagueMembership`
- `MatchSession`

### Add next

- `Competition`
- `CompetitionEntry`
- `CompetitionTeamSubmission`
- `CompetitionTeamSubmissionPlayer`
- `Fixture`
- `LiveMatch`

### Transition later

- league creation can eventually become competition creation with `type=LEAGUE`
- match-session code loading can eventually be backed by `LiveMatch` instead of standalone `MatchSession`

This avoids breaking the already-tested frontend paths while the broader model lands.

## Recommended Implementation Order

### Pass 1

- add Prisma enums and core `Competition` tables
- implement competition create/list/detail
- implement join flow

### Pass 2

- implement tournament submission snapshot flow
- copy from existing `Team` and `TeamPlayer`
- enforce one submission per entry

### Pass 3

- implement knockout fixture generation
- add commissioner override path

### Pass 4

- implement `LiveMatch`
- expose block-dice preload context from fixture-backed matches

### Pass 5

- attach turn timer, event log, turn confirmation, and final signoff

## What To Avoid

- do not fork leagues and tournaments into unrelated APIs
- do not make tournaments depend on live mutable team records
- do not block the next implementation pass on full standings support
- do not overnormalize tier and bonus-skill policy before the real workflows exist
- do not rip out `MatchSession` before `LiveMatch` has replaced its useful paths

## Immediate Next Build Target

The next code pass should implement:

1. `Competition` parent model in Prisma
2. `CompetitionEntry`
3. knockout-first `POST /competitions`
4. `POST /competitions/:competitionId/join`
5. list/detail endpoints for commissioner and participant views

That gives the backend a real competition spine without prematurely expanding into full fixture or live-match administration.
