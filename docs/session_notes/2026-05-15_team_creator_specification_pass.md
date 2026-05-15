# 2026-05-15 Team Creator Specification Pass

## Summary Of Work Completed

- translated the initial roster-creator discussion into an implementation-grade specification
- updated the plan from a one-team assumption to a template-driven model suitable for 20+ team types
- defined the core domain layers for:
  - roster templates
  - position templates
  - saved teams
  - saved team players
- defined a separate `modules/team-creator/` boundary
- documented a first-pass execution plan for the team creator module

## Files Created

- `docs/architecture/2026-05-15_team_creator_domain_and_module_spec.md`
- `docs/roadmap/2026-05-15_team_creator_first_pass_execution_plan.md`
- `docs/session_notes/2026-05-15_team_creator_specification_pass.md`

## Files Modified

- none

## Architectural Decisions

- the team creator must be template-driven from day one
- saved team/player state must remain separate from immutable roster template data
- the next frontend module should be `modules/team-creator/`, not an extension hidden inside the block-dice module
- persistence should sit behind a repository interface so local-first and backend-backed storage can share the same UI and domain model

## Rejected Approaches

- did not define the feature around a single hardcoded roster such as Amazon
- did not collapse roster templates and saved team instances into one data shape
- did not make block-dice the owner of broader team-building state

## Unresolved Issues

- official roster seed-entry workflow is still undecided
- backend-first versus local-first for the first shippable implementation remains open
- version-1 scope for rerolls, apothecary purchase flow, and sideline staff still needs a final cut

## Next Recommended Step

- review and approve the domain shape
- choose whether the first implementation is local-first or backend-first
- scaffold `modules/team-creator/` using the approved types and seed format

## Git Branch Used

- `main`
