Status: active repository reference doc

# Repository Map

## Top-Level Purpose

The repository root is suite coordination space.

The live code is split across:

- `modules/block-dice-calculator/`
- `modules/team-creator/`
- `services/api/`

The root also owns the cross-cutting docs and project direction.

## Folder Purpose

- `docs/session_notes/`
  Historical implementation passes and handoffs.
- `docs/architecture/`
  Active design and contract docs.
- `docs/roadmap/`
  supporting roadmap/history notes
- `docs/rules_references/`
  uploaded rules screenshots, notes, and clarifications
- `modules/`
  frontend modules
- `services/api/`
  shared backend

## Source Of Truth By Concern

### Tactical Logic

- `modules/block-dice-calculator/src/tools/block-dice/rules/`
- tests in `modules/block-dice-calculator/src/tools/block-dice/tests/`

### Team Editing And Canonical Team Shape

- `modules/team-creator/src/shared/types/team.ts`
- `modules/team-creator/src/shared/repositories/`
- `modules/team-creator/src/tools/team-creator/`

### Shared Persistence And Competition Flow

- `services/api/prisma/schema.prisma`
- `services/api/src/routes/`

### Project Direction

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`
- `ROADMAP.md`

## Current Architectural Boundaries

- block-dice owns tactical assistance logic and match-room controls
- team-creator owns canonical team editing
- services/api owns shared persistence and competition/session orchestration
- tournaments use frozen team submissions
- leagues use live mutable teams

## Runtime And Persistence Notes

### Team Creator Repository Mode

The team creator supports:

- local browser storage
- shared API repository

The mode is chosen in:

- `modules/team-creator/src/shared/repositories/createTeamRepository.ts`
- environment values in `modules/team-creator/.env.local`

### Shared API Defaults

The API defaults are defined in:

- `services/api/.env`
- `services/api/.env.example`

Current expected local dev address:

- `http://127.0.0.1:3001`

### Local Storage Caveat

Browser-local team data is origin-specific.

Therefore:

- `localhost`
- `127.0.0.1`

must be treated as different local-storage environments.

## Important Current Documentation Files

- [docs/SESSION_BRIEF.md](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/SESSION_BRIEF.md)
- [docs/ARCHITECTURE_CANON.md](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/ARCHITECTURE_CANON.md)
- [docs/CODEX_SESSION_OPERATIONS.md](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/CODEX_SESSION_OPERATIONS.md)
- [ROADMAP.md](C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/ROADMAP.md)
