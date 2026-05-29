Status: active project direction doc

# Roadmap

## Current Product Shape

The repository is no longer a single-tool MVP.

It is now a small suite with three active layers:

- `modules/block-dice-calculator/`
  Stable tactical helper for block-dice calculation and shared match-room controls.
- `modules/team-creator/`
  Canonical team drafting and team-management module.
- `services/api/`
  Shared persistence and competition/session backend.

The current product direction is:

- one canonical saved team
- shared backend persistence
- competition-aware loading into block dice
- live progressing league teams
- frozen tournament submission snapshots

The current structural direction is:

- preserve the stable `block-dice-calculator` module
- redesign accounts, competitions, locking, and workflow boundaries around it
- separate league, matched play, and exhibition into explicit procedures instead of loose editor modes

## What Is Stable

- block-dice board editing, selection flow, and rules engine
- `WHY?` explanation flow
- import and resolved-player placement flow
- team creator drafting MVP
- roster template library and rule popups
- shared API for users, leagues, teams, competitions, fixtures, and match sessions
- fixture-backed match rooms
- shared timer, bank time, event log, turn confirmation, and final signoff

## Current Canon

The mandatory startup docs are now:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

All other docs should be treated as reference or history unless explicitly needed for the task.

## What Is Already Implemented

### Backend

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

### Competition Flow

- competition create/list/detail/join
- tournament team submission and approval
- knockout fixture generation
- fixture-attached match-room creation

### Live Match Flow

- session-code room loading in block dice
- home/away team preload from shared backend context
- shared timer and bank-time control
- match event log
- turn confirmation
- final signoff
- progression preview
- one-time live-team progression application

Current interpretation:

- this live match room should now be treated as the baseline `MATCHED_PLAY` room model
- matched play should finish by returning result/state to the competition surface
- league play should reuse the room for match logging, then continue into a separate post-game progression workflow

### Team Management

- local repository and shared API repository behind one interface
- editable `SPP`, `NI`, and `MNG`
- player lifecycle state
- active vs inactive roster presentation
- destructive action confirmation
- temporary-retirement semantics tightened against rulebook guidance
- firing guard now checks `eligible for next game >= 11`

## Canonical Team Model

### Base Team State

- roster template reference
- team identity
- purchased players
- rerolls
- assistant coaches
- cheerleaders
- dedicated fans
- apothecary
- draft budget / treasury basis

### Mutable Player State

- `playerStatus`
- `SPP`
- `missNextGame`
- `nigglingInjuries`
- `extraSkills`
- `statAdjustments`
- `currentValue`

### Competition Overlay State

- competition type and format
- team submission snapshot for tournaments
- fixture attachment
- timer policy and room operation

## Runtime Reality

The previous roadmap drifted from the real runtime model. The current important runtime facts are:

- `services/api/.env.example` defaults to `127.0.0.1:3001`
- `modules/team-creator/.env.local` currently sets:
  - `VITE_TEAM_REPOSITORY_MODE=api`
  - `VITE_API_BASE_URL=http://127.0.0.1:3001`
- browser local storage is origin-specific
- `http://localhost:5173` and `http://127.0.0.1:5173` do not share the same local browser data

## Current Constraints

- block dice must remain stable
- tournaments must remain snapshot-based
- leagues must remain live-team based
- do not fold post-game league mutation into tournament snapshot history
- do not move into standings/redraft before post-game team administration is coherent

## Immediate Next Build Target

The next real implementation direction is not a pile-on of more ad hoc features into the current mixed workflow.

The next correct sequence is:

1. freeze the architecture boundary:
   - current shared match room is the `MATCHED_PLAY` baseline
   - league progression should not be folded into the timer room itself
2. update competition creation pages so competition type and workflow intent are explicit
3. preserve block-dice compatibility as a protected contract
4. then implement:
   - matched-play ruleset enforcement and return-to-competition flow
   - explicit league pre-game flow
   - explicit league post-game flow

## Sequence After That

1. widen progression fields only where the post-game flow requires them
2. keep tournament history and live team mutation cleanly separate
3. return to richer league administration after post-game bookkeeping is stable
4. only then consider standings, league results, and redraft

## Things To Explore

- overtime rules and how they should affect timer flow, half/turn transitions, and any extra-period UI/state handling

## Explicitly Not Next

- standings
- redraft workflow
- rewriting block dice
- deleting local repository support entirely

Also not next:

- more drift-inducing documentation sprawl
- bolting full competition workflow onto the old blended team-creator flow without first separating the mode boundaries

## Deferred Cleanup

These are valid tidy-ups, but not high-ROI while foundation work is still underway:

- consider renaming account `displayName` to `coachName` across the stack once account, competition, and team-copy workflows are stable
- only do this when the rename will not create churn against block-dice compatibility or active backend/frontend integration work

## Scope Boundary

- `modules/block-dice-calculator/` remains the tactical source of truth
- `modules/team-creator/` remains the canonical team editing surface
- `services/api/` remains the shared persistence and session boundary
- event packs and league rules stay as overlays over the canonical team, not forks of it
