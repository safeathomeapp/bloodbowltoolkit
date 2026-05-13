# Repository Map

## Folder Purpose

- `docs/session_notes/`: required implementation pass records
- `docs/rules_references/`: source-of-truth rules notes and uploaded clarifications
- `docs/architecture/`: architectural decisions and boundaries
- `docs/roadmap/`: supporting roadmap notes if needed later
- `public/`: static web assets and PWA assets
- `src/app/`: application shell and global UI framing
- `src/shared/types/`: cross-tool core domain types
- `src/shared/components/`: reusable presentational components
- `src/shared/rules/`: future shared rules helpers
- `src/shared/utils/`: generic utilities
- `src/tools/block-dice/`: block dice MVP feature area

## Source Of Truth

- Core cross-tool domain types: `src/shared/types/`
- Block dice feature logic: `src/tools/block-dice/rules/`
- Tool-specific tests: `src/tools/block-dice/tests/`
- App composition entry point: `src/app/App.tsx`
- Build, PWA, and test configuration: `vite.config.ts`

## Architectural Boundaries

- React components render state and explanation output, but do not own rules logic.
- The block dice engine must remain framework-independent and test-first.
- Future toolkit modules may be added under `src/tools/`, but none should be implemented during MVP bootstrap.
