# 2026-05-15 Team Creator Frontend Theme Pass

## Summary Of Work Completed

- redesigned the local-first team creator editor around a stronger suite-wide visual language
- used the supplied roster screenshots as layout references only, without copying their presentation directly
- aligned the team creator with a shared parchment, oxblood, and navy theme intended to carry across future modules

## Files Modified

- `modules/team-creator/src/app/global.css`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.module.css`

## Frontend Decisions

### Shared Suite Theme

- established theme variables in `global.css` for:
  - background
  - surfaces
  - accent red
  - navy utility color
  - line and shadow treatment
- kept the visual direction intentionally print-like and tabletop-adjacent rather than modern SaaS-neutral

### Page Structure

- retained a two-column app shell:
  - roster creation and saved-team navigation on the left
  - active team editor on the right
- rebuilt the editor into three clearer bands:
  - hero identity and total value
  - operational controls and player register
  - lower roster template and composition summary

### Reference Adaptation

- borrowed only broad structural ideas from the screenshots:
  - strong team-name focus
  - dense roster table
  - lower roster summary area
- avoided copying:
  - exact spacing
  - exact control layout
  - iconography
  - typography treatment
  - section composition

## Why This Matters

- the module now reads more like part of a software suite than a temporary admin form
- the new CSS variables give later modules a practical shared theme starting point
- the editor now exposes roster metadata and composition more clearly, which better matches how Blood Bowl users think about teams

## Verification

- `npm run test -- --run`
- `npm run lint`
- `npm run build`

## Next Recommended Step

- keep the current theme baseline and improve the editor behavior next:
  - clearer blocked-position messaging
  - player progression editing
  - saved-team import planning for block-dice

## Git Branch Used

- `main`
