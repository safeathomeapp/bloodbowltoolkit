Status: active historical

# 2026-05-29 Competition Creation Mode Split

## Summary

This pass separated competition creation from the competition vault list and pushed the creation flow toward the new product boundary:

- the current shared room model is the baseline for `Resurrection / Matched Play`
- `League` should be created as a different workflow shell, not just the same event model with extra flags

## UI Structure Change

Competition creation is no longer embedded directly above the competition vault list.

Instead:

- `Competitions` remains the vault / browse / manage surface
- `Create Competition` is now its own dedicated view inside the existing team-creator shell

This keeps creation focused on setup decisions and keeps the vault page cleaner.

## Terminology Change

User-facing language now treats backend `TOURNAMENT` competitions as:

- `Resurrection / Matched Play`

This avoids exposing the older internal naming directly in the creation UX while leaving backend enum names unchanged for now.

## Creation Flow Changes

The dedicated creation page now exposes:

- competition type
- format
- visibility
- start state
- entrant/coach count
- deadline
- unofficial roster toggle

It also includes mode-specific explanation blocks so the user sees the intended workflow consequence of the selected competition type before creating anything.

## Mode-Aware Defaults

### Resurrection / Matched Play

Defaults and guidance are oriented around:

- non-destructive event play
- locked event rosters
- shared match-room use
- returning result/state to competition context after signoff

Allowed format choices:

- `KNOCKOUT`
- `SWISS`
- `ROUND_ROBIN`

Allowed start states:

- `DRAFT`
- `OPEN_FOR_JOIN`
- `TEAM_SUBMISSION_OPEN`

### League

Defaults and guidance are oriented around:

- progressive competition-bound teams
- future pre-game / post-game league workflow
- league administration outside the timer room

Current constrained setup:

- format limited to `ROUND_ROBIN`
- start state limited to:
  - `DRAFT`
  - `OPEN_FOR_JOIN`

This is intentional. The league path should not pretend the rest of league progression already exists when it does not.

## Competition Vault Changes

The competition vault now reads more cleanly by type:

- `Resurrection / Matched Play`
- `League`

Competition cards now show the user-facing competition-type label instead of only exposing the raw internal model.

## Product Boundary Reinforced

This pass reinforces the intended split:

- `Resurrection / Matched Play` should continue into entrants, submissions, fixtures, and the current shared match-room baseline
- `League` should become the shell for later explicit league workflow, not immediate reuse of the same post-signoff behavior

## Validation

- `modules/team-creator`: `npm run build`

## Likely Next Step

The next likely implementation step after this pass is to separate settings more deeply by mode:

- resurrection-specific event/ruleset settings
- league-specific administration/setup settings
- post-create actions that differ by competition type
