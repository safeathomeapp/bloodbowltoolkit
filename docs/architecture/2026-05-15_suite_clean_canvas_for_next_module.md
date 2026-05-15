# 2026-05-15 Suite Clean Canvas For Next Module

## Purpose

Define how to add the next suite module in this repository without destabilizing the finished block-dice calculator.

## Current Baseline

- repository root is suite-level coordination space
- `modules/block-dice-calculator/` is finished working software
- the next module should begin as a sibling, not as an extension hidden inside the block-dice module

## Structure Rule

Use this pattern for now:

```text
root/
├── docs/
├── modules/
│   ├── block-dice-calculator/
│   └── <next-module>/
├── services/
│   └── api/   # only when a shared backend is actually needed
├── ROADMAP.md
├── README.md
└── REPOSITORY_MAP.md
```

## Boundary Rules

- each module owns its own UI, package manifest, build config, and runtime dependencies
- root docs describe suite direction, not per-module implementation details
- shared backend work should not be embedded inside one frontend module
- no new module should rewrite or absorb `modules/block-dice-calculator/` by default

## Practical Recommendation

To create a clean canvas for the next module:

1. create a new sibling directory under `modules/`
2. scaffold it independently
3. keep its README and status notes local to that module if needed
4. only introduce shared code when duplication becomes real and stable

## What To Avoid

- adding the next module at repository root as if the root were the app
- mixing new module code into `modules/block-dice-calculator/`
- creating premature shared abstractions before two modules truly need them
- coupling a future backend too tightly to block-dice-specific assumptions

## Result

This repository can now grow into a suite while preserving the block-dice calculator as a distinct, stable first module.
