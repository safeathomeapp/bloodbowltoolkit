# 2026-05-15 Team Creator First Pass Execution Plan

## Goal

Build a reusable team creator for 20+ Blood Bowl team types without coupling the design to one roster or one persistence layer.

## Immediate Principle

The first implementation must be template-driven.

Do not build a one-off editor around Amazon, Orc, or any other single team.

## Delivery Sequence

### Step 1: Domain Shape

Definition of done:

- roster template schema is defined
- saved team schema is defined
- saved player schema is defined
- mutable player state is separated from immutable roster-template state

### Step 2: Template Seed System

Definition of done:

- roster templates are loaded from seed data files
- seed format supports all official team types
- at least three templates exist for UI proving:
  - Amazon
  - Orc
  - Human

### Step 3: Team Creator Module Scaffold

Definition of done:

- `modules/team-creator/` exists
- module owns its own package, entrypoint, and README
- local repository implementation exists

### Step 4: Team List And Editor

Definition of done:

- saved teams can be listed
- a new team can be created from a template
- players can be added and removed within quantity caps
- player names and shirt numbers can be edited
- current team value is calculated
- teams can be saved and loaded

### Step 5: Progression-Ready Fields

Definition of done:

- `SPP`
- `NI`
- extra skills
- stat adjustments
- current player value

exist in the model even if some editing interactions stay minimal in the first pass

### Step 6: Cross-Module Readiness

Definition of done:

- output shape is stable enough for later block-dice import
- no team-builder logic is embedded inside the block-dice module

## Explicit Non-Goals For First Pass

- league creation
- fixture generation
- full advancement rules engine
- treasury-heavy campaign management
- complete backend-first implementation if that blocks proving the UI and model

## Recommendation

Build the first pass against a repository interface with local persistence first, then move the same module to shared backend persistence once the model and UI are proven.

