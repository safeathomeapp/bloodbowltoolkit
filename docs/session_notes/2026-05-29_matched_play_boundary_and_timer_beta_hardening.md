Status: active historical

# 2026-05-29 Matched Play Boundary And Timer Beta Hardening

## Summary

This pass did two kinds of work:

1. hardened the live match room during beta testing
2. made the product boundary explicit that the current room model is the baseline `MATCHED_PLAY` flow, not the full `LEAGUE` flow

## Live Match Fixes

- fixed roster-based event validation drift between frontend dropdowns and backend player checks
  - backend event validation now uses normalized shirt numbers
  - frontend clears stale player selections when team-side selectors change
- fixed turn-end review behavior so events can still be added during `REVIEW`
  - this preserves the intended workflow for correcting overlays or re-adding an event with the right player after `End turn`
- fixed end-of-half turn progression
  - after the second side completes turn 8 of the first half, the clock can no longer advance into turn 9
  - `Next half` must be pressed before the next clock start
  - after the second side completes turn 8 of the second half, the clock cannot start another turn and the room should proceed toward final signoff
- changed turn-1 start behavior so the opening side is chosen manually
  - the room no longer assumes blue/red should always open the half
  - this supports coin-toss-driven turn ownership

## Beta Outcomes Confirmed

The user confirmed during beta that:

- room ownership visibility is much clearer
- turn control behaves better than before
- event entry works as intended with per-event confirmation
- review gating is correct
- final signoff works
- post-turn review event correction now works after the frontend guard was aligned with the backend rule

## Architecture / Product Boundary Decision

The current shared match room should now be treated as the baseline `MATCHED_PLAY` room model.

That means:

- matched play should use the current timer / event log / confirmation / signoff flow
- matched play should return the result/state to competition context after signoff
- league should reuse match logging, but continue into a separate explicit post-game progression sequence
- league roster mutation should not be folded further into the timer room itself

## Documentation Updates

Updated docs to make that boundary explicit:

- `docs/ARCHITECTURE_CANON.md`
- `ROADMAP.md`
- `NEXT_PHASE_NOTE.md`

Also added a roadmap reminder to explore overtime rules later because they will affect:

- timer flow
- half/turn transitions
- extra-period UI/state behavior

## Agreed Next Step

Before expanding the room further, update the competition creation pages so the competition-type boundary is explicit:

- `MATCHED_PLAY` should follow the current room model
- `LEAGUE` should be framed around later pre-game / post-game progression flows

Only after that should the project move into:

- matched-play return-to-competition flow
- explicit league post-game sequence work

## Validation Run

- `services/api`: `npm run build`
- `modules/block-dice-calculator`: `npm run build`
