# 2026-05-22 Beta Test Script For Roster Guardrails

## Purpose

This is the step-by-step beta script for the code changed during this session.

Focus:

- temporary retirement behavior
- firing guard based on players eligible for the next game
- inactive roster presentation
- persistence after save/reload
- shared live-team visibility into block dice

## Pre-Flight

Before testing:

1. use the same browser for both modules
2. use the same origin for both modules
   - current expected URLs:
   - `team-creator`: `http://127.0.0.1:5173/`
   - `block-dice-calculator`: `http://127.0.0.1:5174/`
3. make sure the shared API is running at `http://127.0.0.1:3001/`
4. keep team creator in API mode
5. pick one existing `ACTIVE` team to use for the whole test

## Recommended Test Team

Use a live team that:

- is already saved
- has at least 12 active players
- is not a draft-only team

This gives room to test firing and temporary retirement without immediately breaking roster minimums.

## Beta Steps

### 1. Confirm starting roster state in team creator

1. open the team in team creator
2. confirm the roster is `ACTIVE`, not `DRAFT`
3. note:
   - active player count
   - rostered player count
   - eligible next-game count
   - team value
4. confirm the `Inactive Players` section is either empty or currently understandable

Expected:

- active, rostered, and eligible counts are visible
- the team loads normally from the shared API

### 2. Temporary retirement removes a player from active TV but not from the team list

1. pick one active player with a visible shirt number
2. click `Temp Retire`
3. confirm the dialog
4. save the team

Expected:

- the player disappears from `Active Roster`
- the player appears in `Inactive Players`
- the status label reads as temporary retirement behavior, not death/sale
- team value drops
- active player count drops by 1
- rostered player count does not drop

### 3. Temporary retirement still blocks roster slots and shirt-number reuse

1. note the retired player’s shirt number
2. add a new player of the same position if possible
3. inspect the new player’s shirt number
4. inspect the position usage count in the template/roster display

Expected:

- the retired player’s shirt number is not reused immediately
- the new player gets a different shirt number
- the temporarily retired player still counts against roster slot/position-limit usage

### 4. Firing does not refund treasury

1. note the current treasury value
2. pick a different active player
3. click `Fire`
4. confirm the dialog
5. save the team

Expected:

- the player moves to `Inactive Players`
- the player status is historical rather than temporarily retired
- team value drops
- treasury does not jump up as if a refund was granted

### 5. Firing is blocked if it would leave fewer than 11 players eligible for the next game

1. set enough active players to `MNG` so the eligible next-game count gets close to 11
2. attempt to fire an active player who is currently eligible

Expected:

- once the fire would reduce eligible next-game players below 11, the app blocks the action
- a clear feedback message is shown

### 6. `MNG` affects eligible next-game count but does not archive the player

1. toggle `MNG` on for one active player
2. save the team

Expected:

- the player stays in `Active Roster`
- eligible next-game count drops by 1
- active player count does not change
- rostered player count does not change

### 7. Dead players remain historical and may free shirt-number reuse

1. choose one active player
2. click `Mark Dead`
3. confirm the dialog
4. save the team
5. add a new player

Expected:

- the dead player moves to `Inactive Players`
- the dead player no longer counts toward active team value
- the replacement player may reuse a freed shirt number if available

### 8. Save, refresh, and reload persistence pass

1. save the team after the above changes
2. refresh the page
3. reopen the same team

Expected:

- all inactive statuses persist
- `MNG` persists
- counts remain correct
- shirt numbers remain stable

### 9. Shared-state check in block dice

1. open block dice in the same browser/origin family
2. load a match/session or team context that uses the same live team
3. inspect the resolved player list

Expected:

- non-active players are not surfaced as selectable live roster players
- renamed/current saved-team state still comes through from the shared backend
- block dice reflects the current live saved team, not a stale local-only snapshot

## What To Record During Beta

Please note:

- which team was used
- whether the team came from API/shared mode successfully
- any mismatch between active, rostered, and eligible counts
- whether a temporarily retired player incorrectly freed a slot or shirt number
- whether a fired player incorrectly refunded treasury
- whether block dice still showed any non-active player

## Pass/Fail Summary

This session’s code should be considered beta-passed if:

- temporary retirement keeps a player on the team list but out of active TV
- firing is blocked correctly by eligible-next-game rules
- inactive roster state survives save/reload
- block dice continues to respect active-only live roster visibility from shared backend state

## Next Step After Beta

If this script passes, proceed to the next implementation pass:

- explicit post-game sequence and bookkeeping for live league teams
