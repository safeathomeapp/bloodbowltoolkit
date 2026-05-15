# 2026-05-15 Team Template Seed Expansion Batch 1

## Summary Of Work Completed

- expanded the local-first team creator seed library using uploaded rulebook roster screengrabs
- added source-backed roster template files for:
  - Human
  - Skaven
  - Dwarf
  - Dark Elf
  - Wood Elf
  - Lizardmen
- wired the new templates into the template index and updated the module readme to reflect the larger seeded set

## Files Created

- `modules/team-creator/src/data/rosterTemplates/human.json`
- `modules/team-creator/src/data/rosterTemplates/skaven.json`
- `modules/team-creator/src/data/rosterTemplates/dwarf.json`
- `modules/team-creator/src/data/rosterTemplates/dark-elf.json`
- `modules/team-creator/src/data/rosterTemplates/wood-elf.json`
- `modules/team-creator/src/data/rosterTemplates/lizardmen.json`
- `docs/session_notes/2026-05-15_team_template_seed_expansion_batch_1.md`

## Files Modified

- `modules/team-creator/src/data/rosterTemplates/index.ts`
- `modules/team-creator/README.md`

## Architectural Decisions

- continued using one JSON file per roster template
- kept only source-backed values from the uploaded rulebook images
- preferred explicit null for missing passing values such as Deathroller rather than inventing a fake stat value

## Rejected Approaches

- did not guess unsupported teams from memory
- did not delay expansion until all remaining teams were available at once

## Unresolved Issues

- the remainder of the uploaded roster images still need to be transcribed into template files
- some existing earlier templates, especially Orc, should be refreshed against the new rulebook screenshot for exact category parity

## Next Recommended Step

- run module verification after the seed expansion
- continue in batches through the remaining uploaded rosters
- refresh the earlier Orc template from the rulebook screenshot during a later cleanup pass

## Git Branch Used

- `main`
