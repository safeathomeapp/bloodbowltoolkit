# Blood Bowl Toolkit — Codex Master Project Brief

## Project Overview

Build a mobile-first Progressive Web App (PWA) toolkit for Blood Bowl tactical helpers.

The first and only functional module for MVP is:

# Block Dice Calculator

This tool determines:

- attacker strength
- defender strength
- offensive assists
- defensive assists
- assist cancellation
- Guard interaction
- Defensive interaction (BB2025 compatible)
- final block dice result

This is NOT a full Blood Bowl game engine.

This is NOT a roster manager.

This is NOT a turn simulator.

This is NOT a dice outcome resolver.

The MVP exists only to determine and explain the number and ownership of block dice.

---

# Core Development Philosophy

Codex must act as:

- a senior full-stack engineer
- a systems thinker
- a maintainable architecture advocate
- a pragmatic product engineer

Codex must NOT:

- blindly agree with every idea
- introduce uncontrolled scope creep
- over-engineer
- prematurely abstract
- build systems not required for MVP
- introduce dependencies without justification

Codex should:

- challenge unnecessary complexity
- recommend simpler implementations when appropriate
- maintain scope discipline
- prefer readable and transferable code
- avoid "clever" code patterns
- avoid unnecessary state complexity
- avoid enterprise architecture patterns for a small MVP

The codebase should feel:

- clean
- understandable
- expandable
- testable
- modular
- beginner-readable where possible

---

# Critical Behaviour Instruction

If rules uncertainty exists:

- Codex must ask for references
- Codex must ask for PDFs/screenshots/uploads
- Codex must NOT hallucinate Blood Bowl rules
- Codex must verify BB2025 interactions before implementation

If internet sources conflict:

- ask for authoritative rules references
- ask for FAQ/Errata uploads
- do not guess

---

# MVP Definition

## The MVP must:

- allow token placement on a local tactical grid
- allow selecting a blocker
- allow selecting a target
- calculate block dice
- visually explain assists
- visually explain cancelled assists
- support Guard
- support Defensive (BB2025 compatibility)
- support prone/no tackle zone state
- work on mobile first
- be installable as a PWA

---

# Explicitly Excluded From MVP

DO NOT IMPLEMENT:

- full pitch
- turns
- weather
- dice rolling
- block outcomes
- push logic
- Frenzy chains
- armour/injury
- league management
- online play
- networking
- multiplayer
- authentication
- accounts
- cloud saves
- database
- team builder UI
- roster persistence UI
- AI recommendations
- probability engines
- animations beyond minimal polish

Future-proofing is allowed.

Future implementation is NOT allowed.

---

# Technology Stack

Preferred:

- React
- TypeScript
- Vite
- PWA plugin
- CSS Modules or lightweight styling solution
- Vitest or Jest for testing

Avoid:

- Redux unless genuinely necessary
- Tailwind unless justified
- heavy state frameworks
- backend infrastructure
- unnecessary libraries

---

# Repository Setup Instructions

Codex must ask the user:

- where the repository should live
- preferred repository name
- whether the repo already exists
- whether GitHub remote already exists
- whether Vite should scaffold into existing directory
- preferred package manager:
  - npm
  - pnpm
  - yarn

All shell commands and setup instructions must be:

# Git Bash compatible

Do not assume PowerShell.

Do not assume Linux shell.

---

# Git Workflow Requirements

Codex must:

- create clear branches
- avoid working directly on main
- produce clean commit messages
- maintain session documentation

Recommended branch format:

```text
feature/block-grid
feature/assist-engine
feature/mobile-ui
fix/guard-cancellation
docs/session-notes
```

Recommended commit style:

```text
feat: add 7x7 tactical grid
feat: implement assist cancellation logic
fix: correct Guard interaction with Defensive
docs: add session notes for assist engine pass
```

---

# Mandatory Documentation System

Every meaningful implementation pass MUST generate documentation.

Documentation is not optional.

Each completed work session must produce:

```text
/docs/session_notes/YYYY-MM-DD_<topic>.md
```

Example:

```text
/docs/session_notes/2026-05-13_block_grid_foundation.md
```

Each session note must include:

- summary of work completed
- files created
- files modified
- architectural decisions
- rejected approaches
- unresolved issues
- next recommended step
- git branch used
- commit hashes if relevant

---

# Repository Structure

Codex should propose improvements if needed, but initial target structure:

```text
root/
├── docs/
│   ├── session_notes/
│   ├── architecture/
│   ├── roadmap/
│   └── rules_references/
│
├── public/
│
├── src/
│   ├── app/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── types/
│   │   ├── rules/
│   │   └── utils/
│   │
│   └── tools/
│       └── block-dice/
│           ├── components/
│           ├── rules/
│           ├── types/
│           ├── hooks/
│           ├── tests/
│           └── index.ts
│
├── README.md
├── ROADMAP.md
├── REPOSITORY_MAP.md
└── package.json
```

---

# Architectural Rules

## The application is a toolkit

The MVP contains only one tool:

```text
Block Dice Calculator
```

However, the codebase should support future tools later.

Future tools are NOT to be implemented now.

---

# Core Data Design

Separate:

## Permanent Player Data

```ts
PlayerProfile
```

from:

## Board Placement Data

```ts
PlacedPlayer
```

This is critical for future roster support.

---

# Recommended Core Types

```ts
export type TeamSide = "A" | "B";

export type Skill =
  | "GUARD"
  | "DEFENSIVE";

export interface Position {
  row: number;
  col: number;
}

export interface PlayerProfile {
  id: string;
  number?: number;
  name?: string;
  strength: number;
  skills: Skill[];
}

export interface PlacedPlayer {
  id: string;
  profileId?: string;
  teamSide: TeamSide;
  position: Position;
  isStanding: boolean;
  hasTackleZone: boolean;
}

export interface BoardState {
  placedPlayers: PlacedPlayer[];
  blockerId: string | null;
  targetId: string | null;
}
```

---

# Grid Size Decision

Use:

# 7x7 Grid

Reasoning:

- 5x5 is technically viable
- 7x7 provides better touch UX
- 7x7 avoids cramped layouts
- 7x7 supports easier visual debugging
- 7x7 allows future expansion

This is NOT a full pitch.

---

# Board Interaction Rules

Users:

1. place tokens first
2. then select blocker
3. then select target

The board state must remain reusable.

The same board should support testing multiple possible blocks without rebuilding the layout.

Changing blocker/target should instantly recalculate the result.

---

# Mobile UX Requirements

Mobile-first is mandatory.

Desktop is secondary.

Required:

- large touch targets
- readable token labels
- responsive grid scaling
- bottom-sheet explanation panel
- tap-to-place interaction

Drag-and-drop is optional.

Do not block MVP completion on drag-and-drop polish.

---

# Visual Design Rules

Use colour coding consistently.

Suggested mapping:

- Green = valid assist
- Blue = Guard assist
- Orange = cancelled assist
- Grey = ignored/ineligible
- Red = target
- Purple/bright outline = blocker

Each token should have visible IDs:

```text
A1
A2
B1
B2
```

---

# Why System (Mandatory MVP Feature)

The app must explain WHY a result occurred.

A button near the result panel:

```text
[ Why? ]
```

should open a bottom-sheet explanation panel.

Example:

```text
Base:
- A6 blocks B7
- ST3 vs ST3 = 1 die base

Offensive assists:
- A5 provides +1 assist
- A7 provides +1 assist with Guard

Defensive assists:
- B6 provides +1 assist

Cancelled:
- A8 cannot assist because marked by B8

Final:
- ST5 vs ST4 = 2 dice attacker chooses
```

---

# Rules Engine Requirements

Rules logic must exist outside React components.

Rules engine should return structured explanation objects.

Do not generate explanation text directly inside UI components.

---

# Assist Rules

Implement:

- adjacency
- tackle zones
- assist cancellation
- Guard
- Defensive interaction
- standing/prone
- no tackle zone state

Do not implement:

- push logic
- chain pushes
- Frenzy
- follow-up movement
- block outcome logic

---

# Testing Requirements

Rules logic must be test-driven.

Minimum required tests:

1. equal strength
2. offensive assist
3. defensive assist
4. Guard assist
5. cancelled assist
6. prone player ignored
7. no tackle zone ignored
8. Guard cancelled by Defensive
9. blocker excluded from assist
10. target excluded from assist
11. recalculation after changing blocker
12. recalculation after moving token

---

# PWA Requirements

The app should support:

- install to home screen
- offline functionality for local use
- local-only state
- no backend

---

# Future-Proofing Rules

Future support is expected for:

- saved teams
- saved player profiles
- probability helpers
- roster helpers

HOWEVER:

Do not implement these now.

Only structure the codebase to avoid rewrites later.

---

# Future Roster Design Notes

Future versions may support:

```ts
TeamRoster {
  id: string;
  name: string;
  players: PlayerProfile[];
}
```

Placed players should later be able to reference saved profiles.

The MVP should not hardcode anonymous-only players.

---

# Roadmap Expectations

Codex should maintain:

```text
ROADMAP.md
```

with:

- completed phases
- current priorities
- deferred features
- rejected features
- scope boundaries

---

# REPOSITORY_MAP.md

Codex must maintain:

```text
REPOSITORY_MAP.md
```

This document should describe:

- folder purpose
- source of truth locations
- ownership of logic
- architectural boundaries

---

# Rules References Folder

All important rules references, FAQs, screenshots, and uploaded clarifications should be stored in:

```text
/docs/rules_references/
```

Codex should ask for uploads when rules uncertainty exists.

---

# Important Scope Instruction

This project succeeds by:

- staying focused
- solving one problem well
- avoiding feature explosion

The MVP goal is:

# “Quickly determine and explain Blood Bowl block dice.”

Nothing more.

---

# First Recommended Implementation Order

1. Repository setup
2. Vite scaffold
3. Git setup
4. Documentation foundation
5. 7x7 grid
6. Token placement
7. Blocker/target selection
8. Strength calculation
9. Assist calculation
10. Explanation system
11. Colour coding
12. Mobile polish
13. PWA installability
14. Test coverage
15. Refactor pass only after stability

---

# Final Behaviour Instruction To Codex

Act like:

- a disciplined senior engineer
- a technical lead
- a product-aware architect

Do not:

- blindly agree
- chase every idea
- overbuild
- gold-plate
- create unnecessary abstractions

Push back when appropriate.

Keep the project grounded.

Keep the code understandable.

Keep the MVP achievable.
