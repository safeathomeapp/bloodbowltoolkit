# Next Session Start

Use this document at the start of the next Codex session.

## Read First

1. `docs/blood_bowl_toolkit_codex_master_brief.md`
2. `ROADMAP.md`
3. `docs/session_notes/2026-05-14_merge_readiness_and_next_session_handoff.md`
4. `docs/session_notes/2026-05-14_help_popup_from_menu.md`
5. `docs/session_notes/2026-05-14_fix_edit_vs_calculate_skill_sets.md`
6. `docs/session_notes/2026-05-14_hide_unused_menu_placeholders.md`

The revised UX rewrite documents are now historical context, not the active implementation plan.

## Project State

- Repository: `blood-bowl-toolkit`
- Working directory: `C:\Users\kevth\Desktop\Projects\blood-bowl-toolkit`
- Package manager: `npm`
- Stack: React, TypeScript, Vite, `vite-plugin-pwa`, Vitest
- Active working branch at handoff: `feature/blitz-why-panel`
- MVP status: functionally complete against the original brief, pending beta testing and merge

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

## Important Rules/Product Decisions Already Made

- `Dauntless` stays deterministic and manual for MVP.
  The user rolls physically and turns it on only if it succeeds.
- No RNG is to be built into the helper.
- `Prone` plus `Tackle zone` are the chosen scope boundary.
  Do not expand into full turn-state simulation unless explicitly requested.
- Hidden or dormant code may stay if it supports a likely later feature, but it should not clutter the MVP UI.

## What Still Needs Doing

1. Beta test real scenarios on phone and desktop widths.
2. Verify edge cases for `Guard`, `Defensive`, `Horns`, `Dauntless`, and blitz previews.
3. Fix any real bugs found during testing in small branches or small follow-up commits.
4. Merge `feature/blitz-why-panel` once the current test round is satisfactory.

## Recommended Session Start If Work Continues

1. Read the latest handoff and roadmap docs above.
2. Check `git status`.
3. Run:
   - `npm run test -- --run`
   - `npm run lint`
   - `npm run build`
4. Review the latest user feedback notes from `docs/session_notes/2026-05-14_*.md`.
5. Only then decide whether the next step is:
   - a targeted bug fix
   - a small UI tidy
   - or merge preparation

## Merge Guidance

- This branch is at a safe merge point.
- Prefer merging now rather than reopening major UX work.
- Any post-MVP issues should be handled as focused follow-up changes, not as another broad rewrite.

## Instruction Reminder For Next Session

- Keep all shell commands Git Bash compatible.
- Document every meaningful pass in `docs/session_notes/`.
- Push each completed pass to GitHub.
- Do not guess on uncertain Blood Bowl rules.
- Do not expand scope beyond block-dice help unless explicitly requested.
