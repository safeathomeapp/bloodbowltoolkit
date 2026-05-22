# 2026-05-22 Team Creator Progression Fields

## Summary

This pass exposed core player progression fields directly in the team-creator roster editor.

Each player row now supports editing:

- `SPP`
- `NI`
- `MNG`

The goal was to make the canonical team-management flow capable of holding live progression state rather than forcing progression to exist only as a match-room concern.

## Frontend

Updated `modules/team-creator`:

- added editable player-row controls for:
  - SPP
  - niggling injuries
  - miss next game
- kept the editing path inside the existing roster table instead of introducing a separate progression screen
- kept save/load behavior unchanged so this works through the same repository abstraction already in place

## Persistence

Confirmed that progression-field edits persist through the existing team repository path:

- save
- reload
- full page refresh

This keeps local mode and shared API mode aligned with the same canonical saved-team shape.

## Verification

Verified locally:

- `modules/team-creator`: `npm run test`
- `modules/team-creator`: `npm run build`

Browser-tested:

- progression fields can be edited
- progression fields persist on save
- progression fields reload correctly

## Next Step

The next clean implementation slice is broader progression structure on top of the now-editable roster state:

- post-game progression review tightening
- richer injury/result modelling beyond `NI` and `MNG`
- keeping tournament history separate from live team mutation
