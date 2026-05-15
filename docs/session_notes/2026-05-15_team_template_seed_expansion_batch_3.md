# 2026-05-15 Team Template Seed Expansion Batch 3

## Summary Of Work Completed

- added source-backed roster template files for:
  - Bretonnian
  - Chaos Chosen
  - Chaos Dwarf
  - Elven Union
  - Imperial Nobility
  - Khorne
- reused the shared-limit model to correctly represent Chaos Chosen choosing a single big guy from Troll, Ogre, or Minotaur
- updated the roster template index and module readme to reflect the larger seeded roster set

## Files Created

- `modules/team-creator/src/data/rosterTemplates/bretonnian.json`
- `modules/team-creator/src/data/rosterTemplates/chaos-chosen.json`
- `modules/team-creator/src/data/rosterTemplates/chaos-dwarf.json`
- `modules/team-creator/src/data/rosterTemplates/elven-union.json`
- `modules/team-creator/src/data/rosterTemplates/imperial-nobility.json`
- `modules/team-creator/src/data/rosterTemplates/khorne.json`
- `docs/session_notes/2026-05-15_team_template_seed_expansion_batch_3.md`

## Files Modified

- `modules/team-creator/src/data/rosterTemplates/index.ts`
- `modules/team-creator/README.md`

## Intentional Empty Fields

- `specialRules: []`
  - Bretonnian
  - Elven Union
  - Imperial Nobility

These are intentional because the uploaded roster images explicitly say `NONE`.

## Intentional Null Fields

- none in this batch

## Clarifications And Omissions

- no known unreadable roster fields were omitted in this batch
- Chaos Chosen required a shared purchase rule:
  - one big guy total, chosen from Troll, Ogre, or Minotaur
  - this is represented with a shared limit group in template data

## Architectural Decisions

- kept one JSON file per roster template
- reused the shared-limit schema introduced earlier instead of adding one-off logic in the UI

## Rejected Approaches

- did not flatten Chaos Chosen into three independent big-guy slots
- did not “correct” roster text from memory where the screenshot text was legible

## Unresolved Issues

- more uploaded roster screenshots still remain to be entered
- later audit passes should continue checking unusual skill names copied verbatim from source material

## Next Recommended Step

- verify the team-creator module after the seed expansion
- continue with the remaining roster screenshots in further batches

## Git Branch Used

- `main`
