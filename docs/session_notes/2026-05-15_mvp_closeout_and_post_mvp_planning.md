# 2026-05-15 MVP Closeout And Post-MVP Planning

## Summary Of Work Completed

- reviewed the GitHub branch state for the MVP branch and confirmed `feature/blitz-why-panel` is clean and fully pushed
- confirmed there was no existing open PR for the MVP branch
- confirmed the repository default branch is still `feature/repo-bootstrap`
- updated `ROADMAP.md` to separate the shipped block-dice MVP from the next post-MVP exploration track
- prepared the repository for GitHub-side closeout:
  - MVP merge PR
  - follow-up planning issue for roster, league, and competition tooling

## Files Created

- `docs/session_notes/2026-05-15_mvp_closeout_and_post_mvp_planning.md`

## Files Modified

- `ROADMAP.md`

## Architectural Decisions

- treated the current block-dice calculator as the completed MVP baseline rather than continuing to expand the same branch without a merge point
- framed roster, league, and competition work as a separate design track that needs domain modelling and product-boundary decisions before implementation
- kept the roadmap explicit that persistent roster and league concepts should be designed before coding

## Rejected Approaches

- did not start implementing roster or league logic in this pass because the repository still needed MVP closeout on GitHub first
- did not collapse post-MVP ideas into vague “future work”; the roadmap now names the likely next modules and their intended sequencing

## Unresolved Issues

- the repository default branch naming is still historical and should be revisited after the MVP merge lands
- post-MVP scope is still exploratory and needs product decisions before implementation starts

## Next Recommended Step

- merge the MVP branch into the repository mainline branch
- decide whether to rename or replace the default branch with a stable mainline after merge
- start post-MVP design from roster persistence and team modelling before league or competition generation

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Context

- commit hash for this pass: pending at time of writing
