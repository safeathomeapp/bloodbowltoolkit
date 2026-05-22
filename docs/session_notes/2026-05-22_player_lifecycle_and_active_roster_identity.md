# 2026-05-22 Player Lifecycle And Active Roster Identity

## Summary

This pass tightened the roster identity model so shirt numbers, archived players, and live-tool imports behave like a real Blood Bowl team instead of a flat editable list.

## What Changed

- introduced a broader player lifecycle model around active roster identity
- added `playerStatus` to saved team players:
  - `ACTIVE`
  - `SOLD`
  - `DEAD`
  - `RETIRED`
- kept `missNextGame` as a temporary availability flag rather than using it as a roster-removal state
- kept shirt numbers numeric and player-owned
- changed shirt-number uniqueness rules so they apply only among `ACTIVE` players
- preserved inactive players on the roster instead of deleting them from history
- allowed freed shirt numbers to be reused once the previous holder is no longer active

## Team Creator

- active and retired team shirt numbers now freeze on save/load
- active-team reorder controls remain disabled
- removing a player from a locked roster now archives that player as `SOLD` instead of hard-deleting them
- player rows now expose lifecycle status directly
- summary cards and hero meta now show active-player count rather than total stored rows
- team math now excludes non-active players from:
  - player value
  - total team value
  - roster counts
  - slot/shared-group enforcement
  - draft warning player totals

## API

- added `TeamPlayerStatus` to Prisma schema and migrated the local database
- normalized shirt numbers server-side for locked teams while allowing archived-number reuse
- team list summaries now count only active players and active player value
- competition submissions now copy only active players into tournament snapshots
- live match progression now marks killed players as `DEAD`

## Block Dice

- imported-team resolution now ignores any non-active player, not just dead players
- manual team loading now includes current shared API teams rather than relying only on stale local import snapshots
- live session context is now refreshed from the shared API when a session is reloaded, so renamed live-team players stay in sync

## Verification

- `services/api`: `npm run prisma:migrate:deploy`, `npm run prisma:generate`, `npm run build`
- `modules/team-creator`: `npm run test`, `npm run build`
- `modules/block-dice-calculator`: `npm run build`

## Beta Outcome

Confirmed in browser:

- archived players are excluded from TV and draft minimum checks
- active-player counts now behave correctly
- live session loads pick up renamed players from the saved team
- manual menu team loading now shows current shared team state
- menu-loaded teams now expose all active players instead of stale 11-player snapshots

## Follow-On

The next structural step should be moving from raw lifecycle/status support into clearer post-game roster management:

- archive presentation in team creator
- explicit sell/retire/death workflow polish
- broader progression/result contract beyond the current casualty layer
