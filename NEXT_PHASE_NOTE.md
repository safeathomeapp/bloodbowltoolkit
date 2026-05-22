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
- the next domain layer is no longer just sessions; it is full competition structure above them
- leagues will use live progressing teams
- tournaments will use static submitted team snapshots
- `Competition` and `CompetitionEntry` are now implemented in the API
- competition create, list, detail, and join are now live and smoke-tested
- tournament team submission snapshots are now implemented
- the API-backed team creator now has a working competition create, join, submit, update, and approve beta flow
- knockout fixture generation is now implemented in the API
- the API-backed team creator now shows fixtures and can generate them for approved knockout entries
- competition cards now patch local state immediately after join, submit, approve, and generate actions
- the API-backed team creator now exposes visible shared API identity control for multi-window testing
- competition owners can now approve other users' submitted teams from the owner review section
- competition owners can now inspect submitted team snapshots before approval
- fixture-attached match rooms can now be created from generated fixtures
- block dice can now load fixture-backed tournament rooms through session codes
- match rooms now expose shared turn timer and bank-time state
- block dice now shows and controls the shared room timer
- match rooms now support shared event logging, turn confirmation, and final signoff
- live-team match rooms can now apply signed SPP progression back to persistent teams
- live-team progression now also supports signed casualty outcomes and post-game injury application

## What Not To Do Next

- do not keep extending local-only bridges as if they are the final product path
- do not rewrite block dice in order to add leagues
- do not split the backend into broader architecture than the MVP needs
- do not distort the existing saved-team model without a clear contract reason
- do not model tournaments as if they were live progressing league teams
- do not jump straight into standings, rich results, or redraft before competition entries and fixtures are correct

## Best Next Move

- use `docs/architecture/2026-05-19_competition_backend_spec.md` as the implementation contract
- signed-match progression now covers:
  - SPP
  - casualty outcomes
  - miss next game
  - niggling injuries

## Concrete Next Implementation Pass

1. expose player progression state in team creator
2. make saved roster progression fields editable through the canonical team-management flow
3. keep local and API repository behavior aligned
4. keep tournament history and live team mutation separate

## After That

1. broaden team-side progression management
2. then return to richer league administration
3. keep league and tournament overlays cleanly separated
4. do not couple standings or redraft too early

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
