# Next Session Start

Use this document at the start of the next Codex session.

## Read First

1. `docs/blood_bowl_toolkit_codex_master_brief.md`
2. `ROADMAP.md`
3. `docs/session_notes/2026-05-19_block_dice_team_import_and_shared_backend_bootstrap.md`
4. `docs/architecture/2026-05-19_shared_backend_mvp_spec.md`
5. `modules/block-dice-calculator/MODULE_STATUS.md`

The block-dice module remains the stable working tactical module.
The active implementation context is now shared backend expansion around the existing frontend modules.

## Project State

- Repository: `blood-bowl-toolkit`
- Working directory: `C:\Users\kevth\Desktop\Projects\blood-bowl-toolkit`
- Stable tactical module: `modules/block-dice-calculator`
- Stable drafting module: `modules/team-creator`
- Shared backend root: `services/api/`
- Frontend package manager: `npm`
- Current stack: React, TypeScript, Vite, Fastify, Prisma, PostgreSQL
- Active working branch at handoff: `main`
- MVP status: frontend modules validated, backend MVP started
- GitHub default branch: `main`

## What Is Complete

- `7x7` tactical grid
- block-dice local placement and editing flow
- `EDIT` / `CALCULATE` split
- active side toggle
- standard block previews
- blitz preview flow
- candidate blitz squares
- block dice rules engine outside React
- assists, `Guard`, `Defensive`, prone and no-tackle-zone handling
- temporary `Dauntless` and `Horns` toggles by user choice
- inline `WHY?` explanation flow
- team export from team creator
- team import and side loading in block dice
- team-name strips and imported-player placement flow
- team creator drafting MVP with roster templates and rule popups
- shared backend scaffold under `services/api/`
- live user and league API endpoints against local PostgreSQL

## Important Repository Decisions Already Made

- The repository root is suite coordination space, not the live app root.
- `modules/block-dice-calculator/` remains the source-of-truth tactical module.
- `modules/team-creator/` remains the source-of-truth team editing module.
- `services/api/` owns shared persistence and session loading.
- Shared docs stay at the repository root under `docs/`.

## Important Product Decisions Already Made

- `Dauntless` stays deterministic and manual for MVP.
  The user rolls physically and turns it on only if it succeeds.
- No RNG is to be built into the helper.
- `Prone` plus `Tackle zone` are the chosen scope boundary.
  Do not expand into full turn-state simulation unless explicitly requested.
- export/import is a bridge, not the final multi-device flow
- the next real blocker is shared persistence and match-session handoff
- hidden or dormant code may stay if it supports a likely later feature, but it should not clutter the active UI

## What Still Needs Doing

1. keep the block-dice module stable as a reference integration target
2. keep the team-creator repository boundary intact while moving persistence toward the API
3. implement team CRUD in `services/api/`
4. then implement match-session loading for block-dice preload

## Recommended Session Start If Work Continues

1. Read the latest handoff and roadmap docs above.
2. Check `git status`.
3. Verify:
   - `cd services/api && npm run build`
   - `cd modules/block-dice-calculator && npm run test && npm run build`
   - `cd modules/team-creator && npm run test && npm run build`
4. Continue the backend sequence:
   - team CRUD
   - API-backed team repository
   - match-session endpoints
   - block-dice preload integration

## Instruction Reminder For Next Session

- Keep all shell commands Git Bash compatible where possible.
- Document every meaningful pass in `docs/session_notes/`.
- Push each completed pass to GitHub.
- Treat `modules/block-dice-calculator/` as the current known-good tactical software.
- Keep `modules/team-creator/` focused on editing flow, not server concerns.
- Keep `services/api/` as the shared persistence boundary.
- Do not guess on uncertain Blood Bowl rules.
- Do not destabilize the stable frontend modules while expanding shared backend capability.
