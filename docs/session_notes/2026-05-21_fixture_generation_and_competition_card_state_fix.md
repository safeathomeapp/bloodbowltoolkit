# Fixture Generation And Competition Card State Fix

## Summary

This pass added the first knockout fixture layer and fixed the competition card state path in the API-backed team creator.

Delivered:

- backend `Fixture` model
- knockout fixture generation endpoints
- fixture list endpoint
- commissioner fixture update endpoint
- fixture surface in the API-backed team creator
- local competition-card state patching after join, submit, approve, and generate actions

## Backend Work

Implemented in `services/api`:

- `Fixture`
- `FixtureStatus`
- `FixtureSourceType`

Added endpoints:

- `POST /competitions/:competitionId/fixtures/generate`
- `GET /competitions/:competitionId/fixtures`
- `PUT /competitions/:competitionId/fixtures/:fixtureId`

Current generator behavior:

- knockout tournaments only
- approved entries only
- requires a power-of-two number of approved entries
- first round fixtures are created `READY` when both sides are present
- later rounds are created `PENDING`
- fixture progression links are seeded through `nextFixtureId`

## Frontend Work

Added to the API-backed `team-creator` competition view:

- fixture list per competition
- commissioner `Generate Fixtures` action
- simple round/match display with submitted team names

Also fixed an important UI-state issue:

- after a successful competition action, the card now updates immediately in local state
- this covers:
  - join competition
  - submit team
  - update submission
  - approve submission
- this avoids the card appearing unchanged when the follow-up refresh lags or fails

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:dev -- --name add_competition_fixtures`
- `cd services/api && npm run build`
- `cd modules/team-creator && npm run build`

Live API smoke verification passed for:

- create tournament
- join with two users
- submit and approve two teams
- generate fixtures
- list fixtures

Smoke result:

- a two-entry knockout produced one round-one fixture
- the generated fixture returned `READY`
- the generated fixture contained the expected submitted team names

## Known Limitations

- fixture generation currently requires a power-of-two number of approved entries
- no byes yet
- no fixture winner advancement yet
- no live-match attachment yet
- no commissioner fixture edit UI yet, although the API route exists

## Product State After This Pass

The tournament flow now reaches:

1. create competition
2. join competition
3. submit team
4. approve team
5. generate first knockout fixtures

This is enough to start validating the real multi-user commissioner flow.

## Next Step

Add visible API identity management in the team creator so multi-user testing is explicit and controllable:

- show current shared API user identity
- allow resetting or changing the browser-local API identity
- then run the true multi-window commissioner / coach beta:
  - commissioner creates competition
  - coaches join
  - coaches submit their own teams
  - commissioner approves other users' teams
  - commissioner generates fixtures
