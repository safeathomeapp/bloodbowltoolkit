Status: canonical architecture doc

# Architecture Canon

This is the single canonical architecture document for startup context.

If another planning doc disagrees with this file, this file wins unless the user explicitly says otherwise.

## Core Constraint

`modules/block-dice-calculator/` is working and must remain compatible.

Protected rule:

- do not rewrite block dice as part of the architecture cleanup
- do not break its team/session inputs
- preserve payload shapes or add adapters

## System Areas

Primary system areas:

1. accounts
2. teams
3. competitions
4. competition rulesets
5. match sessions
6. block dice integration

## Accounts

Users must have an account to:

- save teams
- create competitions
- join competitions

Account basics:

- coach display name
- email
- verified email
- town / city
- country

Auth:

- email + password
- magic link

Account deletion:

- blocked if user has an approved team in an active competition

Contact rule:

- TO must have at least one way to contact participants
- verified email is the guaranteed baseline
- optional contact methods should default to private / opt-in

## Competition Types

Three modes exist:

1. `LEAGUE`
2. `MATCHED_PLAY`
3. `EXHIBITION`

They are distinct workflows.

### League

League is:

- persistent
- destructive on the competition-bound team copy
- pre-game and post-game driven

League owns:

- `SPP`
- `MNG`
- `NI`
- treasury
- winnings
- dedicated fans
- progression
- fixture/round inducements

### Matched Play

Matched play is:

- event-bound
- locked on submission/approval
- non-destructive in progression terms

Current implementation boundary:

- the current shared match room / timer / event-confirmation flow should now be treated as the matched-play baseline
- after matched-play final signoff, the system should return to competition context instead of continuing into roster mutation

Matched play owns:

- event budget
- tier validation
- skill points
- inducement configuration
- star player restrictions

Matched play does not own:

- persistent injuries
- persistent SPP
- post-game progression

### Exhibition

Exhibition is:

- permissive
- low-friction
- mostly free-form

Expected behavior:

- warnings reduced or disabled
- no heavy lock/progression workflow

## Competitions

A competition is created by a user.

Visibility:

- `PUBLIC`
- `INVITE_ONLY`

Invite mechanisms:

- URL
- QR code

Roles:

- creator
- TO / manager
- delegated limited manager
- participant

TO / manager powers include:

- approve / reject submissions
- unlock before competition start
- override match confirmation / signoff
- force-close a match

## Competition Draft Templates

Competitions should be creatable from:

- official league preset
- official matched-play preset
- saved draft template

Draft templates should store:

- type
- format
- budget rules
- tier mapping
- allowed rosters
- inducement settings
- other event-specific rule edits

## Entry Flow

Competition admission is player-first, then team submission.

Flow:

1. user joins competition
2. user occupies a slot
3. user submits a team before the deadline
4. submission creates a competition-bound copy immediately
5. TO approves or rejects the submission
6. rejection includes a reason
7. player edits the competition copy and resubmits
8. approval locks the player and the competition team into the event

One player, one team:

- one coach / one team in a league
- one coach / one team in a matched-play event

## Team Model

Two important team concepts exist:

1. `Base Team`
2. `Competition Team Copy`

### Base Team

The user's normal editable team.

### Competition Team Copy

Created at submission time.

Properties:

- competition-bound
- separately visible
- separately named
- locked by competition rules

Naming rule:

- competition copy gets the double-barrelled competition name
- original team remains unchanged

Visibility rule:

- show editable teams separately from competition teams
- keep both visible to the user

## Locking

Once approved into a competition, a competition team copy is locked.

Applies to:

- league
- matched play

TO unlock window:

- allowed until competition start

Allowed edits after lock:

- team name
- player names
- shirt numbers / list order

Ordinarily disallowed after lock:

- roster composition
- skills
- inducements
- anything that changes gold cost
- anything that changes TV

## Rulesets

Each competition has a ruleset that drives validation.

Shared ruleset areas:

- budget
- roster allow/disallow
- inducement settings
- format
- deadlines

League-specific ruleset areas:

- initial purse
- fixture timing
- submission / locking deadlines
- inducement restrictions

Matched-play ruleset areas:

- event purse
- tier mapping
- skill points
- inducement quantity caps
- inducement costs
- star player restrictions

Inducement configuration needs:

- quantity cap
- cost

If quantity is `0`, treat as disallowed.

Tier model:

- one official default tier list
- local competition overrides allowed
- preferred long-term UI is drag/drop between Tier 1 / 2 / 3 / 4 / Not Allowed

## Workflow Boundaries

### League

League should have explicit:

- draft
- pre-game
- match
- post-game

Post-game should own:

- results
- winnings
- fans
- SPP assignment
- advancement
- dead-player cleanup
- hiring/firing/temp retirement
- expensive mistakes

### Matched Play

Matched play should have explicit:

- build
- inducement selection after roster draft
- lock

No persistent post-game progression.

### Exhibition

Minimal workflow only.

## Match Sessions

Match sessions remain the tactical and event-recording layer.

They should continue to support:

- team preload
- participants
- event log
- turn confirmation
- final signoff

Important boundary:

- match session should not remain the long-term place where all league post-game mutation is applied directly as one shortcut
- the current match session model is the correct baseline for `MATCHED_PLAY`
- `LEAGUE` should reuse match sessions for tactical logging, then hand off into a separate explicit post-game sequence

## Rewrite Scope

Rewrite targets:

- accounts
- team creator workflow structure
- competition lifecycle
- ruleset management
- locking / approval
- competition-bound team-copy management

Non-rewrite target:

- tactical block-dice rules engine

Likely reusable:

- roster template data
- parts of shared types
- parts of match-session API shape
- block-dice tactical rules
- team import/resolution logic where clean

Likely not worth preserving as-is:

- blended draft/live/progression team-creator workflow
- draft-budget arithmetic as league treasury
- always-on lifecycle actions in generic editor views

## Canonical Startup Rule

At session start, read:

1. `docs/SESSION_BRIEF.md`
2. this file

Nothing else should be mandatory startup reading unless the task explicitly requires it.

## Implementation Follow-Up

If the session moves from architecture into implementation planning, reuse decisions, or rewrite scoping, then also read:

- `docs/architecture/2026-05-28_codebase_reuse_map.md`
- `docs/architecture/2026-05-28_foundation_refactor_execution_plan.md`
