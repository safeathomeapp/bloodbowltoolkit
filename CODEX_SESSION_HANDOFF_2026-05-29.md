# Codex Session Handoff

Use this prompt at the start of the next Codex session.

```md
Please start by reading these files in this order:

1. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/START_HERE.md
2. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/NEXT_PHASE_NOTE.md
3. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/ROADMAP.md
4. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/ARCHITECTURE_CANON.md
5. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/SESSION_BRIEF.md
6. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-29_live_match_event_confirmation_rework.md
7. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-29_matched_play_boundary_and_timer_beta_hardening.md
8. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-29_competition_creation_mode_split.md
9. /c/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-29_competition_vault_beta_and_next_steps.md

After reading them, treat this as the current known state:

- The live match room/timer/event-confirmation flow has been beta tested and is working well.
- The agreed architectural boundary is:
  - `Resurrection / Matched Play` uses the current non-destructive match room flow.
  - `League` must later reuse tactical match logging but hand off into a separate progression/post-game workflow.
- Competition creation has already been split from the competition vault/list.
- Competition creation is mode-aware and working:
  - `Resurrection / Matched Play`
  - `League`
- Mode-specific settings are already persisted through `configJson`.
- The latest beta feedback identified the next UX problem:
  - the competition vault gets messy when many competitions exist
  - each competition should become a smaller summary card
  - each card should be clickable and open a more detailed competition/event view

Treat this as the exact resume point:

1. Refactor the competition vault into compact summary cards.
2. Make each competition card clickable into a clearer detail view.
3. Preserve the split between `Resurrection / Matched Play` and `League` in both summary and detail presentation.
4. Do not drift back into timer/event-room expansion unless it is required to support this vault/detail workflow.

Important context:

- The user has already beta tested the current competition creation flow and said it is working well.
- The user explicitly wants the next work to focus on competition vault UX.
- Overtime rules were noted as a future timer concern, but they are not the current task.

Before making edits:

- Inspect the current competition vault implementation in the team creator module.
- Check git status and recent commits so you are grounded in the latest checkpoint.
- Avoid re-deciding the matched-play vs league boundary; that decision is already made and documented.

Please begin by summarizing the current vault implementation and then implement the next UX pass.
```

## Repo State At Handoff

- Latest pushed commit on `main`: `c458af5`
- Commit message: `Add competition vault next-step checkpoint`
- Remote is up to date with the latest checkpoint

## Recommended Resume Goal

- Rework the competition vault from a crowded list into compact cards with a follow-on detail view.
