# Block Dice Integration Change Plan

## Purpose

This note marks the start of planned work that will change the current stable `block-dice-calculator` release.

The goal is to integrate saved teams from the team creator into the block calculator while preserving the existing manual workflow as a fallback.

## Stability Warning

- this plan is for work that will modify the current stable block-dice MVP
- keep the existing manual block-calculation flow intact while integrating saved-team imports
- treat this as an additive integration pass, not a rewrite

## Safe Fallback Status

Checked on `2026-05-19`:

- the top-level repository is **not fully synced** to GitHub at the moment
- local `HEAD` is `c35ef95c3b03e65b91ac08b339d7f385e15b2463`
- `origin/main` is `e7be7491fbf516e3356e955990c753d41e7a0301`
- the repo is currently `ahead 1` and also has local uncommitted changes outside this module

However:

- `modules/block-dice-calculator/` currently shows **no diff** against `origin/main`
- this means the block-dice module directory is still aligned with the GitHub version right now
- if an integration pass fails badly, the current GitHub state of this module remains the known working fallback

## Integration Goal

Allow the block calculator to load saved teams from the team creator as independent data sources for:

- attacker team
- defender team

Each side must be independent so the app can support:

- attacker from saved team, defender from saved team
- attacker from saved team, defender manual
- attacker manual, defender from saved team
- attacker manual, defender manual

## MVP Contract

The block calculator should consume resolved player data, not drafting logic.

Per imported player, MVP needs:

- player id
- team id
- player name
- position name
- MA
- ST
- AG
- PA
- AV
- starting skills
- added skills
- current value

Per imported team, MVP needs:

- team id
- team name
- roster name
- players

## Phased Plan

### Phase 1: Define Shared Import Types

- define a small import contract for block-dice consumption
- keep it separate from team-creator UI concerns
- resolve player stats and skills before block-dice receives them

### Phase 2: Add Shared Read Access

- expose saved team read access from the same local persistence layer used by the team creator
- do not duplicate storage assumptions in multiple places if avoidable
- keep this read-only for the first pass

### Phase 3: Add Import Controls To Block Dice

- add `Load Attacker Team`
- add `Load Defender Team`
- keep manual setup available for both sides

### Phase 4: Map Imported Players Into Existing Board State

- imported player data should prefill attacker and defender state
- preserve the current placement and calculation flow
- do not force the user into an imported-only path

### Phase 5: Support Mixed-Source Use

- one side imported, one side manual must work cleanly
- clearing one side back to manual must also work cleanly

### Phase 6: Verify The Integration

- test two saved teams from the same local user store
- test one imported side and one manual side
- test switching imported players
- test that imported skills affect the calculation correctly

## Boundaries

- do not add league logic in this pass
- do not add progression editing in this pass
- do not add cross-user import in this pass
- do not destabilize the existing manual block workflow

## Post-MVP Follow-Up

After MVP integration works:

- support progressed players cleanly
- support cross-user or shared-team loading through a backend later
- then revisit league and competition tooling on top of proven team integration

## Next Working Instruction

Start in this order:

1. define the shared import types
2. wire read access to saved teams
3. add attacker and defender import controls
4. preserve manual fallback on both sides

## Current Implementation Checkpoint

Updated on `2026-05-19`.

Completed in local uncommitted work:

- shared import types for block-dice consumption
- localStorage read access for saved teams from the team creator key
- explicit exported team-library import for cross-origin or separate-module use
- roster-template resolution into block-dice-ready imported players
- edit-mode side controls for loading a saved team on side `A` or side `B`
- imported-player selection for the next placement on each side
- grid placement that uses resolved imported player strength and supported block-dice skills
- manual fallback still available by setting a side back to `Manual placement`

Not completed yet:

- broader UX polish for source switching and side reset flows
- additional tests around the UI-level import path
- real end-to-end browser validation with saved teams from the main toolkit flow

## Beta Test Script

Before beta testing:

- re-run the Vite dev servers for the toolkit and any module entry points you normally use
- make sure the team creator has at least one saved team in local browser storage
- export a team package from the team creator if block dice is running on a different origin or port

Test this in order:

1. open the team creator and confirm at least one saved team exists
2. use `Export Teams For Block Dice` in the team creator
3. open the block dice calculator and use the menu action `Import teams`
4. confirm the imported team package is accepted
5. open block dice in `EDIT`
6. on side `A`, change `Source` from `Manual placement` to a saved team
7. confirm the `Next player` selector appears and shows roster players
8. tap empty grid squares and confirm imported players are placed one at a time
9. confirm placed imported players use their imported strength and supported skills
10. switch side `B` to either another saved team or keep it manual
11. confirm mixed mode works:
   attacker side imported, defender side manual
   attacker side manual, defender side imported
   both sides imported
12. remove an imported player with long press and confirm they become available to place again
13. switch an imported side back to `Manual placement` and confirm manual placement works again
14. switch to `CALCULATE` and confirm imported players can still be selected and used for block calculations
15. confirm imported `GUARD`, `DEFENSIVE`, `DAUNTLESS`, and `HORNS` affect dice results correctly where applicable

## Known Beta Focus

Pay special attention to:

- whether source switching feels clear enough when a side already has players on the pitch
- whether missing shirt numbers or similar player labels are confusing in the block-dice UI
- whether any saved team fails to load because of roster-template mismatch
