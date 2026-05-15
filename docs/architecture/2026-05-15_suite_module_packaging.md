# 2026-05-15 Suite Module Packaging

## Decision

The repository root is now suite-level coordination space.

The current runnable block-dice application is packaged under:

- `modules/block-dice-calculator/`

## Why

The block-dice helper is already the finished working software in this repository.

Future work on:

- saved rosters
- leagues
- competitions
- broader suite composition

should integrate with that stable module instead of leaving the live application smeared across the repository root.

## Practical Effect

- module-local app code, config, and package files live inside `modules/block-dice-calculator/`
- root docs remain the place for session notes, architecture notes, and roadmap control
- `modules/block-dice-calculator/MODULE_STATUS.md` is the explicit reminder that this is the stable working implementation before wider suite integration
