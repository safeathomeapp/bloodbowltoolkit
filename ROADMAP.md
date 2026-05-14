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
- Player cards and contextual attacker controls
- Board-header mode switch and edit-card refactor

## Current Priorities

- Beta test the MVP on real devices and real scenarios
- Verify edge cases for `Guard`, `Defensive`, `Horns`, `Dauntless`, and blitz previews
- Fix only concrete bugs or clarity issues found during testing
- Merge `feature/blitz-why-panel` when the current testing round is satisfactory

## Deferred Features

- Saved player profiles
- Saved rosters
- Probability helpers
- Additional toolkit modules
- Post-MVP expansions beyond block-dice help

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

The original blocker-target interaction flow was superseded by the revised tactical UX direction, and that rewrite has now been implemented. The roadmap priority has therefore moved on from architecture changes to beta testing, small bug fixes, and MVP merge readiness.
