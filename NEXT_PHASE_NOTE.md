# Next Phase Note

## Where We Are

- block dice is stable and now accepts imported teams
- team creator is a usable drafting MVP with export support
- the suite roadmap has pivoted toward shared backend and session flow
- `services/api/` now exists with a live PostgreSQL-backed scaffold
- the first user and league endpoints are implemented and smoke-tested

## What Not To Do Next

- do not keep extending local-only bridges as if they are the final product path
- do not rewrite block dice in order to add leagues
- do not split the backend into broader architecture than the MVP needs
- do not distort the existing saved-team model without a clear contract reason
- do not start standings, results, or redraft before shared team persistence is live

## Best Next Move

- implement shared team CRUD in `services/api/`

## Concrete Next Implementation Pass

1. implement:
   - `GET /teams`
   - `GET /teams/:teamId`
   - `POST /teams`
   - `PUT /teams/:teamId`
   - `DELETE /teams/:teamId`
2. keep the payload close to the existing `SavedTeam` and `SavedTeamPlayer` shape
3. preserve the repository boundary in the team creator
4. add an API-backed repository implementation after the team routes exist

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
