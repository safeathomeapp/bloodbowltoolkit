# 2026-05-14 Remove Edit Mode Dice Overlays

## Summary

This pass removes block-dice overlay badges from edit mode.

## Why This Changed

- Newly placed players next to opponents were still showing dice numbers in edit mode.
- That calculation feedback belongs only to calculate mode.
- Edit mode should stay focused on board setup and player editing, not live tactical results.

## Functional Change

- Dice preview badges now render only in `CALCULATE` mode
- Edit mode no longer shows adjacency-based dice overlays on player tokens
