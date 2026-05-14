# Roadmap

## Completed Phases

- Repository bootstrap
- React + TypeScript + Vite scaffold
- PWA and Vitest baseline
- Documentation foundation
- 7x7 tactical grid foundation
- Token placement flow
- Blocker and target selection flow
- Standalone assist and block-dice rules engine
- Why explanation bottom-sheet
- Mobile UI stabilization and local-only persistence
- Final MVP cleanup and Codex handoff
- UX revision review and roadmap reset
- Edit / Calculate mode architecture
- Standard adjacent preview overlays
- Blitz preview and non-adjacent target overlays
- Candidate attack squares, square-specific Why, and explicit invalidation
- Candidate-square readability refinement
- Tie-aware blitz candidate ranking

## Current Priorities

- Simplify candidate visuals and remove misleading `BEST` / `ALT` language where no mathematical distinction exists
- Re-test the candidate-square flow on a phone after the tie-aware update
- Perform a broader calculator UI cleanup pass after candidate semantics are corrected
- Defer merge planning until the revised UX rewrite is stable

## Deferred Features

- Saved player profiles
- Saved rosters
- Probability helpers
- Additional toolkit modules
- Merge/integration branch strategy until post-rewrite stabilization

## Rejected Features

- Full pitch simulation
- Turn sequencing
- Dice resolution
- Online play
- Authentication
- Database-backed persistence

## Scope Boundary

The MVP succeeds only if it quickly determines and explains Blood Bowl block dice. Any feature that does not directly support that flow stays out of scope.

## Revision Note

The original blocker-target interaction flow has been superseded by the revised tactical UX direction documented in `/c/Users/kevth/Downloads/blood_bowl_toolkit_final_mvp_revision.md`. Existing implementation remains useful foundation work, but the roadmap now prioritizes the interaction rewrite over merge preparation.
