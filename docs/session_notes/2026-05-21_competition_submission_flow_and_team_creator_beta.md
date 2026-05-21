# Competition Submission Flow And Team Creator Beta

## Summary

This pass moved the shared backend from `competition shell only` into a usable tournament-entry workflow.

Delivered:

- backend `Competition` and `CompetitionEntry` foundation
- tournament team submission snapshots in `services/api`
- submission update and approval flow
- first browser-side competition workflow inside `modules/team-creator`

The result is that a user can now:

1. create a knockout competition
2. join it
3. submit one saved team into it
4. update that submitted snapshot before approval
5. approve the submission

## Backend Work

Implemented in `services/api`:

- `Competition`
- `CompetitionEntry`
- `CompetitionTeamSubmission`
- `CompetitionTeamSubmissionPlayer`

Added or completed endpoints:

- `POST /competitions`
- `GET /competitions`
- `GET /competitions/:competitionId`
- `POST /competitions/:competitionId/join`
- `GET /competitions/:competitionId/entries/:entryId/submission`
- `POST /competitions/:competitionId/entries/:entryId/submission`
- `PUT /competitions/:competitionId/entries/:entryId/submission`
- `POST /competitions/:competitionId/entries/:entryId/approve`

Behavior locked by implementation:

- tournament submissions copy from the existing saved team model
- one submission per competition entry
- submitted snapshots preserve player order and player data from `TeamPlayer`
- users may submit only their own saved teams
- competition owner approves submitted teams

## Frontend Work

Added a competition workflow to the API-backed `team-creator` app:

- new `Competitions` tab in the team vault screen
- create knockout competition form
- competition list loaded from shared API
- join competition action
- submit team / update submission action
- approve submission action when viewing as competition owner

The frontend intentionally stays thin:

- no bracket yet
- no fixture view yet
- no event-pack rule editor yet

This is enough to prove the entry and submission flow without overbuilding administration.

## Verification

Verified during the pass:

- `cd services/api && npm run prisma:migrate:dev -- --name add_competitions`
- `cd services/api && npm run prisma:migrate:dev -- --name add_competition_team_submissions`
- `cd services/api && npm run build`
- `cd modules/team-creator && npm run build`

Live API smoke verification passed for:

- create users
- create competition
- join competition
- submit team snapshot
- update snapshot to a different saved team
- read submission back
- approve submission

Browser beta also passed on the API-backed team creator:

- create knockout competition
- join competition
- submit saved team
- update submission
- approve submission

## Product State After This Pass

The suite now has a real tournament-entry backbone:

- shared user identity
- shared saved teams
- competition creation
- competition join flow
- static tournament submission snapshots
- submission approval

This is now strong enough to move into fixture generation.

## Next Step

Implement knockout fixture generation:

- add `Fixture`
- generate fixtures from `TEAM_APPROVED` entries
- add commissioner override support
- surface fixtures in the team creator competition view

That is the next required layer before live match rooms, timers, or fixture-backed block-dice preload.
