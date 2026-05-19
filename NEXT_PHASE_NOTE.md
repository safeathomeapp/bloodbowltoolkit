# Next Phase Note

## Where We Are

- block dice is stable and now accepts imported teams
- team creator is a usable drafting MVP with export support
- team creator now also runs against the shared API through the existing repository boundary
- the suite roadmap has pivoted toward shared backend and session flow
- `services/api/` now exists with a live PostgreSQL-backed scaffold
- users, leagues, and teams are now implemented and smoke-tested in the API
- CORS is enabled for local frontend-to-API development across ports

## What Not To Do Next

- do not keep extending local-only bridges as if they are the final product path
- do not rewrite block dice in order to add leagues
- do not split the backend into broader architecture than the MVP needs
- do not distort the existing saved-team model without a clear contract reason
- do not start standings, results, or redraft before shared team persistence is live

## Best Next Move

- implement match-session endpoints in `services/api/`

## Concrete Next Implementation Pass

1. implement:
   - `POST /match-sessions`
   - `GET /match-sessions/:sessionId`
   - `GET /match-sessions/code/:sessionCode`
   - `POST /match-sessions/:sessionId/join`
2. keep the payload shaped around the existing shared team records
3. resolve the preload payload block dice needs from session context
4. only return to block-dice UX tidy work after the session-loading path exists

## After That

1. wire block dice to consume match-session preload data
2. remove more of the temporary export/import bridge from the main flow
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
