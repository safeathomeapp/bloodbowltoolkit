# Repository Map

## Folder Purpose

- `docs/session_notes/`: required implementation pass records
- `docs/rules_references/`: source-of-truth rules notes and uploaded clarifications
- `docs/architecture/`: architectural decisions and boundaries
- `docs/roadmap/`: supporting roadmap notes and historical planning passes
- `modules/`: suite modules
- `modules/block-dice-calculator/`: current finished working software and source-of-truth runnable module
- `modules/team-creator/`: local-first saved-team creation module

## Source Of Truth

- stable block-dice application module: `modules/block-dice-calculator/`
- local-first team creation prototype: `modules/team-creator/`
- block-dice feature logic: `modules/block-dice-calculator/src/tools/block-dice/rules/`
- block-dice tests: `modules/block-dice-calculator/src/tools/block-dice/tests/`
- block-dice module status and integration boundary: `modules/block-dice-calculator/MODULE_STATUS.md`
- suite roadmap and post-MVP direction: `ROADMAP.md`

## Architectural Boundaries

- The repository root is now suite-level coordination and documentation space, not the live app root.
- The block-dice calculator remains the current known-good working module and should be integrated into future suite work rather than reimplemented from scratch.
- React components render state and explanation output, but rules logic stays outside React and inside the module rules layer.
- Future toolkit modules may be added under `modules/`, but they should not destabilize the existing block-dice module without a deliberate migration plan.
