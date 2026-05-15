# 2026-05-15 Team Template Seed Audit And Next Steps

## Summary Of Work Completed

- audited the current seeded roster template set after completing the uploaded rulebook screenshot conversion
- added a structural seed-integrity test so future edits do not silently break roster ids, quantity bounds, or shared-limit groups
- reviewed the current seed set for deliberate empty values, deliberate null values, and source-literal strings that may deserve later spot-checking

## Files Created

- `modules/team-creator/src/tools/team-creator/tests/rosterTemplateSeeds.test.ts`
- `docs/session_notes/2026-05-15_team_template_seed_audit_and_next_steps.md`

## Files Modified

- none

## Audit Findings

### Structural Findings

- all uploaded roster screenshots are now represented in the seeded template set
- the current schema correctly models shared big-guy limits for:
  - Chaos Chosen
  - Chaos Renegade
  - Underworld Denizens
  - Old World Alliance

### Intentional Empty Or Null Cases Already Present

- empty `specialRules` arrays only where the source image explicitly says `NONE`
- `passing: null` only where the source row shows `-`
- empty primary-category arrays only where the source row shows `-`
- empty `startingSkills` arrays only where the source row says `None`

### Source-Literal Strings Worth Later Spot-Checking

These were kept as printed/read from the uploaded images and were not normalized from memory:

- `Safe Pair of Hands`
- `Steady Footing`
- `Timmm-ber!`
- `Fumblerooski`
- `Eye Gouge`
- `My Ball`
- `Trickster`
- `Iron Hard Skin`
- `Breathe Fire`
- `Give and Go`
- `Punt`
- `No Ball`
- `Unchannelled Fury`
- `Altern Forest Treeman`

These are not flagged as wrong here.
They are simply the strings most likely to merit a second rules-text check later if precision cleanup becomes a priority.

## Architectural Decisions

- favored adding an automated structural audit over doing only another manual sweep
- treated source fidelity and structural correctness as separate concerns:
  - structure is now test-covered
  - wording fidelity still benefits from later human review where needed

## Rejected Approaches

- did not silently normalize unusual source text to a guessed canonical wording
- did not rely on manual comparison alone once the seed set became large

## Unresolved Issues

- the current audit does not prove every copied skill string is canonical; it proves the dataset is structurally coherent
- the editor still exposes only a subset of the full model despite the roster library now being broad

## Next Recommended Step

- add editor features that use more of the seeded data:
  - player type filtering and roster summaries
  - better handling of shared-limit groups in the add-player UI
  - progression field editing for SPP, injuries, and added skills
- then define the first block-dice import workflow from a saved team

## Git Branch Used

- `main`
