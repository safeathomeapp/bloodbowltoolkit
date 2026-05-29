# 2026-05-22 Beta Workflow And Shared Module Testing Rule

## Summary

This pass added an explicit working rule for future Codex sessions:

- code
- beta test with the user
- document the pass
- push the completed work

It also made cross-module beta coordination explicit for team creator and block dice.

## What Changed

Updated:

- `docs/CODEX_SESSION_OPERATIONS.md`
- `docs/NEXT_SESSION_CODEX_START.md`

## New Rule

When asking the user to beta test any behavior that spans:

- `modules/team-creator/`
- `modules/block-dice-calculator/`

future sessions must first verify:

- both modules point at the same API base URL
- both modules are using the intended shared data path
- the visible team universe is consistent enough for the requested test

## Why

The repository now has a real shared backend, but the two frontend modules can still expose different visible data depending on:

- repository mode
- browser origin
- pseudo-user identity stored in local storage
- session-context loading versus owner-filtered listing

That means cross-module beta requests need a deliberate shared-state check first.

## Next Step

Continue with the next product pass only after preserving this workflow:

1. code
2. beta
3. session note
4. push
