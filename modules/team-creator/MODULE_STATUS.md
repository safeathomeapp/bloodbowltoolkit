# Module Status: Team Creator

## Status

- state: scaffolded local-first prototype
- maturity: early implementation
- integration role: source of saved team data for later suite modules

## Current Boundary

`modules/team-creator/` owns:

- roster-template loading
- saved team editing
- local persistence for saved teams

It does not yet own:

- backend persistence
- league workflows
- automated progression rules
- block-dice integration

## Practical Rule

Keep saved team and saved player state separate from immutable roster templates.

Do not guess team template data that has not been sourced from the rulebook or another authoritative reference.
