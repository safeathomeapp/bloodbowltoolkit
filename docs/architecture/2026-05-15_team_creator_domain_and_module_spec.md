# 2026-05-15 Team Creator Domain And Module Spec

## Purpose

Define the first implementation-grade specification for a reusable Blood Bowl team creator that can support 20+ official team types without redesign.

This document is for the next module after the block-dice calculator.

## Core Product Decision

The team creator must be template-driven from day one.

Do not build an Amazon-specific or Orc-specific editor and generalize later.

The rulebook roster pages differ in:

- allowed positions
- quantity caps
- costs
- stat lines
- starting skills and traits
- primary and secondary categories
- reroll cost
- apothecary availability
- special roster composition patterns

Because of that, the first correct system boundary is:

1. roster templates
2. saved teams built from those templates
3. saved players that can diverge from starting template state over time

## Scope Of The First Team Creator

The first delivered version should support:

- selecting a team template
- entering a team name
- adding and removing players within quantity limits
- naming players
- assigning shirt numbers
- showing template stats and starting skills
- calculating current team value
- saving and loading teams

The first version should not require:

- league scheduling
- match result entry
- inducement workflows
- treasury economy depth beyond the minimum team summary
- full advancement automation

However, the saved-team model must be progression-ready.

## Data Layers

### 1. RosterTemplate

Represents one official team type such as Amazon, Orc, Human, Skaven, etc.

Suggested fields:

```ts
export interface RosterTemplate {
  id: string
  name: string
  shortName?: string
  source: string
  leagues: string[]
  specialRules: string[]
  rerollCost: number
  apothecary: 'YES' | 'NO' | 'OPTIONAL'
  tier?: string
  positions: PositionTemplate[]
}
```

### 2. PositionTemplate

Represents one roster line inside a roster template.

Suggested fields:

```ts
export interface PositionTemplate {
  id: string
  rosterTemplateId: string
  name: string
  role?: string
  minQty: number
  maxQty: number
  cost: number
  movement: number
  strength: number
  agility: string
  passing: string | null
  armour: string
  startingSkills: string[]
  primaryCategories: string[]
  secondaryCategories: string[]
}
```

Notes:

- store the template stats exactly as roster data, not as block-dice placement data
- keep category values as explicit arrays rather than compressed display strings
- treat `passing` as nullable because some future representations may omit it

### 3. SavedTeam

Represents a user-created team built from one roster template.

Suggested fields:

```ts
export interface SavedTeam {
  id: string
  rosterTemplateId: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED'
  rerollCount: number
  apothecaryPurchased: boolean
  assistantCoaches?: number
  cheerleaders?: number
  fanFactor?: number
  notes?: string
  createdAt: string
  updatedAt: string
  players: SavedTeamPlayer[]
}
```

### 4. SavedTeamPlayer

Represents one purchased player on a saved team.

Suggested fields:

```ts
export interface SavedTeamPlayer {
  id: string
  teamId: string
  positionTemplateId: string
  name: string
  shirtNumber: number | null
  currentValue: number
  spp: number
  nigglingInjuries: number
  extraSkills: string[]
  statAdjustments: {
    movement?: number
    strength?: number
    agility?: number
    passing?: number
    armour?: number
  }
  missedNextGame?: boolean
  notes?: string
}
```

Notes:

- `SavedTeamPlayer` must be allowed to diverge from its template because the target UI already shows fields like `SPP`, `NI`, and changed player value
- keep mutable player state separate from immutable template state

## Key Persistence Rule

Saved players should reference templates by id instead of copying full rulebook rows into every record.

Use:

- `rosterTemplateId`
- `positionTemplateId`

and then store only mutable team or player state beside those references.

This avoids hard-to-maintain duplication once 20+ rosters exist.

## Template Seed Format

The first seed source should be a repository-owned data format, not hardcoded JSX or scattered constants.

Suggested file pattern:

```text
modules/team-creator/src/data/rosterTemplates/
  amazon.json
  orc.json
  human.json
  ...
```

Suggested JSON shape:

```json
{
  "id": "amazon",
  "name": "Amazon",
  "source": "Blood Bowl rulebook",
  "leagues": ["Lustrian Superleague"],
  "specialRules": [],
  "rerollCost": 60000,
  "apothecary": "YES",
  "positions": [
    {
      "id": "amazon-eagle-warrior",
      "name": "Eagle Warrior",
      "role": "Lineman",
      "minQty": 0,
      "maxQty": 16,
      "cost": 50000,
      "movement": 6,
      "strength": 3,
      "agility": "3+",
      "passing": "4+",
      "armour": "8+",
      "startingSkills": ["Dodge"],
      "primaryCategories": ["G"],
      "secondaryCategories": ["A", "S"]
    }
  ]
}
```

## Module Boundary

The team creator should be a separate module:

```text
modules/
├── block-dice-calculator/
└── team-creator/
```

Do not build this inside `modules/block-dice-calculator/`.

The team creator should own:

- its UI
- its app state
- its template-loading logic
- its team-saving workflows

The block-dice calculator should later consume saved team data, not own team-building logic.

## UI Specification For Version 1

### Screen 1: Team List

Purpose:

- list saved teams
- create a new team
- open an existing team

Minimum fields shown per row:

- team name
- roster type
- player count
- total current value
- status
- updated date

### Screen 2: Team Editor

Top section:

- team name input
- roster template label
- status label
- save action

Team summary section:

- player count
- rerolls
- apothecary
- total team value

Roster table:

- number
- player name
- position
- MA
- ST
- AG
- PA
- AV
- starting plus added skills
- SPP
- NI
- current value
- remove action

Add-player row:

- position dropdown
- remaining quantity text such as `Orc Lineman 5/16`
- add button

Roster breakdown section:

- position summary by quantity
- cost summary by position

### UX Simplification Rule

The website screenshot is a useful interaction reference, but version 1 should be simpler.

Do not start with:

- icon-heavy row controls
- player ordering controls unless they are truly needed
- complex league-state toggles
- hidden side actions that make the flow harder to read on mobile

## Persistence Boundary

The module should depend on a repository interface, not a concrete storage mechanism.

Suggested boundary:

```ts
export interface TeamRepository {
  listTeams(): Promise<SavedTeamSummary[]>
  getTeam(id: string): Promise<SavedTeam | null>
  saveTeam(team: SavedTeam): Promise<void>
  deleteTeam(id: string): Promise<void>
  listRosterTemplates(): Promise<RosterTemplate[]>
}
```

First implementation may use local persistence.

Later implementations may use:

- backend API under `services/api/`
- synced local cache

The UI should not need to change when the persistence backend changes.

## Integration Rule For Other Modules

The output of team creator must be reusable across the suite.

Downstream examples:

- block-dice module imports players from a saved team
- future league tools reference saved team ids
- future player progression updates saved team players without changing the base roster template

## Recommended Build Order

1. define shared TypeScript types for roster templates and saved teams
2. seed a small initial template set in data files while keeping the schema valid for 20+ teams
3. scaffold `modules/team-creator/`
4. build local repository implementation
5. build team list screen
6. build team editor screen
7. add import/export only if still useful after save/load is stable
8. connect backend later without changing the domain model

## Initial Template Strategy

Do not require all 20+ teams before the module can run.

Do require the schema and loading system to be correct for all 20+ teams before the UI is built.

Practical starting seed set:

- Amazon
- Orc
- Human

That is enough to prove:

- agility-oriented roster
- strength-oriented roster
- more standard mixed roster

## Open Decisions Still Required

- whether official roster templates are entered manually or imported from a maintained seed dataset
- whether `apothecary` should be boolean, enum, or a richer purchase rule object
- whether rerolls and sideline staff are in version 1 or version 1.1
- whether the first team creator ships as local-only or immediately behind shared backend persistence

