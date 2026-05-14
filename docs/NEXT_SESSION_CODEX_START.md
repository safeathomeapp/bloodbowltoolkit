# Next Session Start

Use this document at the start of the next Codex session.

## Read First

1. `docs/blood_bowl_toolkit_codex_master_brief.md`
2. `/c/Users/kevth/Downloads/blood_bowl_toolkit_final_mvp_revision.md`
3. `ROADMAP.md`
4. `docs/architecture/2026-05-14_mvp_revision_reconciliation.md`

The UX revision document is now the active MVP interaction specification.

## Project State

- Repository: `blood-bowl-toolkit`
- Working directory: `C:\Users\kevth\Desktop\Projects\blood-bowl-toolkit`
- Package manager: `npm`
- Stack: React, TypeScript, Vite, `vite-plugin-pwa`, Vitest
- Current working branch from last session: `feature/mvp-cleanup`

## What Is Already Valuable

These parts remain valid and should be preserved where possible:

- 7x7 grid foundation
- `PlayerProfile` versus `PlacedPlayer` separation
- standalone block/assist rules engine
- Guard and Defensive rules handling
- structured explanation output
- local-only persistence baseline
- PWA baseline

## What Is Now Superseded By The UX Revision

The following implementation direction is no longer the target UX:

- explicit `place -> select blocker -> select target -> show one result`
- Calculate Mode based on picking one adjacent target first
- current `Why?` flow as the primary discovery path for blocks

These are not wasted. They are now foundation work for the revised interaction model.

## Active UX Direction

The revised MVP direction is:

- top-level `EDIT` / `CALCULATE` toggle
- Edit Mode for board setup and token property changes
- Calculate Mode defaulting to adjacent block previews for a selected blocker
- long press on the active blocker to enter Blitz Preview
- blitz target candidate attack squares
- manual invalidation of unreachable candidate squares
- explanation panel tied to selected preview/candidate

## Recommended First Actions Next Session

1. Do not start merge work yet.
2. Create a new branch specifically for the UX rewrite plan.
3. Refactor the current interaction model into `Edit Mode` and `Calculate Mode`.
4. Build adjacent overlay previews before any blitz candidate-square work.
5. Preserve the current rules engine where possible; extend it instead of replacing it blindly.

## Recommended Execution Order

1. Add top-level mode toggle and split the current board behaviour into `EDIT` and `CALCULATE`.
2. Replace explicit target selection in standard calculate flow with adjacent preview overlays.
3. Add engine support for `calculateAllTargetPreviews(board, blockerId)`.
4. Add long-press blocker interaction for `BLITZ MODE`.
5. Add engine support for `calculateBestPotentialBlock(board, blockerId, targetId)` and candidate attack squares.
6. Add manual invalidation of candidate squares.
7. Reconnect the explanation panel to the selected preview/candidate model.
8. Expand tests for preview generation and blitz candidate selection.

## Current Known Gaps Under The Revised Spec

- No `EDIT` / `CALCULATE` mode architecture yet
- No adjacent dice overlays
- No blitz preview mode
- No candidate attack square evaluation
- No manual invalidation of unreachable squares
- Current selection UX does not match the revised tactical flow

## Session Notes To Review

- `docs/session_notes/2026-05-13_repo_bootstrap.md`
- `docs/session_notes/2026-05-13_block_grid_foundation.md`
- `docs/session_notes/2026-05-13_blocker_target_selection.md`
- `docs/session_notes/2026-05-13_assist_engine.md`
- `docs/session_notes/2026-05-14_explanation_panel.md`
- `docs/session_notes/2026-05-14_mobile_ui_stabilization.md`
- `docs/session_notes/2026-05-14_mvp_cleanup_and_handoff.md`
- `docs/session_notes/2026-05-14_mvp_revision_roadmap.md`

## Instruction Reminder For Next Session

- Keep all shell commands Git Bash compatible.
- Document every meaningful implementation pass.
- Push each completed pass to GitHub.
- Do not guess on uncertain Blood Bowl rules.
- Treat the revised MVP interaction document as the active UX spec.
