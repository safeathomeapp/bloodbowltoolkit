# Modules

This directory contains distinct suite modules.

## Current Module

- `block-dice-calculator/`: stable working module and current integration baseline

## Rule For The Next Module

Create the next tool as a sibling directory here, for example:

```text
modules/
├── block-dice-calculator/
└── next-module-name/
```

## Boundary Rules

- each module should own its own package manifest and app entrypoint
- do not mix new module code into `block-dice-calculator/` unless it is a true fix or intentional integration
- shared backend or cross-module services should live outside this directory when needed

## Suggested First Files For A New Module

- `README.md`
- `MODULE_STATUS.md`
- package manifest and app scaffold for that module
