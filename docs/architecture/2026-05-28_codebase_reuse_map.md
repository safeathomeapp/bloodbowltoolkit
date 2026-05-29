Status: active implementation reference

# Codebase Reuse Map

## Purpose

This document maps the current codebase into four buckets:

1. `Keep`
2. `Keep With Adapter`
3. `Refactor`
4. `Replace`

Use this when deciding what should survive into the next architecture and what should not.

This file is an implementation-oriented companion to:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

## Reading Rule

This file is not canonical product truth.

It is the canonical implementation reuse reference.

If this file conflicts with:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

then the canon docs win.

## Summary

### Keep

- block dice tactical rules
- block dice UI flow
- roster template data
- repository abstraction pattern
- match-session event/timer/signoff concept

### Keep With Adapter

- block-dice API client contract
- saved-team to imported-team mapping
- shared team/session payload shapes consumed by block dice

### Refactor

- Prisma schema
- shared team types
- competition entities
- match-session progression behavior
- team repository implementations
- reusable team math utilities

### Replace

- blended team-creator workflow composition
- hardcoded drafting-economy assumptions as live-team truth
- hardcoded progression constants as league truth
- generic always-on roster actions standing in for explicit workflows

## Reuse Map By Area

| Area | Current Location | Decision | Why |
| --- | --- | --- | --- |
| Tactical block rules | `modules/block-dice-calculator/src/tools/block-dice/rules/` | Keep | Stable and already solving the right problem cleanly. |
| Tactical tests | `modules/block-dice-calculator/src/tools/block-dice/tests/` | Keep | Protects the stable tactical contract. |
| Block dice UI | `modules/block-dice-calculator/src/tools/block-dice/components/BlockDiceCalculator.tsx` | Keep with targeted cleanup only | Working module; do not rewrite as part of broader cleanup. |
| Team import adapter | `modules/block-dice-calculator/src/shared/integration/resolveImportedTeam.ts` | Keep With Adapter | Correct pattern: maps canonical team records into tactical-use shape. |
| Match-session API client | `modules/block-dice-calculator/src/shared/integration/matchSessionApi.ts` | Keep With Adapter | Treat as integration contract for block dice; preserve shapes or wrap changes. |
| Roster templates | `modules/team-creator/src/data/rosterTemplates/` | Keep | Valuable source data; future flexibility can be layered around it. |
| Skill reference data | `modules/team-creator/src/data/skillReferences.ts` | Keep | Good supporting reference dataset. |
| Shared team types | `modules/team-creator/src/shared/types/team.ts` | Refactor | Good foundation, but currently mixes draft/live assumptions too tightly. |
| Team exchange types | `modules/team-creator/src/shared/types/teamExchange.ts` | Refactor | Useful concept, but may need to split base teams from competition copies. |
| Team math utilities | `modules/team-creator/src/shared/utils/teamMath.ts` | Refactor | Some calculations are useful, but treasury/draft logic is currently too hardcoded. |
| Shirt-number utilities | `modules/team-creator/src/shared/utils/shirtNumbers.ts` | Refactor | Useful logic, but must align with base-team vs competition-copy semantics. |
| Team factory | `modules/team-creator/src/tools/team-creator/utils/teamFactory.ts` | Refactor | Good creation helper pattern, but must support new team categories and defaults. |
| Repository abstraction | `modules/team-creator/src/shared/repositories/teamRepository.ts` and factory files | Keep | Strong architectural pattern; should remain the UI boundary. |
| Local/API repository implementations | `modules/team-creator/src/shared/repositories/` | Refactor | Boundary is right, payload semantics will change. |
| Team creator UI shell | `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx` | Replace | Too many workflows collapsed into one component. Reuse ideas, not structure. |
| Team creator tests | `modules/team-creator/src/tools/team-creator/tests/` | Refactor | Keep coverage where useful, but tests should be reorganized around new workflow boundaries. |
| Shared API routes: teams | `services/api/src/routes/teams.ts` | Refactor | Core endpoint family is right, but team semantics must split base teams and competition copies. |
| Shared API routes: competitions | `services/api/src/routes/competitions.ts` | Refactor | Good starting area, but model must move from tournament-centric to generalized competition rulesets. |
| Shared API routes: match sessions | `services/api/src/routes/matchSessions.ts` | Refactor | Timer/event/signoff logic is good; progression ownership needs to move out of one hardcoded apply path. |
| Prisma schema core entities | `services/api/prisma/schema.prisma` | Refactor | Entity set is broadly right; enums and submission/copy semantics need redesign. |
| Match session persistence model | `MatchSession`, event, casualty, confirmation tables | Keep With Adapter | Strong in-game backbone; preserve concept and compatibility while refining progression handling. |
| Competition submission model | `CompetitionEntry`, `CompetitionTeamSubmission`, players | Refactor | Good precursor to competition team copy, but currently too tournament/submission-shaped. |
| League-specific entities | `League`, `LeagueMembership` | Refactor or fold | Useful only if leagues remain distinct from generalized competitions; may become redundant or be retained as wrappers. |
| Frontend competition client | `modules/team-creator/src/shared/api/competitionClient.ts` | Refactor | Interface pattern is reusable; payloads and flow assumptions will change. |

## Detailed Guidance

## 1. Protected Tactical Surface

### Keep

- `modules/block-dice-calculator/src/tools/block-dice/rules/`
- `modules/block-dice-calculator/src/tools/block-dice/tests/`
- `modules/block-dice-calculator/src/shared/types/game.ts`

Reason:

- these files solve a contained tactical problem
- they are already stable
- they should not be churned by the account/competition rewrite

### Keep With Adapter

- `modules/block-dice-calculator/src/shared/integration/matchSessionApi.ts`
- `modules/block-dice-calculator/src/shared/integration/resolveImportedTeam.ts`
- `modules/block-dice-calculator/src/shared/integration/teamImport.ts`

Reason:

- they define what block dice expects from the outside world
- even if backend contracts evolve, block dice should keep seeing stable shapes

Practical rule:

- if a backend shape changes, add adapter logic here or server-side
- do not force block dice to absorb unrelated workflow complexity

## 2. Team Domain

### Refactor

- `modules/team-creator/src/shared/types/team.ts`
- `modules/team-creator/src/shared/utils/teamMath.ts`
- `modules/team-creator/src/shared/utils/shirtNumbers.ts`
- `modules/team-creator/src/tools/team-creator/utils/teamFactory.ts`

Reason:

- these files hold valuable domain logic
- but they currently assume one blended team lifecycle
- they need to support:
  - base team
  - competition team copy
  - league progression semantics
  - matched-play locked semantics

Specific caution:

- current treasury logic is draft-budget arithmetic, not future league treasury truth
- current active/rostered/eligible logic is useful but should be ruleset-aware where needed

## 3. Persistence Boundary

### Keep

- repository interface pattern

Files:

- `modules/team-creator/src/shared/repositories/teamRepository.ts`
- `modules/team-creator/src/shared/repositories/createTeamRepository.ts`

Reason:

- UI-to-repository separation is correct
- it lets the rewrite preserve modularity

### Refactor

- `apiTeamRepository.ts`
- `localTeamRepository.ts`
- route payload shapes they depend on

Reason:

- the boundary stays
- the underlying concepts become richer

## 4. Team Creator UI

### Replace

- `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx`

Reason:

- draft flow
- live roster management
- progression editing
- destructive actions
- competition operations

are currently collapsed into one surface

This is the clearest UI layer to rebuild.

What to reuse from it:

- visual components or fragments if clean
- useful event handlers rewritten into smaller modules
- user-tested naming/copy cues where sensible

What not to reuse:

- current workflow composition
- current assumption that one editor can serve all modes cleanly

## 5. Backend Schema

### Refactor

- `services/api/prisma/schema.prisma`

Reason:

- many entities are correct in spirit
- several names and semantics are now behind the product model

Likely keep:

- `User`
- `Team`
- `TeamPlayer`
- `Competition`
- `CompetitionEntry`
- `Fixture`
- `MatchSession`

Likely change:

- competition type enum
- visibility enum naming
- submission/copy semantics
- ruleset storage strategy
- user identity/contact fields
- lock state fields

## 6. Match Session Layer

### Keep With Refactor

- `services/api/src/routes/matchSessions.ts`
- supporting schema models

Keep:

- timer model
- event logging
- turn confirmation
- final signoff
- participant model

Refactor:

- progression apply semantics
- event confirmation flow
- hardcoded SPP and injury assumptions

Important future split:

- in-game facts belong here
- league post-game workflow should consume these facts
- league post-game workflow should not be permanently trapped inside one `apply progression` endpoint

## 7. Competition Layer

### Refactor

- `services/api/src/routes/competitions.ts`
- `CompetitionEntry`
- `CompetitionTeamSubmission`
- frontend `competitionClient.ts`

Reason:

- current structure is a solid prototype
- but it is too biased toward tournament submission flow
- the new model needs:
  - player-first join
  - team submission later
  - competition team copies
  - reusable competition draft templates
  - general rulesets
  - league and matched-play locking

## 8. Configurable Rules

### Replace Hardcoded Constants With Ruleset-Driven Logic

Current hardcoded areas to replace over time:

- SPP values by event type
- winnings formula details
- stalling penalty impact
- inducement costs and quantity caps
- matched-play purse defaults
- matched-play tier mapping

These should move into:

- competition preset defaults
- competition ruleset config
- reusable competition draft templates

## 9. Suggested Migration Order

### Stage 1

Protect:

- block dice integration contract
- tactical rules/tests

### Stage 2

Extract or harden:

- core team types
- repository boundary
- team import adapter

### Stage 3

Refactor backend domain:

- users
- competitions
- rulesets
- team copies
- locking states

### Stage 4

Rebuild team creator workflows:

- base team editing
- competition submission flow
- matched-play builder
- league pre-game
- league post-game

### Stage 5

Reconnect block dice through stable adapters.

## Simple Rule Of Thumb

If a file is:

- tactical and already correct: keep it
- an adapter or boundary: preserve the pattern
- holding useful domain logic but wrong assumptions: refactor it
- collapsing multiple workflows into one UI or hardcoding future rules: replace it
