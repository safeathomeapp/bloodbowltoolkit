# 2026-05-22 Roster Management UI And Draft Guardrails

## Summary

This pass turned the player lifecycle model into a usable roster-management flow in team creator, while also tightening draft-mode visibility so post-game controls do not leak into the drafting surface.

## What Changed

- split the roster editor into:
  - `Active Roster`
  - `Archived Players`
- replaced raw lifecycle editing on active players with explicit actions:
  - `Fire`
  - `Retire`
  - `Mark Dead`
- kept archived players visible as historical records instead of removing them from the team entirely
- removed the visible `Restore to Active` action from the archive view so archived players behave as final by default

## Draft vs Active Behavior

- in `DRAFT` status:
  - lifecycle actions are hidden
  - `NI` is hidden
  - `MNG` is hidden
  - archived-player section is hidden
  - removing a player still works as a clean draft edit with no penalty
- on locked teams:
  - `Fire` archives the player as `SOLD`
  - `Retire` archives the player as `RETIRED`
  - `Mark Dead` archives the player as `DEAD`

## Treasury Rule Fix

- firing an active player no longer creates an implicit treasury refund through the `draftBudget - TV` display
- the player is removed from active TV, but the stored team budget is offset so the treasury display remains flat
- draft removals still behave like free drafting edits

## Block Dice Follow-Up Included

- manual menu team loading in block dice now reads current shared API team state
- this fixed stale renamed-player data and stale 11-player snapshots when loading teams manually outside session-code flow

## Verification

- `modules/team-creator`: `npm run test`
- `modules/team-creator`: `npm run build`
- `modules/block-dice-calculator`: `npm run build`

## Beta Outcome

Confirmed in browser:

- active player counts and TV update correctly when archiving players
- archived players no longer appear in active roster calculations
- draft view no longer shows post-game lifecycle controls
- block-dice manual team loading now reflects current shared saved-team data

## Follow-On

The next best step is broadening post-game progression and roster administration from the current lifecycle base:

- confirmation and safety prompts for destructive roster actions
- fuller post-game progression review
- finance layer beyond current draft-budget/tv arithmetic
