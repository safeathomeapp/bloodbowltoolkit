# Architecture Overview

The repository is organized as a toolkit, but only one tool is in MVP scope: the Block Dice Calculator.

Key constraints:

- mobile-first UI
- local-only state
- no backend
- rules engine outside React
- beginner-readable structure

The main separation to preserve throughout implementation is:

- permanent player data via `PlayerProfile`
- board placement data via `PlacedPlayer`
