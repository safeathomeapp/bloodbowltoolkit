# Roadmap

## Stable Baseline

- `modules/block-dice-calculator/` is stable working MVP software
- `modules/team-creator/` is now a working local-first drafting MVP
- roster templates are seeded from uploaded rulebook screenshots
- skill popups and draft-rule help popups are wired into the team creator
- persistence is still local to the browser through a repository boundary

## Design Direction

- treat the team creator as the `team management module`, not only a draft screen
- keep one canonical saved team record
- layer `draft rules`, `progression`, `league rules`, and `event/tournament rules` on top of that record
- do not bake one specific event pack or league format directly into the core team schema

## Canonical Data Split

### Base Team State

- roster template reference
- team identity
- purchased players
- rerolls
- assistant coaches
- cheerleaders
- dedicated fans
- apothecary
- treasury
- team value

### Player Progression State

- SPP
- injuries
- miss next game
- added skills
- stat increases or decreases
- current player value adjustments

### Ruleset And Event Overlay State

- draft budget
- resurrection or league flag
- tiering
- bonus TV
- bonus skills
- event-specific restrictions
- redraft or competition constraints

## Completed Phases

- repository cleanup and branch consolidation onto `main`
- stable packaging of the block-dice app under `modules/block-dice-calculator/`
- local-first `modules/team-creator/` scaffold
- rulebook-backed roster template library
- roster template audit coverage
- first-pass `bbroster`-style team creator frontend
- saved team vault flow
- one-page draft sheet flow
- clickable skill reference popups
- draft-rule help popups for team-building controls

## Current State

- the team creator is good enough to count as an MVP drafting tool
- the team creator is still local-first and single-user
- the block-dice module is still separate and stable
- there is no backend service in the repository yet
- the latest block-dice team import work proved that cross-device flow is now the main blocker

## Route Pivot

As of `2026-05-19`, the practical product flow is now understood more clearly:

- Player A and Player B should be able to operate on separate devices
- league or competition context should identify who is playing whom
- block dice should load the correct teams automatically from that shared context

Because of that, the earlier order of `more local-first team depth first, backend later` is no longer the best route.

The team creator MVP has already done its main job:

- validate the saved team model
- validate roster template data
- validate first-pass block-dice team loading

The next blocker is shared persistence and shared match/session loading.

## Competition Direction

The product direction is now clearer than `teams plus tools`.

The toolkit is becoming a full Blood Bowl competition aid system:

- competitions are created and administered by a commissioner
- users join competitions first and can submit teams later
- one user can enter only one team per competition
- leagues and tournaments share most infrastructure
- leagues use live progressing teams
- tournaments use static submitted team snapshots
- live matches happen in one shared room used by both players
- in-match tooling should include:
  - block calculator
  - turn timer with bank time
  - SPP and event logging
  - turn-end confirmation
  - final signoff

See:

- `docs/architecture/2026-05-19_competition_domain_model.md`
- `docs/architecture/2026-05-19_competition_backend_spec.md`

## Execution Order

### Phase 1: Lock The Existing Frontend MVPs

- keep improving the team creator only where it removes clear friction
- do not broaden scope without protecting the current working flow
- keep block-dice integration stable enough for reference use
- avoid large new frontend rewrites while the shared data model is introduced

### Phase 2: Define Shared Backend Contracts

- define the minimal shared entities needed for real multi-user flow
- include:
  - user
  - league
  - league membership
  - team ownership
  - match or session identity
  - side assignment for a given session
- keep the canonical saved-team model intact while moving persistence behind a shared interface

### Phase 3: Introduce Backend Infrastructure

- create `services/api/`
- keep repository boundaries explicit
- start with the minimum persistence and API surface needed for:
  - league creation
  - joining a league
  - saving teams under a user or league context
  - creating or loading a match session
- this phase is now largely in place for the MVP backend slice

### Phase 4: Introduce Competition Domain

- add a shared `Competition` parent model
- start with knockout-first tournament support
- keep extension hooks for:
  - swiss
  - round robin
- define:
  - competition entries
  - team submission deadline
  - live league team links
  - static tournament team snapshots
  - fixture generation with commissioner override hooks

### Phase 5: Replace Local-Only Team Loading

- migrate the team creator away from browser-only storage as the main path
- keep local-only mode only if still useful as a fallback or temporary offline mode
- remove the need for manual export/import to move teams between apps or devices

### Phase 6: Preload Teams Into Block Dice From Match Context

- allow block dice to open with attacker and defender context already known
- support:
  - player-selected team assignment
  - fixture or match-code loading
- session-based side designation
- keep block-dice calculation logic independent from progression and event logic
- treat this as a data-source integration, not a rewrite

### Phase 7: Add Live Match Room Tools

- move from loose sessions toward shared live match rooms attached to fixtures
- start small:
  - turn timer
  - bank time
  - bank reset at halftime
  - small SPP event log
  - turn-end confirmation
  - final signoff
- keep this implementation extensible for fuller match administration later

### Phase 8: Add Player Progression On Top Of Shared Teams

- add editable player progression fields to the roster editor
- support:
  - SPP
  - injuries
  - miss next game
  - added skills
  - stat changes
  - current player value overrides
- keep progression as mutable player state, not as edits to the roster template
- apply this only once the shared team identity and storage model are stable

### Phase 9: Introduce Ruleset Profiles And Event Overlays

- add a `ruleset profile` concept above the base team
- first profiles should cover:
  - standard draft
  - league team
  - resurrection event
  - exhibition
- support one-day and tournament-specific modifiers
- include optional event data such as:
  - tier
  - bonus gold or TV
  - free skills
  - special roster restrictions
- make these saveable as explicit event entries or applied views
- do not overwrite the underlying base team silently

### Phase 10: League Tooling

- add competition and league workflows only after team and progression models are stable
- support:
  - leagues
  - fixtures
  - results
  - standings
  - redraft support if still justified
- keep league administration as a separate layer above core team management

## Immediate Next Step

- build the fixture layer on top of the new competition spine:
  - knockout fixture generation from approved entries
  - commissioner override support
  - simple fixture review surface
  - keep the path open for fixture-backed live matches next
- continue using `docs/architecture/2026-05-19_competition_backend_spec.md` as the backend contract

## Deferred Until Proven Necessary

- authentication
- multi-user collaboration
- online play
- match simulation
- probability helpers outside the block-dice tool
- advanced permissions
- background jobs
- microservice split

## Scope Boundary

- `modules/block-dice-calculator/` remains stable working software
- `modules/team-creator/` remains the place for team drafting and management
- `services/api/` should become the shared persistence and session layer
- event and league logic should sit on top of base team data, not distort it
- backend work should now solve the proven cross-device workflow blocker, not chase speculative platform complexity
