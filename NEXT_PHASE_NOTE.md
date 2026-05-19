# Next Phase Note

## Where We Are

- block dice is stable and now accepts imported teams
- team creator is a usable drafting MVP with export support
- team creator now also runs against the shared API through the existing repository boundary
- the suite roadmap has pivoted toward shared backend and session flow
- `services/api/` now exists with a live PostgreSQL-backed scaffold
- users, leagues, and teams are now implemented and smoke-tested in the API
- CORS is enabled for local frontend-to-API development across ports
- match-session endpoints are now implemented and smoke-tested in the API
- block dice can now load a match session by code and pre-assign blue and red teams from shared API data

## What Not To Do Next

- do not keep extending local-only bridges as if they are the final product path
- do not rewrite block dice in order to add leagues
- do not split the backend into broader architecture than the MVP needs
- do not distort the existing saved-team model without a clear contract reason
- do not start standings, results, or redraft before shared team persistence is live

## Best Next Move

- reduce the manual session setup path across the frontend modules

## Concrete Next Implementation Pass

1. add a frontend path to create or select a match session from shared team data
2. keep block dice consuming shared session preload rather than direct ad hoc team imports where possible
3. reduce the current manual dev/test cross-app handoff needed to get a session code
4. after that, revisit block-dice UX polish around active side, source clarity, and imported placement flow

## After That

1. remove more of the temporary export/import bridge from the main flow
2. then return to progression fields once shared team identity is stable
3. only after that expand into richer league or fixture administration

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
