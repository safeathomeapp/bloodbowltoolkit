Status: reference next-phase note

# Next Phase Note

For startup canon, use:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

## Where We Are

- block dice is stable and integrated with shared match rooms
- team creator is the canonical team editing surface
- shared backend persistence is in place
- competitions, submissions, fixtures, and fixture-backed match rooms are implemented
- the current shared match room should now be treated as the baseline `MATCHED_PLAY` room model
- league should reuse match logging but continue into a separate post-game progression flow
- live-team progression already supports:
  - SPP
  - casualty outcomes
  - `MNG`
  - niggling injuries
- roster lifecycle and inactive-history handling are in place
- temporary-retirement and firing guardrails were just tightened against the uploaded post-game rulebook page

## What The Docs Now Assume

- `services/api/` is real and active
- `modules/team-creator/` currently defaults to API mode locally
- browser-local persistence differs by origin
- `localhost` and `127.0.0.1` are not interchangeable for local team data

## Best Next Move

Update competition creation pages so the competition-type boundary is explicit before expanding the match-room model further.

After that, build the first explicit live-team `Post-Game Sequence` flow.

Minimum scope:

1. dead-player cleanup
2. replacement hiring
3. firing in post-game order
4. temporary retirement inside that sequence
5. journeyman hiring
6. treasury and winnings
7. dedicated fans changes
8. staff/reroll post-game administration
9. MVP and remaining post-game SPP handling

## What Not To Do Next

- do not jump to standings first
- do not broaden into redraft first
- do not rewrite block dice
- do not treat tournament snapshots as live mutable teams
- do not change server hostnames casually while testing browser-local persistence

## Reminder

- one canonical saved team
- live leagues mutate that team
- tournaments remain snapshot-based
- canonical startup context now lives in `docs/SESSION_BRIEF.md`
- canonical architecture now lives in `docs/ARCHITECTURE_CANON.md`
- runtime/session discipline lives in `docs/CODEX_SESSION_OPERATIONS.md`
