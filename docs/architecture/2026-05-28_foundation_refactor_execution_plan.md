Status: active implementation plan

# Foundation Refactor Execution Plan

## Purpose

This document turns the current architecture decisions into a practical build order for the foundation refactor.

It is intentionally narrow:

- start the refactor safely
- protect block-dice compatibility
- avoid rewriting modules in parallel

## Current Readiness

The project is ready to begin the foundation refactor.

Reason:

- architecture canon exists
- rewrite boundary exists
- reuse map exists
- the backend is still light enough that auth/account changes can be introduced before deeper entanglement

## Safe Starting Point

Start with:

1. account management
2. verified identity
3. competition ownership and roles
4. team-copy and locking model
5. ruleset domain foundation

Do not start with:

1. block dice rewrite
2. tactical rules rewrite
3. team-creator UI rewrite before the new domain exists
4. a full internal social messaging system

## Why This Is Safe

### Backend Is Still Thin

Current user handling is minimal:

- `POST /users`
- `GET /users/:userId`

Current frontend identity is pseudo-local:

- `CompetitionClient` auto-creates a local coach identity

That means there is low auth debt and a clean chance to put real accounts underneath the app.

### Block Dice Can Be Protected

Block dice already consumes:

- shared teams
- match-session context
- timer
- event log
- signoff

That means the refactor can happen around the tactical module, provided those contracts remain stable.

## Phase Order

## Phase 1: Account Foundation

Goal:

- replace pseudo-user creation with real user accounts

Deliver:

1. user schema expansion
   - username
   - email
   - email verified state
   - location / area
   - optional contact fields
2. auth model
   - email + password
   - magic link support path
3. account lifecycle rules
   - signup
   - verification
   - login
   - deletion eligibility checks
4. backend auth/session abstraction
   - even if the first pass is simple

Not required in this phase:

- full profile UI polish
- broad messaging system

## Phase 2: Contactability Foundation

Goal:

- ensure TO can contact participants without exposing private data broadly

Deliver:

1. verified email as required contact baseline
2. optional contact fields stored privately
3. minimal relay/notification design stub

Strong recommendation:

- do not build general internal chat now
- instead support future:
  - system emails
  - approval/rejection messages
  - TO notices

## Phase 3: Competition Domain Cleanup

Goal:

- align competitions with the new product model

Deliver:

1. competition types:
   - `LEAGUE`
   - `MATCHED_PLAY`
   - `EXHIBITION`
2. competition visibility
3. competition roles / TO powers
4. competition draft templates
5. reusable ruleset configuration shape

## Phase 4: Team Submission And Locking

Goal:

- split base teams from competition-bound copies

Deliver:

1. base team model remains editable
2. competition team copy created at submission time
3. approval/rejection flow works on the competition copy
4. lock state enforced after approval
5. allowed post-lock edits constrained correctly

## Phase 5: Ruleset Foundation

Goal:

- remove hardcoded competition assumptions from future workflow logic

Deliver:

1. configurable purse / budget
2. configurable tier mapping
3. inducement quantity + cost rules
4. configurable SPP values
5. configurable winnings modifiers

Important note:

The first pass can keep official defaults, but the system shape must allow overrides.

## Phase 6: Match Session Boundary Cleanup

Goal:

- preserve the in-game backbone while separating post-game ownership

Deliver:

1. keep:
   - timer
   - event log
   - turn confirmation
   - final signoff
2. tighten turn flow
   - events during turn
   - end turn
   - both confirm
   - advance side / drive
3. stop treating one hardcoded progression apply action as the final owner of league post-game mutation

## Phase 7: Module Refactors

Only after the domain is in place:

1. team creator workflow split
2. matched-play builder workflow
3. league pre-game flow
4. league post-game flow

This is where module refactors should happen.

Not before.

## What Can Wait

These are later layers:

- bracket generation
- round robin generation
- standings
- richer commissioner tooling
- internal messaging beyond lightweight contact relay

## Immediate Recommended Next Code Slice

If implementation starts now, the best first code slice is:

1. add real account fields and auth scaffolding to the backend domain
2. stop auto-creating anonymous competition identities
3. introduce a stable authenticated user concept in frontend API clients

This is the cleanest first cut because it improves the whole product without disturbing block dice.

## Practical Risk Rule

If a change touches:

- block-dice tactical rules
- block-dice expected session/team payloads

then it is high risk and should be deferred unless the compatibility layer is already in place.

If a change touches:

- accounts
- competition metadata
- submission flow
- locking state

then it is a safe foundation candidate.
