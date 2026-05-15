# Next Session Start

Use this document at the start of the next Codex session.

## Read First

1. `docs/blood_bowl_toolkit_codex_master_brief.md`
2. `ROADMAP.md`
3. `docs/session_notes/2026-05-15_backend_roster_league_roadmap_reset.md`
4. `docs/roadmap/2026-05-15_backend_roster_league_execution_plan.md`
5. `docs/architecture/2026-05-15_suite_clean_canvas_for_next_module.md`
6. `modules/block-dice-calculator/MODULE_STATUS.md`

The MVP block-dice app is complete and remains the stable working module.
The active planning context is now suite expansion around that module boundary.

## Project State

- Repository: `blood-bowl-toolkit`
- Working directory: `C:\Users\kevth\Desktop\Projects\blood-bowl-toolkit`
- Current stable module: `modules/block-dice-calculator`
- Future module root: `modules/`
- Package manager in the current module: `npm`
- Current module stack: React, TypeScript, Vite, `vite-plugin-pwa`, Vitest
- Active working branch at handoff: `feature/blitz-why-panel`
- MVP status: complete and preserved as the first suite module

## What Is Complete

- `7x7` tactical grid
- local placement and editing flow
- `EDIT` / `CALCULATE` split
- active side toggle
- standard block previews
- blitz preview flow
- candidate blitz squares
- block dice rules engine outside React
- assists, `Guard`, `Defensive`, prone and no-tackle-zone handling
- temporary `Dauntless` and `Horns` toggles by user choice
- inline `WHY?` explanation flow
- mobile-first UI and local-only PWA behavior
- help popup and compact header menu
- suite-level repo structure with the block-dice app packaged under `modules/`

## Important Repository Decisions Already Made

- The repository root is suite coordination space, not the live app root.
- `modules/block-dice-calculator/` is the source-of-truth runnable module.
- New suite work should be added beside that module, not mixed into it by default.
- Shared docs stay at the repository root under `docs/`.
- If a future backend is needed for multiple modules, it should live outside the block-dice module.

## Important Product Decisions Already Made

- `Dauntless` stays deterministic and manual for MVP.
  The user rolls physically and turns it on only if it succeeds.
- No RNG is to be built into the helper.
- `Prone` plus `Tackle zone` are the chosen scope boundary.
  Do not expand into full turn-state simulation unless explicitly requested.
- Hidden or dormant code may stay if it supports a likely later feature, but it should not clutter the MVP UI.

## What Still Needs Doing

1. Keep the block-dice module stable as a reference integration target.
2. Create the next suite capability in a separate directory boundary.
3. Only add shared infrastructure when more than one module genuinely needs it.
4. Keep backend and persistence work separate from the finished module unless integration is deliberate.

## Recommended Session Start If Work Continues

1. Read the latest handoff and roadmap docs above.
2. Check `git status`.
3. Verify the stable module still passes:
   - `cd modules/block-dice-calculator`
   - `npm run test -- --run`
   - `npm run lint`
   - `npm run build`
4. Decide whether the next work item is:
   - a new standalone module under `modules/`
   - a shared backend under `services/`
   - or a narrow bug fix inside `modules/block-dice-calculator/`
5. Do not start the next module inside the block-dice directory unless it is intentionally part of that module.

## Clean Canvas Guidance

- Treat `modules/block-dice-calculator/` as frozen except for real fixes.
- Add the next module as a sibling directory under `modules/`.
- Give each module its own package, entrypoint, and local docs as needed.
- Keep cross-module policy and planning at the repository root.

## Instruction Reminder For Next Session

- Keep all shell commands Git Bash compatible where possible.
- Document every meaningful pass in `docs/session_notes/`.
- Push each completed pass to GitHub.
- Treat `modules/block-dice-calculator/` as the current known-good working software.
- Keep new suite work structurally separate until intentional integration is requested.
- Do not guess on uncertain Blood Bowl rules.
- Do not destabilize the finished block-dice module while opening the canvas for the next module.
