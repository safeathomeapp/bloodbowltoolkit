# Module Status: Block Dice Calculator

## Status

- state: stable working software
- maturity: beyond MVP, near production-ready for its current scope
- integration role: existing suite modules should integrate with this directory instead of replacing it

## Directory Role

`modules/block-dice-calculator/` is the current known-good application module in this repository.

Treat it as the baseline implementation before hooking in:

- saved player profile work
- roster tooling
- league tooling
- competition generation
- any broader suite shell

## Practical Rule

If future suite work needs block-dice functionality, start from this module as the source of truth.

Do not move active feature ownership back to the repository root.

Do not casually reopen MVP interaction decisions without a concrete bug or a deliberate versioned redesign.

## Verification Baseline

Run from this directory:

```bash
npm run test -- --run
npm run lint
npm run build
```
