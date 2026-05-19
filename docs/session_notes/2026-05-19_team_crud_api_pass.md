# 2026-05-19 Team CRUD API Pass

## Summary Of Work Completed

- implemented shared team CRUD routes in `services/api/`
- kept the request and response payloads close to the existing `SavedTeam` and `SavedTeamPlayer` frontend model
- preserved client-owned ids for teams and players so the current team-creator flow can move behind the API without a structural rewrite
- added league membership validation for league-linked teams
- fixed delete behavior so team players are removed before team deletion
- blocked team deletion when a team is already linked to match-session records

## Files Modified

- `services/api/src/routes/teams.ts`
- `services/api/README.md`
- `docs/architecture/2026-05-19_shared_backend_mvp_spec.md`

## Implemented Endpoints

- `GET /teams`
- `GET /teams/:teamId`
- `POST /teams`
- `PUT /teams/:teamId`
- `DELETE /teams/:teamId`

## Verification

- `cd services/api && npm run build`
- live smoke flow against `http://127.0.0.1:3001`
- verified:
  - create team
  - list teams
  - fetch team
  - update team
  - delete team
  - confirm `404` after deletion

## Architectural Notes

- do not import frontend module code directly into `services/api/` unless it is moved into a true shared package or shared contract boundary
- backend route code should stay self-contained until shared reference data is extracted deliberately
- the next integration step should preserve the existing `TeamRepository` interface and swap persistence behind it

## Next Recommended Step

- implement an API-backed repository for `modules/team-creator/`
- keep local browser storage available as a fallback during the transition if needed
- after that, move to match-session endpoints and block-dice preload fetch

## Git Branch Used

- `main`
