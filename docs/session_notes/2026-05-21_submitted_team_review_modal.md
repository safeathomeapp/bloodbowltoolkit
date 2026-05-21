# Submitted Team Review Modal

## Summary

This pass closed the last obvious pre-approval gap in the competition owner flow.

Delivered:

- owner-side read-only submitted-team inspection before approval
- frozen roster snapshot review from the competition submission record
- approval kept on the same review surface

This means a commissioner can now review what was actually submitted before marking an entry approved.

## Frontend Work

Added to `modules/team-creator`:

- `View Team` action in owner-side `Submission Review`
- read-only submission modal backed by the existing competition submission detail fetch
- submitted team summary showing:
  - team name
  - competition name
  - coach name
  - roster name
  - team value
  - tier id when present
- submitted player table showing:
  - number
  - name
  - position id
  - current value
  - extra skills

The modal reads the frozen tournament submission snapshot rather than the coach's live saved team, which keeps review aligned with the event record.

## Verification

Verified during the pass:

- `cd modules/team-creator && npm run build`

Browser beta confirmed:

- competition owners can open another coach's submitted team before approval
- the modal shows the expected submitted roster details
- approval still works from the same review section
- fixture generation still works after review and approval

## Product State After This Pass

The knockout tournament flow now reaches:

1. create competition
2. join competition
3. submit static tournament team snapshot
4. inspect submitted team
5. approve submission
6. generate fixtures

That is enough to move the next implementation focus from competition-entry administration to fixture-attached live match flow.

## Next Step

Attach live match rooms to generated fixtures:

- create or open a live match from a fixture
- preload both submitted teams from fixture context
- make block dice consume that live match context
- then layer timer and match-event tracking on top
