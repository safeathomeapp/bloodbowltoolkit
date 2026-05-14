# UX Rewrite Roadmap

## Goal

Realign the MVP with the revised tactical interaction model without discarding valid foundational work.

## Phase 1: Architecture Reset

- Introduce top-level `EDIT` / `CALCULATE` mode state
- Separate board editing interactions from tactical preview interactions
- Remove assumptions that Calculate Mode starts with explicit target selection

## Phase 2: Standard Preview

- Select one blocker in Calculate Mode
- Show adjacent opposing targets with inline dice overlays
- Reuse the current rules engine to calculate preview values
- Keep the UI low-noise and mobile-readable

## Phase 3: Blitz Preview

- Add long-press on the active blocker to toggle Blitz Preview
- Show non-adjacent target previews only while Blitz Preview is active
- Add mandatory disclaimer that movement legality is not checked

## Phase 4: Candidate Attack Squares

- Evaluate all adjacent candidate attack squares around a blitz target
- Show dice overlays per candidate square
- Distinguish best candidate, fallback candidates, occupied squares, and invalidated squares

## Phase 5: Manual Invalidation

- Allow long-press on candidate squares to mark them unreachable
- Recalculate best available candidate after invalidation
- Keep this as a manual UX compromise, not a movement engine

## Phase 6: Explanation Integration

- Bind the Why panel to the selected preview or candidate square
- Explain standard versus blitz context
- Explain selected attack square when applicable

## Phase 7: Stabilization

- Expand tests for preview generation and candidate evaluation
- Re-check mobile readability and long-press behaviour
- Clean up superseded UI paths
