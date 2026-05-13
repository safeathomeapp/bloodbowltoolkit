# Next Session Start

Use this document at the start of the next Codex session.

## Project State

- Repository: `blood-bowl-toolkit`
- Working directory: `C:\Users\kevth\Desktop\Projects\blood-bowl-toolkit`
- Package manager: `npm`
- Stack: React, TypeScript, Vite, `vite-plugin-pwa`, Vitest
- MVP tool: `Block Dice Calculator`

## Rules Source Of Truth

- Brief: `docs/blood_bowl_toolkit_codex_master_brief.md`
- Rules notes: `docs/rules_references/2026-05-13_mvp_rules_source.md`

## Current Feature Coverage

- 7x7 tactical grid
- Token placement and removal
- Blocker and adjacent target selection
- Standalone block/assist rules engine
- Guard and Defensive handling based on reviewed references
- Result summary panel
- `Why?` bottom-sheet explanation panel
- Local-only persistence
- PWA install baseline

## Branch History

- `feature/repo-bootstrap` at `c801e43`
- `feature/block-selection` at `9080c79`
- `feature/assist-engine` at `d649b23`
- `feature/explanation-panel` at `1740c01`
- `feature/mobile-ui` at `da7c75e`
- `feature/mvp-cleanup` is the current final cleanup branch

## Recommended First Actions Next Session

1. Review `ROADMAP.md` and the latest session notes before changing code.
2. Decide whether to open PRs or create a single integration branch before merging to `main`.
3. Run `npm run test`, `npm run lint`, and `npm run build`.
4. If new Blood Bowl rules interactions are requested, ask for source references before implementing them.

## Current Known Gaps

- No drag/reposition interaction; movement is still remove-and-replace.
- No dedicated accessibility audit beyond the current cleanup pass.
- No visual offline badge beyond install/status messaging.
- No merge/integration branch has been prepared yet.

## Session Notes To Review

- `docs/session_notes/2026-05-13_repo_bootstrap.md`
- `docs/session_notes/2026-05-13_block_grid_foundation.md`
- `docs/session_notes/2026-05-13_blocker_target_selection.md`
- `docs/session_notes/2026-05-13_assist_engine.md`
- `docs/session_notes/2026-05-14_explanation_panel.md`
- `docs/session_notes/2026-05-14_mobile_ui_stabilization.md`

## Instruction Reminder For Next Session

- Keep all shell commands Git Bash compatible.
- Document every meaningful implementation pass.
- Push each completed pass to GitHub.
- Do not guess on uncertain Blood Bowl rules.
