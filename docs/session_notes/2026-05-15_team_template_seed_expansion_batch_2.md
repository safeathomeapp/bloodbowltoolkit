# 2026-05-15 Team Template Seed Expansion Batch 2

## Summary Of Work Completed

- refreshed the existing Orc template from the uploaded rulebook roster page instead of the earlier website-derived source
- added source-backed roster template files for:
  - Black Orc
  - Goblin
  - Halfling
  - Ogre
  - Underworld Denizens
- extended the template model to support shared cross-position purchase limits for rosters such as Underworld Denizens

## Files Created

- `modules/team-creator/src/data/rosterTemplates/black-orc.json`
- `modules/team-creator/src/data/rosterTemplates/goblin.json`
- `modules/team-creator/src/data/rosterTemplates/halfling.json`
- `modules/team-creator/src/data/rosterTemplates/ogre.json`
- `modules/team-creator/src/data/rosterTemplates/underworld-denizens.json`
- `docs/session_notes/2026-05-15_team_template_seed_expansion_batch_2.md`

## Files Modified

- `modules/team-creator/src/shared/types/team.ts`
- `modules/team-creator/src/shared/utils/teamMath.ts`
- `modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx`
- `modules/team-creator/src/data/rosterTemplates/orc.json`
- `modules/team-creator/src/data/rosterTemplates/index.ts`
- `modules/team-creator/README.md`

## Intentional Empty Fields

- `specialRules: []` is used only where the uploaded image explicitly says `NONE`

## Intentional Null Fields

- `passing: null` is used where the roster row shows `-`
  - Goblin `Looney`
  - Goblin `Fanatic`

## Clarifications And Omissions

- no known unreadable roster fields were omitted in this batch
- Underworld Denizens required a shared purchase rule not present in the first schema:
  - one big guy total, chosen from Troll or Rat Ogre
  - this is now represented with a shared limit group in template data

## Architectural Decisions

- corrected Orc to be rulebook-sourced like the other seeded teams
- preferred extending the schema for shared roster limits instead of silently flattening the Underworld big-guy rule

## Rejected Approaches

- did not keep the earlier website-derived Orc data once the rulebook source was available
- did not model Underworld as two independent big-guy slots because that would have been wrong

## Unresolved Issues

- more roster screenshots still need to be transcribed into template files
- a later audit pass should continue flagging any ambiguous skill names or punctuation copied from source images

## Next Recommended Step

- run full module verification
- continue with the remaining roster screenshots in batches
- keep an explicit omissions section in each future seed-expansion note

## Git Branch Used

- `main`
