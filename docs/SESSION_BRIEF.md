Status: canonical startup doc

# Session Brief

Read this file at the start of every Codex session.

If architectural or workflow decisions are needed, also read:

- `docs/ARCHITECTURE_CANON.md`

Do not fan out into older planning docs unless this brief or the user explicitly points to them.

## Current Truth

- `modules/block-dice-calculator/` is stable working software.
- It is not the rewrite target.
- Any new code must continue to feed block dice without regressions.
- `modules/team-creator/` and `services/api/` are the primary rewrite / cleanup targets.

## Product Modes

The project has three distinct play modes:

1. `LEAGUE`
2. `MATCHED_PLAY`
3. `EXHIBITION`

These are different workflows, not just different validation presets.

## Current Direction

The current architectural direction is:

- real user accounts with verified email
- competition creation by users
- competition types with editable rulesets
- player-first competition entry, then team submission
- competition-bound locked team copies
- league play as destructive progression on the locked copy
- matched play as locked but non-destructive
- exhibition as permissive / free-form

## Stable Rule

Do not rewrite or destabilize `block-dice-calculator`.

If backend fields or API shapes need to change, preserve block-dice compatibility through:

- existing shapes
- adapters
- versioned contracts

Never casually rename or reshape payloads that block dice consumes.

## Immediate Work Priority

Priority order:

1. preserve block-dice compatibility
2. reduce workflow drift between team creator and competitions
3. separate league / matched play / exhibition correctly
4. keep rules sourced from uploaded references

## Session Start Checklist

1. Check `git status`.
2. Read this file.
3. Read `docs/ARCHITECTURE_CANON.md` if the task touches architecture, workflow, accounts, teams, competitions, or rewrite scope.
4. Check whether dev servers are already running before starting any.
5. State actual host/port and persistence mode if servers are started or changed.

## Runtime Facts

- expected local API host: `127.0.0.1`
- expected local API port: `3001`
- team creator default mode is currently API mode
- `localhost` and `127.0.0.1` are different browser origins

## Working Rules

- ask for source pages if Blood Bowl rules are uncertain
- do not invent missing league or matched-play steps
- document meaningful implementation passes
- beta test with the user when workflow or product judgment matters

## Rewrite Boundary

Rewrite around block dice, not through block dice.

Safe assumption:

- accounts, competition lifecycle, rulesets, locking, and team-copy flow can be redesigned
- tactical block-dice rules and stable integration behavior should be preserved

## Where Deeper Decisions Live

If deeper product or architecture detail is needed, use:

- `docs/ARCHITECTURE_CANON.md`

If the task is moving from planning into implementation structure or rewrite boundary decisions, also use:

- `docs/architecture/2026-05-28_codebase_reuse_map.md`
- `docs/architecture/2026-05-28_foundation_refactor_execution_plan.md`
