# Block Dice Calculator Module

Mobile-first PWA module for Blood Bowl tactical helpers.

This is the current finished working software in the suite repository.

## Scope

This module determines and explains Blood Bowl block dice.

It includes:

- local grid placement and editing
- standard block previews
- blitz preview and candidate attack squares
- assist, `Guard`, `Defensive`, `Horns`, and manual `Dauntless` support
- inline `WHY?` explanation flow
- local-only PWA installability

It does not include:

- full game simulation
- roster persistence
- league management
- competition generation
- online play

## Commands

```bash
npm install
npm run dev
npm run build
npm run test -- --run
npm run lint
```

## Source Of Truth

- module status and integration boundary: `MODULE_STATUS.md`
- rules source of truth: `../../docs/rules_references/2026-05-13_mvp_rules_source.md`
