# 2026-05-22 Documentation Rewrite And Session Ops Guardrails

## Summary

This pass rewrote the main project-direction docs so they match the real repository state instead of the older pre-backend plan.

It also added an explicit Codex operations note to reduce future confusion around:

- running dev servers
- reported URLs
- API vs local repository mode
- `localhost` vs `127.0.0.1` local-storage differences

## What Changed

Updated:

- `ROADMAP.md`
- `NEXT_PHASE_NOTE.md`
- `docs/NEXT_SESSION_CODEX_START.md`
- `docs/architecture/2026-05-19_competition_backend_spec.md`
- `REPOSITORY_MAP.md`

Added:

- `docs/CODEX_SESSION_OPERATIONS.md`

## Why

The older docs had drifted behind the codebase.

In particular, they still implied or strongly reflected:

- no real backend yet
- earlier pre-competition sequencing
- weaker runtime/persistence guidance

That was now causing practical friction during beta use and server startup.

## New Documentation Direction

The rewritten docs now reflect:

- shared API is real and central
- team creator is the canonical team-management surface
- block dice is stable and integrated with shared match rooms
- the next implementation target is live-team post-game sequence and bookkeeping
- tournaments remain snapshot-based while leagues remain live-team based

## Operational Guardrails Added

The new operations doc explicitly requires future Codex sessions to:

- check for existing servers before starting new ones
- report real host/port values back to the user
- state active persistence mode when discussing missing teams
- remember that `localhost` and `127.0.0.1` are different local-storage origins

## Next Step

With documentation now aligned, the next product/code pass should be:

- explicit post-game sequence flow for live league teams
