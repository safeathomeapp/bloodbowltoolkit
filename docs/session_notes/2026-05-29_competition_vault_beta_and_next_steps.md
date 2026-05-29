Status: active historical

# 2026-05-29 Competition Vault Beta And Next Steps

## Summary

This pass continued the competition-mode split work and pushed it through beta review with the user.

The main outcomes were:

- competition creation is now separated from the competition vault list
- competition creation now behaves differently for:
  - `Resurrection / Matched Play`
  - `League`
- the competition vault now reflects the workflow split better
- a new scaling UX problem was identified in the competition vault

## What Changed In This Pass

### Competition Creation

The dedicated competition creation view now supports:

- user-facing `Resurrection / Matched Play` naming for backend `TOURNAMENT`
- `League` as a distinct setup path
- mode-aware defaults
- mode-aware field labels
- mode-specific settings persisted through `configJson`

Persisted resurrection settings now include:

- allow byes
- timer enabled
- per-turn seconds
- bank seconds
- bank reset at half

Persisted league settings now include:

- pre-game sequence toggle
- post-game sequence toggle
- standings defaults for win / draw / loss

### Competition Vault

Competition cards now diverge by type:

- `Resurrection / Matched Play` cards continue toward:
  - team submissions
  - submission review
  - fixture generation
  - match-room creation / opening
- `League` cards now show:
  - league administration shell
  - persisted league workflow defaults
  - standings defaults
  - explicit placeholders instead of incorrectly reusing resurrection fixture flow

## Beta Result

The user confirmed:

- things are working well so far

But beta also exposed a clear UX problem:

- once many competitions are saved, the current competition list becomes messy
- each competition should instead become a smaller summary card
- the summary card should be clickable
- deeper event / competition detail should open only when that specific competition is expanded or inspected

This should be treated as the next immediate UI priority before more competition workflow depth is added.

## Validation

- `modules/team-creator`: `npm run build`
- `services/api`: `npm run build`

## Agreed Resume Point

On the next Codex opening, start from:

1. refactor the competition vault into compact summary cards
2. make each card clickable for detailed competition/event workflow
3. keep the `Resurrection / Matched Play` vs `League` split visible in both summary and detail states
4. only then continue deeper competition workflow work

## Important Constraint

Do not collapse the new mode boundary while fixing the vault UX.

Preserve:

- `Resurrection / Matched Play` as the current non-destructive shared-room baseline
- `League` as a separate shell for later progressive workflow
