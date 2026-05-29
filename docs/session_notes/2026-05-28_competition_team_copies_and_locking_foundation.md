Status: active historical

# 2026-05-28 Competition Team Copies And Locking Foundation

## Scope

Implemented the first competition-bound team copy foundation after the account/auth pass.

## What Changed

- Added competition-copy fields and relations to the API schema:
  - `Team.baseTeamId`
  - `Team.competitionEntryId`
  - `Team.isCompetitionCopy`
  - `Team.competitionLocked`
  - `Team.competitionLockedAt`
  - submission linkage from `CompetitionTeamSubmission.competitionTeamId`
- Added migration:
  - `services/api/prisma/migrations/20260528230000_add_competition_team_copies/`
- Competition submission creation/update now creates or refreshes a dedicated competition team copy.
- Competition approval now locks the competition team copy and marks it active.
- Fixture match-room creation now prefers the competition-bound team copy instead of the original saved team.
- Standard `/teams` update/delete protections now block direct editing or deletion of competition-bound copies.
- Team API list/get payloads now expose competition-copy metadata.
- Team creator now keeps base saved teams and competition copies separate:
  - base teams still appear in `Load Saved Team`
  - competition copies now appear in a separate `Locked Team Vault` section
- Loading a competition copy into the editor shows that it is competition-bound and disables standard save.
- Competition owners can now edit core competition settings from the shared competition form:
  - name
  - description
  - max entrants
  - submission deadline
  - unofficial roster toggle
- Competition fixture panel now explains that at least two approved entries are required before brackets can be generated.

## Intent

This pass establishes the structural split between:

- editable base teams in the normal team vault
- competition-bound copies created from submissions
- locked competition copies used by fixtures and later live matches

It does **not** yet implement full editing of an unlocked competition copy through a dedicated competition workflow. Standard editor save is intentionally blocked for competition copies.

## Verification

- `services/api`: `npm run build`
- `modules/team-creator`: `npm run build`

## Next Likely Step

- add competition-copy editing through competition workflow rather than standard team save
- add submission rejection with TO reason
- add clearer locked/unlocked competition team actions in the UI
