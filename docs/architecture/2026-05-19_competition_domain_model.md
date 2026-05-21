# Competition Domain Model

## Purpose

Define the next domain layer above teams and match sessions for the full Blood Bowl aid system.

This note exists to lock the product direction before more implementation work:

- leagues and tournaments are different
- both reuse most of the same infrastructure
- leagues use progressing teams
- tournaments use static submitted teams
- live matches should sit inside a larger competition model rather than remain ad hoc sessions forever

## Top-Level Product Shape

The toolkit is becoming a full competition support system, not just a block calculator.

Core user-facing capabilities:

- competition creation and administration
- player invites and seat management
- team ownership and submission
- fixture or bracket generation
- live shared match room
- block calculator
- turn timer with bank time
- SPP and match-event logging
- end-of-turn confirmations
- final match signoff

## Canonical Hierarchy

The preferred hierarchy is:

1. `User`
2. `Competition`
3. `CompetitionEntry`
4. `CompetitionTeamLink`
5. `Fixture`
6. `LiveMatch`
7. `MatchEventLog`

This should replace any temptation to model the future product as only:

- teams
- loose sessions
- standalone utilities

## Competition Parent Model

Use one shared parent entity:

- `Competition`

This parent should hold:

- owner or commissioner user
- name
- description
- seat count or max entrants
- invite/join policy
- submission deadline
- publication state
- competition type

Suggested type values:

- `LEAGUE`
- `TOURNAMENT`

Reason:

- league and tournament reuse most workflows
- format-specific behavior can sit under typed config instead of forking the entire system too early

## League vs Tournament Split

### League

League behavior:

- teams persist across the season
- progression is live
- SPP, injuries, value, and roster state continue from match to match
- fixtures and standings matter over time

So league entries should reference a live persistent team.

### Tournament

Tournament behavior:

- one team per user per event
- user joins first and can submit team later
- event can define a submission deadline
- the submitted team should be static for that event
- event rules such as tier-based bonuses should not mutate the user’s long-term source team

So tournament entries should reference a frozen event submission snapshot, not a live progressing team.

## Entry Model

Use a shared entry concept:

- `CompetitionEntry`

Minimum fields:

- `id`
- `competitionId`
- `userId`
- `status`
- `joinedAt`
- `submittedAt` nullable
- `approvedAt` nullable

Suggested status progression:

- `JOINED`
- `TEAM_PENDING`
- `TEAM_SUBMITTED`
- `TEAM_APPROVED`
- `WITHDRAWN`

This matches the intended flow:

1. user joins competition
2. user submits team later
3. commissioner can review or approve if needed

## Team Link Model

Do not use one team-link strategy for both competition types.

### League Team Link

For leagues:

- `CompetitionEntry` should point at a live team id

Example field:

- `liveTeamId`

### Tournament Team Submission

For tournaments:

- `CompetitionEntry` should point at a frozen event snapshot

Suggested entity:

- `TournamentTeamSubmission`

Minimum fields:

- `id`
- `competitionEntryId`
- `sourceTeamId` nullable
- `rosterTemplateId`
- `teamName`
- full submitted player snapshot
- team value at submission
- tier assignment
- applied event bonuses or extra skills
- submittedAt

Reason:

- preserves event legality
- preserves historical records
- avoids future edits to the source team mutating tournament history

## Rules and Eligibility

There is one Blood Bowl ruleset baseline, so ruleset divergence is not the main problem.

The actual configuration surface is event policy:

- official-only vs allow unofficial teams
- TV cap
- tier assignment per team
- extra skills by tier
- extra skill value by tier
- progression allowed or static roster
- submission deadline

Suggested config split:

- shared `CompetitionConfig`
- type-specific extension objects:
  - `LeagueConfig`
  - `TournamentConfig`

## Tournament Formats

Tournament support should be designed broadly, but implementation should start with:

- `KNOCKOUT`

Hooks should remain open for:

- `SWISS`
- `ROUND_ROBIN`
- others later if justified

Suggested field:

- `format`

Initial values:

- `KNOCKOUT`
- `SWISS`
- `ROUND_ROBIN`

Only `KNOCKOUT` needs first-class implementation immediately.

## Fixture Model

Use a generic fixture entity:

- `Fixture`

Minimum fields:

- `id`
- `competitionId`
- `roundNumber`
- `homeEntryId`
- `awayEntryId`
- `status`
- `scheduledAt` nullable
- `resultId` nullable

For knockout:

- allow future bracket metadata such as:
  - `bracketPosition`
  - `nextFixtureId`

Commissioner behavior:

- fixtures are generated automatically
- commissioner may override them manually

So fixture generation should not be a destructive one-shot; it should support override state.

## Live Match Model

Use one shared source-of-truth room:

- `LiveMatch`

This is important:

- not one isolated room per player
- one shared match room
- both players operate inside the same logical match state

Minimum fields:

- `id`
- `fixtureId`
- `status`
- `homeEntryId`
- `awayEntryId`
- `currentHalf`
- `currentTurnNumber`
- `activeSide`
- `startedAt`
- `endedAt`

## Confirmation Model

Per user input:

- major events should not require constant per-click dual confirmation
- confirmation should happen at the end of the turn sequence
- full signoff happens at the end of the match

Suggested entities:

- `TurnConfirmation`
- `FinalMatchSignoff`

### Turn Confirmation

Minimum fields:

- `id`
- `liveMatchId`
- `turnNumber`
- `half`
- `side`
- `confirmedByHomeUser`
- `confirmedByAwayUser`
- `confirmedAt`

### Final Match Signoff

Minimum fields:

- `id`
- `liveMatchId`
- `homeUserConfirmedAt`
- `awayUserConfirmedAt`
- `resolvedAt`

## Timer Model

Organiser-controlled timer policy:

- per turn timer
- bank time
- bank resets at halftime

Suggested entities:

- `TimerPolicy`
- `LiveTimerState`

### TimerPolicy

Minimum fields:

- `perTurnSeconds`
- `bankSeconds`
- `bankResetsAtHalf`
- `enabled`

### LiveTimerState

Minimum fields:

- `liveMatchId`
- `homeBankRemainingSeconds`
- `awayBankRemainingSeconds`
- `turnStartedAt`
- `activeTimerState`

## Match Event Log

The first implementation should stay small.

Record during play:

- touchdowns
- casualties
- completions
- interceptions
- throw team-mate completion or landing edge cases where needed
- optional notes

Confirm at turn end, then finalize at match end.

Suggested entity:

- `MatchEvent`

Minimum fields:

- `id`
- `liveMatchId`
- `turnNumber`
- `half`
- `eventType`
- `teamEntryId`
- `playerId` nullable
- `value`
- `createdByUserId`
- `createdAt`
- `isConfirmed`

Suggested initial event types:

- `TOUCHDOWN`
- `CASUALTY`
- `COMPLETION`
- `INTERCEPTION`
- `THROW_TEAM_MATE_COMPLETION`
- `THROW_TEAM_MATE_SAFE_LANDING`
- `MVP_ASSIGNMENT`
- `NOTE`

## SPP Model

Base SPP rules confirmed from the current requirements:

- touchdown: `3`
- casualty: `2`
- completion: `1`
- interception: `2`
- MVP: `4`

Tournament and league differ here:

- leagues should eventually apply confirmed SPP back to live team progression
- tournaments may still record SPP for match history, but should not mutate a static event roster unless the event explicitly supports progression

So the system should distinguish:

- `recorded match SPP`
- `applied progression SPP`

## Immediate Implementation Guidance

Do not jump straight into full standings or full tournament admin.

Recommended next implementation order:

1. introduce `Competition` parent model and config shape
2. implement knockout-first tournament setup
3. implement entry join + pending team submission workflow
4. implement fixture generation with override hooks
5. connect `LiveMatch` to `Fixture`
6. then extend live match tools:
   - session preload
   - turn timer
   - small event log
   - confirmation flow

## What To Avoid

- do not treat leagues and tournaments as completely separate products
- do not use live progressing teams for tournament history
- do not overbuild standings before fixture and live match structure exists
- do not couple block-dice logic directly to event administration
- do not require full granular dual confirmation for every click during live play

## Recommended Immediate Next Step

Use this model to rewrite the roadmap around:

- `Competition`
- knockout-first tournament flow
- league progression vs tournament snapshot split
- live match room with timer and event confirmation
