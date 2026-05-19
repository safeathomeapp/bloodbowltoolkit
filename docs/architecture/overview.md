# Architecture Overview

The repository is organized as a toolkit with two validated frontend modules and an upcoming shared backend layer:

- `modules/block-dice-calculator/`
- `modules/team-creator/`
- planned: `services/api/`

## Current Architectural Pivot

The earlier architecture assumed:

- local-only state
- no backend
- single-user flow

That assumption was valid for the first MVP passes, but it is no longer the correct long-term direction.

As of `2026-05-19`, the target flow is:

1. players create or join a shared league or competition context
2. players create teams tied to that shared context
3. a match or session resolves the participating teams
4. block dice loads the correct teams automatically on separate devices

Because of that, the architecture now needs a shared persistence and session layer.

## Current Constraints

- mobile-first UI
- stable block-dice rules engine outside React
- preserve beginner-readable structure where possible
- do not rewrite the stable block-dice module in order to add shared league flow

## New Separation To Preserve

The main boundaries going forward should be:

- frontend team management in `modules/team-creator/`
- frontend tactical calculation in `modules/block-dice-calculator/`
- shared persistence, identity, league, and session orchestration in `services/api/`

Within block dice, continue to preserve:

- permanent player data via `PlayerProfile`
- board placement data via `PlacedPlayer`

Within the wider suite, continue to preserve:

- canonical saved-team data as the source for roster and progression state
- block-dice calculation input as a resolved view of player data, not the owner of team-management logic

## Immediate Architectural Route

The next architecture work should define the minimal shared backend contract for:

- user identity
- league membership
- team ownership
- match or session identity
- side assignment for block-dice loading

This should be introduced around the existing frontend modules, not by embedding server concerns directly inside them.
