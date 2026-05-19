# 2026-05-19 Block Dice Team Import And Shared Backend Bootstrap

## Summary Of Work Completed

- finished the first practical block-dice and team-creator integration pass
- added team export from `modules/team-creator/`
- added team import, side loading, and imported-player placement flow in `modules/block-dice-calculator/`
- refined the block-dice explanation and team header flow so imported team identity stays readable in `EDIT` and `CALCULATE`
- pivoted suite documentation away from `local-first depth first, backend later`
- defined the shared backend MVP contract
- scaffolded `services/api/` with Fastify, TypeScript, Prisma, and PostgreSQL
- implemented the first live API route slice for users and leagues

## Files Added

- `docs/architecture/2026-05-19_shared_backend_mvp_spec.md`
- `docs/session_notes/2026-05-19_block_dice_team_import_and_shared_backend_bootstrap.md`
- `modules/block-dice-calculator/INTEGRATION_CHANGE_PLAN_UNSTABLE.md`
- `modules/block-dice-calculator/src/shared/integration/teamImport.ts`
- `modules/block-dice-calculator/src/shared/integration/teamCreatorStore.ts`
- `modules/block-dice-calculator/src/shared/integration/resolveImportedTeam.ts`
- `modules/block-dice-calculator/src/tools/block-dice/tests/resolveImportedTeam.test.ts`
- `modules/team-creator/src/shared/types/teamExchange.ts`
- `services/api/.env`
- `services/api/.env.example`
- `services/api/README.md`
- `services/api/package.json`
- `services/api/prisma/schema.prisma`
- `services/api/src/app.ts`
- `services/api/src/config/env.ts`
- `services/api/src/plugins/prisma.ts`
- `services/api/src/routes/health.ts`
- `services/api/src/routes/leagues.ts`
- `services/api/src/routes/matchSessions.ts`
- `services/api/src/routes/teams.ts`
- `services/api/src/routes/users.ts`
- `services/api/src/server.ts`
- `services/api/tsconfig.json`

## Files Modified

- `README.md`
- `REPOSITORY_MAP.md`
- `ROADMAP.md`
- `docs/architecture/overview.md`
- `modules/block-dice-calculator/src/tools/block-dice/components/BlockDiceCalculator.module.css`
- `modules/block-dice-calculator/src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `modules/block-dice-calculator/src/tools/block-dice/rules/calculateBlockDice.ts`
- `modules/block-dice-calculator/src/tools/block-dice/tests/calculateBlockDice.test.ts`
- `modules/team-creator/src/data/skillReferences.ts`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.module.css`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx`

## Product Decisions Locked

- the local export/import bridge was useful, but it is not the final multi-device path
- the next real blocker is shared persistence and match-session handoff
- `modules/block-dice-calculator/` remains the stable tactical module
- `modules/team-creator/` remains the frontend owner of team editing
- shared identity, leagues, teams, and session loading belong in `services/api/`

## Backend Status

- PostgreSQL local development database is live
- Prisma migration for the initial shared backend schema has been applied
- implemented endpoints:
  - `POST /users`
  - `GET /users/:userId`
  - `POST /leagues`
  - `GET /leagues/:leagueId`
  - `POST /leagues/:leagueId/join`
  - `GET /leagues/:leagueId/members`
- local API smoke test succeeded against `http://127.0.0.1:3001`

## Verification

- block dice: `npm run test`
- block dice: `npm run build`
- team creator: `npm run test`
- team creator: `npm run build`
- API: `npm run prisma:migrate:dev -- --name init_shared_backend`
- API: `npm run build`
- API: live smoke flow for create user, create league, join league, fetch league, fetch members

## Next Recommended Step

- implement team CRUD endpoints in `services/api/`
- keep the payload shape close to the existing saved-team model
- then add an API-backed repository path for `modules/team-creator/`

## Git Branch Used

- `main`
