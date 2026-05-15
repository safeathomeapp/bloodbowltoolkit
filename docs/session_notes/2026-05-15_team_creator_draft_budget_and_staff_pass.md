# 2026-05-15 Team Creator Draft Budget And Staff Pass

## Summary Of Work Completed

- expanded the team-creator data model to reflect the Blood Bowl drafting pages supplied from the rulebook
- updated the editor so a team draft now includes budget, rerolls, sideline staff, dedicated fans, apothecary purchase, and derived treasury
- added draft validation checks so the UI can show when a roster is not yet legally drafted

## Files Modified

- `modules/team-creator/src/shared/types/team.ts`
- `modules/team-creator/src/tools/team-creator/utils/teamFactory.ts`
- `modules/team-creator/src/shared/utils/teamMath.ts`
- `modules/team-creator/src/shared/repositories/localTeamRepository.ts`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.module.css`
- `modules/team-creator/src/tools/team-creator/tests/localTeamRepository.test.ts`
- `modules/team-creator/src/tools/team-creator/tests/teamMath.test.ts`

## Functional Changes

- added persisted draft fields:
  - `draftBudget`
  - `assistantCoachCount`
  - `cheerleaderCount`
  - `dedicatedFans`
- retained `apothecaryPurchased` and made it part of value and budget calculations
- added calculations for:
  - sideline spend
  - dedicated fans spend
  - treasury remaining
  - draft warnings

## Validation Added

- draft warnings now flag:
  - fewer than 11 players
  - more than 16 players
  - more than 8 rerolls
  - more than 6 assistant coaches
  - more than 12 cheerleaders
  - dedicated fans outside 1 to 7
  - apothecary purchase on rosters that cannot take one
  - spending above the configured draft budget

## Compatibility Decision

- older locally saved teams are normalized on read so the new draft fields default safely instead of breaking existing saved data

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`

## Next Recommended Step

- break the current editor into clearer draft stages:
  - team identity
  - player hiring
  - sideline staff and fans
  - draft review
- then expose player progression editing more directly inside the register

## Git Branch Used

- `main`
