# Identity Control And Owner Submission Review

## Summary

This pass turned the competition flow into a real multi-window beta path instead of a same-user simulation.

Delivered:

- visible shared API identity controls in the API-backed team creator
- explicit browser-profile switching for commissioner and coach testing
- owner-side submission review list for other users' submitted teams

This made the following flow workable:

1. commissioner window sets its own identity
2. coach windows set different identities
3. each coach owns and submits their own saved teams
4. commissioner can review and approve other users' submitted entries
5. commissioner can then generate fixtures

## Frontend Work

Added to `modules/team-creator`:

- current shared API user card
- create/switch identity action
- reset identity action
- owner-only submission review section on competition cards

The review section now lists:

- submitted team name
- submitting user display name
- current entry state
- approve action

This closes the most important ownership-review gap in the competition UI.

## Verification

Verified during the pass:

- `cd modules/team-creator && npm run build`

Browser beta confirmed:

- distinct identities can be created in normal and incognito windows
- submitted teams from other users now appear in the owner review section
- owner can approve other users' submitted teams
- fixture generation still works after approval

## Remaining Gap

The owner can approve submitted teams, but cannot yet inspect a full read-only roster snapshot before approval.

That means there is still a validation gap for:

- roster legality
- player list review
- visible team composition before approval

## Next Step

Add a read-only submitted-team inspection path from the owner review section:

- open submission details before approval
- show team identity and roster summary
- show player list
- keep it read-only

That should be the next refinement before moving on to live-match attachment.
