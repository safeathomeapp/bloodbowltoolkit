# Next Phase Note

## Where We Are

- block dice is stable and now accepts imported teams
- team creator is a usable drafting MVP with export support
- the suite roadmap has pivoted toward shared backend and session flow
- `services/api/` now exists with a live PostgreSQL-backed scaffold
- users, leagues, and teams are now implemented and smoke-tested in the API

## What Not To Do Next

- do not keep extending local-only bridges as if they are the final product path
- do not rewrite block dice in order to add leagues
- do not split the backend into broader architecture than the MVP needs
- do not distort the existing saved-team model without a clear contract reason
- do not start standings, results, or redraft before shared team persistence is live

## Best Next Move

- add an API-backed repository path for `modules/team-creator/`

## Concrete Next Implementation Pass

1. preserve the existing `TeamRepository` interface
2. add an API-backed implementation beside the local one
3. wire team creator to use the API-backed repository behind a clear selection boundary
4. keep local-only storage available as a fallback until the shared path is stable

## After That

1. create match-session endpoints
2. resolve block-dice preload payloads from shared session context
3. then return to progression fields once shared team identity is stable

## Integration Goal

- saved teams should load into block dice from shared backend context
- block dice should consume resolved player/team data, not own team management state

## Persistence Goal

- keep the repository interface
- move the main persistence path out of browser-local storage
- keep export/import only as a temporary bridge or fallback

## Reminder

- one canonical saved team
- shared backend around the existing modules
- progression is mutable team/player state layered on the shared team
- event packs and league logic are overlays above the canonical team
