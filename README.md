# Blood Bowl Toolkit Suite

This repository now acts as the suite-level home for multiple Blood Bowl tools and supporting documentation.

As of `2026-05-19`, the suite direction has pivoted away from a purely local-first sequencing model.

The earlier local-only team creator MVP work was useful for validating the team domain and block-dice integration shape, but the next practical build step is now shared league and match-session infrastructure so that multiple players on separate devices can load teams into the calculator without manual export/import steps.

Canonical Git remote:

- `origin`: `https://github.com/safeathomeapp/bloodbowltoolkit.git`

Current suite baseline branch:

- `main`

The current finished working software is:

- `modules/block-dice-calculator/`

That directory contains the stable MVP/PWA block-dice helper that has already been beta tested and is the baseline to integrate with later suite modules.

The historical feature-branch stack has been merged and retired. `main` is now the stable suite line and GitHub default branch.

## Current Module Status

- `modules/block-dice-calculator/`: stable working software, ready to be treated as the reference integration target
- `modules/team-creator/`: working drafting and saved-team MVP, but still local-first and not yet suitable as the final multi-user persistence model

## Current Product Pivot

The real target flow is now:

1. a player creates or joins a league
2. players create teams tied to their identity within the shared system
3. a match or competition session identifies the two participating teams
4. each player opens block dice already linked to the correct team and match context

That means the next core problem is no longer more local-only roster depth. The next core problem is shared persistence and session handoff across devices.

## Running The Current Working Module

```bash
cd modules/block-dice-calculator
npm install
npm run dev
```

Verification:

```bash
cd modules/block-dice-calculator
npm run test -- --run
npm run lint
npm run build
```

## Repository-Level Documents

- [ROADMAP.md](./ROADMAP.md)
- [REPOSITORY_MAP.md](./REPOSITORY_MAP.md)
- [modules/README.md](./modules/README.md)
- `docs/session_notes/`
- `docs/architecture/`
- `docs/rules_references/`

## Important Integration Note

Before adding roster, league, competition, or other suite functionality, treat `modules/block-dice-calculator/` as the known-good working module. Integrate around it deliberately instead of casually rewriting it from the repository root.

That constraint still holds after the pivot:

- do not rewrite block dice in order to introduce leagues
- introduce shared backend and session-loading layers around the stable module
- keep block-dice calculation logic independent from league administration concerns

## Next Module Rule

Create the next suite tool as a sibling under `modules/`.

Do not start the next tool:

- in the repository root
- inside `modules/block-dice-calculator/`
- or by mixing shared backend work into the existing frontend module

## Backend Rule

When backend work starts, place it outside the existing frontend modules.

Planned location:

- `services/api/`

The frontend modules should consume repositories or APIs, not absorb server responsibilities directly.
