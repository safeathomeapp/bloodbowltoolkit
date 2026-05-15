# Roadmap

## Completed Phases

- Repository bootstrap
- React + TypeScript + Vite scaffold
- PWA and Vitest baseline
- Documentation foundation
- 7x7 tactical grid foundation
- Token placement flow
- Blocker and target selection flow
- Standalone assist and block-dice rules engine
- Why explanation bottom-sheet
- Mobile UI stabilization and local-only persistence
- Final MVP cleanup and Codex handoff
- UX revision review and roadmap reset
- Edit / Calculate mode architecture
- Standard adjacent preview overlays
- Blitz preview and non-adjacent target overlays
- Candidate attack squares, square-specific Why, and explicit invalidation
- Candidate-square readability refinement
- Tie-aware blitz candidate ranking
- Player cards and contextual attacker controls
- Board-header mode switch and edit-card refactor
- Stable module packaging of the block-dice app under `modules/block-dice-calculator/`

## Current State

- `modules/block-dice-calculator/` is the stable working software and current source of truth
- PostgreSQL is available locally and is the intended persistence layer for the next phase
- No backend service exists in the repository yet

## Execution Order

### Phase 1: Mainline And Repository Hygiene

- merged the MVP PR into `main`
- replaced the historical default branch with `main`
- preserved `modules/block-dice-calculator/` as the working module boundary
- aligned root docs with the suite/module structure

### Phase 2: Backend Foundation

- Create a backend service under `services/api/`
- Use `Node + TypeScript`
- Add a web framework:
  - preferred default: `Fastify`
- Connect to PostgreSQL
- Add database migrations
- Add environment-variable handling
- Add schema validation for request and response payloads
- Add baseline health and version endpoints

### Phase 3: Core Domain Model

- Define persistent entities for:
  - player profiles
  - rosters
  - roster players
  - teams
  - team players
  - leagues
  - competitions
  - fixtures
  - results
  - standings
- Separate reusable profile data from competition-specific team state
- Document the backend data model before building broad UI on top of it
- Keep roster-template data separate from saved team/player state so 20+ team types can share one creator flow

### Phase 4: Roster Builder

- Build CRUD for player profiles
- Build CRUD for rosters
- Support adding players to rosters with role, stats, skills, and cost fields
- Support creating teams from rosters
- make the creator template-driven rather than building around a single hardcoded team
- Decide whether roster content is:
  - freeform user-defined first
  - seeded from Blood Bowl reference data first
- Add import/export for roster data if still justified after CRUD is stable

### Phase 5: League And Competition Creator

- Build CRUD for leagues
- Build CRUD for competitions inside leagues
- Define supported competition formats:
  - round robin
  - knockout
  - swiss
  - or configurable later if justified
- Build fixture generation
- Build result entry
- Build standings calculation

### Phase 6: Integration Back Into The Block-Dice Module

- Allow `modules/block-dice-calculator/` to retrieve saved players, rosters, and teams
- Keep the existing local tactical workflow usable even before remote data is selected
- Avoid coupling block-dice calculation logic to league-management concerns
- Treat backend integration as a data-source enhancement, not a rewrite of the module

### Phase 7: Operational Hardening

- Add authentication only if multi-user access is a real requirement
- Add audit/history only if league administration needs it
- Add deployment and backup notes
- Add seed scripts and local developer setup docs

## Active Next Step

- Start Phase 2 by scaffolding `services/api/` and connecting it to the local PostgreSQL instance

## Deferred Until Proven Necessary

- Probability helpers
- Full game simulation
- Turn sequencing
- Online play
- Advanced permissions model
- Background job infrastructure
- Microservice split

## Scope Boundary

- The existing block-dice module remains stable working software
- New backend and suite work must integrate with that module instead of destabilizing it
- Roster, league, and competition tooling should be built in deliberate phases, not mixed into one oversized pass
