# Blood Bowl Toolkit Suite

This repository now acts as the suite-level home for multiple Blood Bowl tools and supporting documentation.

The current finished working software is:

- `modules/block-dice-calculator/`

That directory contains the stable MVP/PWA block-dice helper that has already been beta tested and is the baseline to integrate with later suite modules.

## Current Module Status

- `modules/block-dice-calculator/`: stable working software, ready to be treated as the reference integration target

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
- `docs/session_notes/`
- `docs/architecture/`
- `docs/rules_references/`

## Important Integration Note

Before adding roster, league, competition, or other suite functionality, treat `modules/block-dice-calculator/` as the known-good working module. Integrate around it deliberately instead of casually rewriting it from the repository root.
