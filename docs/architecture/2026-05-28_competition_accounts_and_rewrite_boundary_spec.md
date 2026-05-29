Status: reference architecture deep dive

# Competition, Accounts, And Rewrite Boundary Spec

This file is a detailed supporting spec.

For startup canon, use:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

## Purpose

This document defines the next stable architecture target for:

- user accounts
- competitions
- competition rulepacks
- team locking
- league play workflows
- matched play workflows
- exhibition boundaries
- rewrite scope

It also defines a strict compatibility boundary for the working `block-dice-calculator` module.

This is the planning contract to use before further structural implementation.

## Non-Negotiable Constraint

`modules/block-dice-calculator/` is working software and is not the rewrite target.

The surrounding system may be redesigned, but the new architecture must continue to feed the block dice module without regressions.

Implication:

- block dice is a protected integration consumer
- new backend and team/competition flows must preserve or adapter-wrap the current data it needs
- database fields and API response shapes should be treated as contracts unless deliberately versioned

## Product Modes

The system now has three distinct states of play:

1. `LEAGUE`
2. `MATCHED_PLAY`
3. `EXHIBITION`

These are not simple validation presets.

They are different operational workflows.

### League

League play is:

- persistent
- destructive to the competition-bound team copy
- pre-game and post-game driven
- progression-aware

League owns:

- persistent injuries
- `MNG`
- `NI`
- `SPP`
- treasury
- winnings
- dedicated fans
- roster mutation across the season
- fixture-based inducements
- team locking

### Matched Play

Matched play is:

- competition-bound
- locked once submitted/approved
- non-destructive in progression terms
- ruleset-driven at competition level

Matched play owns:

- event budget
- roster legality against event rules
- tier assignment
- skill point spending
- inducement configuration
- star player limits

Matched play does not own:

- persistent post-game injuries
- persistent SPP
- persistent advancement from matches

### Exhibition

Exhibition is:

- permissive
- non-persistent in progression terms
- intentionally low-friction

Exhibition should mostly:

- reuse team editing surfaces
- reduce or disable legality warnings
- avoid league and matched-play lock workflows

## User Account Model

Users must have an account if they want to:

- save teams
- join competitions
- create competitions

### Required Account Fields

- coach display name
- email
- email verification status
- town / city
- country

### Authentication

Support:

- email + password
- magic link

### Contactability Rule

A TO must have at least one way to contact competition participants.

Preferred solution:

- verified email as baseline
- platform-routed contact / relay rather than broad public contact exposure

This avoids building a full internal messaging system while avoiding unnecessary privacy exposure.

### Deletion Rule

Account deletion must be blocked if the user has an approved team in an active competition.

## Competition Model

A competition is created by a user.

Competition types:

- `LEAGUE`
- `MATCHED_PLAY`
- `EXHIBITION`

### Competition Visibility

- `PUBLIC`
- `INVITE_ONLY`

Invite access should support:

- URL
- QR code

### Competition Roles

At minimum:

- creator
- manager / TO
- delegated limited manager
- participant

### Override Authority

Managers / TOs can override:

- approval / rejection
- unlocking before competition start
- match confirmation / signoff decisions
- force-closing a match
- broader competition administration

## Competition Draft Templates

Competitions should be creatable from:

- official default league ruleset
- official default matched-play ruleset
- saved custom draft template

Competition draft templates should store:

- competition type
- format
- budget rules
- tier mapping
- allowed rosters
- inducement rules
- other event-specific rule edits

## Competition Entry Model

Competition admission is player-first, then team submission.

### Flow

1. User joins competition.
2. User occupies a slot.
3. User has a defined time window to choose and submit a team.
4. Submission creates a competition-bound copy immediately.
5. TO approves or rejects the submitted competition copy.
6. Rejection includes a reason text.
7. Player edits the competition copy and resubmits if needed.
8. Approval locks the player and the submitted team into the competition.

### Withdrawal

If a participant wants to leave:

1. player requests leave
2. TO confirms
3. slot becomes available again

## Team Model Split

The architecture should distinguish between:

1. `Base Team`
2. `Competition Team Copy`

### Base Team

This is the user's normal editable team.

Used for:

- normal drafting
- non-competition editing
- future submissions into competitions

### Competition Team Copy

This is created at submission time.

Characteristics:

- competition-bound
- separately named
- separately visible
- locked by competition rules

Naming rule:

- the competition copy takes a double-barrelled competition name form
- the original team remains unchanged

### Visibility Rule

Competition teams should be shown separately from normal teams, but still remain visible to the user.

Suggested split:

- editable teams
- competition teams

## Locking Rules

### Common Lock Rule

Once a team is approved into a competition, it is locked.

This applies to:

- league
- matched play

### League Lock

League lock exists because the competition copy will progress destructively over time.

### Matched Play Lock

Matched play lock exists to freeze the event roster and event setup.

It is not destructive in progression terms, but it is still event-bound and locked.

### Unlock Window

TOs and managers can unlock up until competition start.

### Allowed Edits After Lock

Allowed on locked competition teams:

- team name
- player names
- shirt numbers / list order

Not allowed as ordinary edits:

- roster composition
- skills
- inducements
- anything that changes cost
- anything that changes TV

## League Workflow

League needs explicit workflow surfaces.

### League Draft

Initial team creation before competition submission.

### League Pre-Game

Should own:

- fixture-specific inducements
- next-fixture availability
- journeymen handling
- pre-match validation against active roster state

### League Match

Block dice and match session remain the tactical and event-recording layer.

This layer should record:

- touchdowns
- completions
- interceptions
- casualties
- other match facts needed later

### League Post-Game

Should explicitly own:

- result recording
- winnings
- dedicated fans update
- SPP assignment
- advancement decisions
- dead-player cleanup
- hiring
- firing
- temporary retirement
- expensive mistakes
- prepare-for-next-fixture state

### Important Rule

Match session should not remain the long-term place where all league post-game mutation is applied directly as one shortcut.

It can provide inputs and previews, but the workflow boundary should be explicit.

## Matched Play Workflow

Matched play needs a distinct builder workflow.

### Matched Play Build

Should own:

- event budget
- roster construction
- dedicated fans from matched-play defaults
- inducement purchase after roster draft
- tier-based skill points
- star player limits
- allowed/disallowed rosters

### Matched Play Lock

Once roster and inducements are finalized and approved:

- team copy locks
- event roster freezes

### No Persistent Post-Game Layer

Matched play should not apply:

- persistent injuries
- persistent SPP
- persistent advancement

## Exhibition Workflow

Exhibition should remain minimal.

Suggested behavior:

- free-form roster editing
- warnings disabled or downgraded
- no competition locking unless explicitly attached to an exhibition competition later

## Ruleset Model

Each competition should have a ruleset object that drives validation.

### Shared Ruleset Areas

- budget
- roster limits
- roster allow / disallow list
- inducement settings
- format
- entry deadlines

### League Ruleset Areas

- initial purse
- fixture timing
- submission / locking deadlines
- inducement restrictions

### Matched Play Ruleset Areas

- event purse
- tier mapping
- skill point amounts
- inducement quantity caps
- inducement costs
- star player restrictions

### Inducement Model

Inducements need:

- quantity cap
- cost

If quantity is `0`, the inducement is effectively disallowed.

### Tier Model

There is one official default tier list.

Competitions may override it locally.

Those overrides should be storable in the reusable competition draft/template.

Preferred UI target:

- drag-and-drop roster assignment between Tier 1 / 2 / 3 / 4 / Not Allowed

## Approval Model

The current submission approval flow should become the universal competition entry approval flow.

Approval should check legality against the competition ruleset.

If rejected:

- TO enters reason text
- player edits the competition copy
- player resubmits

## Stable Block Dice Compatibility Contract

### What Must Stay True

1. Block dice must continue loading resolved team/session context reliably.
2. Active roster visibility must remain correct.
3. Competition state must not force a rewrite of the tactical rules engine.
4. Match-session data must remain sufficient for:
   - team preload
   - live room participation
   - event logging
   - turn confirmation
   - final signoff

### Protected Boundaries

The following areas should be treated as protected integration boundaries:

- shared team identity fields used by block dice
- player identity and shirt number resolution
- active/inactive player filtering
- session home/away team load behavior
- competition snapshot vs live-team distinction

### Allowed Refactor Style

If internal persistence changes:

- preserve output shape where possible
- otherwise add adapters
- do not casually rename public payload fields that block dice consumes

### Current Practical Rule

Rewrite around block dice, not through block dice.

## Rewrite Scope

### Rewrite Targets

The messy rewrite target is primarily:

- account model
- team creator workflow model
- competition lifecycle
- ruleset management
- locking and approval
- competition-bound team-copy management

### Non-Rewrite Target

Do not rewrite the tactical block dice rules engine as part of this architectural cleanup.

### Safe Reuse Candidates

Likely reusable with cleanup/testing:

- roster template data
- some shared team/player types
- parts of match-session API shape
- block dice tactical rules
- team import / resolution logic where clean

### Unsafe Reuse Candidates

Likely not worth preserving as-is:

- blended team-creator draft/live/progression workflow
- current treasury-as-draft-budget arithmetic for league teams
- always-on lifecycle actions in generic editor views
- competition logic embedded without explicit mode boundaries

## Recommended Rewrite Timing

The rewrite should happen after this architecture is accepted, but before substantially more competition logic is bolted onto the current code.

That means:

1. freeze the product model now
2. write regression tests around correct current behavior
3. define compatibility adapters for block dice
4. build the fresh codebase or fresh app shell for:
   - accounts
   - teams
   - competitions
   - rulesets
5. port only clean or test-backed logic

## Recommended Delivery Order

### Pass 1

Write and accept:

- domain entities
- state transitions
- compatibility boundaries

### Pass 2

Implement accounts and verified identity.

### Pass 3

Implement competition creation and reusable draft templates.

### Pass 4

Implement base-team vs competition-copy submission flow.

### Pass 5

Implement competition approval, locking, and TO controls.

### Pass 6

Implement matched-play roster validation and ruleset enforcement.

### Pass 7

Implement explicit league pre-game and post-game workflows.

### Pass 8

Only after the above, revisit bracket generation, round-robin generation, standings, and later competition administration depth.

## Remaining Open Point

The only meaningful open design point still visible from the current planning pass is:

- whether optional contact methods such as WhatsApp / Steam should be stored as private profile fields, competition-visible opt-in fields, or admin-only relay metadata

The safer default is:

- private by default
- opt-in if exposed
- verified email remains the guaranteed baseline contact route
