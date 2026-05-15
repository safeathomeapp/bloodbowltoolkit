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

- Preserve `modules/block-dice-calculator/` as the stable working software baseline
- Merge the current MVP branch into the repository mainline and stabilize the GitHub branch strategy
- Document and enforce the suite/module boundary before adding new tooling

## Post-MVP Next Track

- Keep the block-dice app in `modules/block-dice-calculator/` as the finished integration target
- Define whether roster, league, and competition tools belong inside the same PWA toolkit or in a separate adjacent product surface
- Design persistent domain models for player profiles, rosters, teams, leagues, fixtures, and standings before implementation
- Decide the order of expansion:
  - saved player profiles and rosters first
  - then league and competition generation
  - then reporting or schedule helpers if still justified

## Deferred Features

- Saved player profiles
- Saved rosters
- League generation helpers
- Competition or fixture generation helpers
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

The current repository structure now treats that shipped block-dice scope as a module-level baseline for future suite integration.

## Revision Note

The original blocker-target interaction flow was superseded by the revised tactical UX direction, and that rewrite has now been implemented. The roadmap priority has therefore moved on from architecture changes to beta testing, small bug fixes, and MVP merge readiness.
