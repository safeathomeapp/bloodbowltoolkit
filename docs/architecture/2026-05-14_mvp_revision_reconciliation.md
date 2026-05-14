# MVP Revision Reconciliation

Date: 2026-05-14

## Purpose

This note reconciles:

- the original master brief
- the revised MVP interaction specification
- the implementation already completed in this repository

## Summary

The revised UX specification changes the interaction architecture materially, but it does not invalidate the core engineering work already completed.

What changes:

- interaction flow
- preview model
- selection model
- explanation-entry points

What remains valid:

- board representation
- player/profile separation
- rules calculation foundations
- mobile-first baseline
- PWA baseline

## Work That Remains Reusable

- `src/shared/types/game.ts`
- `src/tools/block-dice/rules/calculateBlockDice.ts`
- `src/tools/block-dice/types/blockDice.ts`
- the current 7x7 grid rendering and token property editing baseline
- local-only persistence

## Work That Is Functionally Superseded

- explicit one-target-at-a-time standard selection flow
- adjacent target selection as the primary calculate interaction
- current result panel as the main tactical discovery mechanism

These are not throwaway prototypes, but they should now be treated as transitional layers to refactor.

## Required Architectural Direction Shift

The repo should move from:

```text
edit board
select blocker
select target
calculate one result
```

to:

```text
edit mode
calculate mode
adjacent previews by default
optional blitz preview
candidate attack squares
manual invalidation
selected explanation
```

## Engine Direction

The current engine should be extended toward:

```ts
calculateAllTargetPreviews(board, blockerId)
calculateBestPotentialBlock(board, blockerId, targetId)
```

The current `calculateBlockDice(...)` logic should likely remain the low-level calculation primitive.

## Scope Warning

The UX revision increases interaction complexity, but it does not authorize:

- movement legality
- pathfinding
- dodge checks
- AI recommendations
- probability analysis

Those remain out of scope.
