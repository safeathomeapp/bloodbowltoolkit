# Team Creator

Local-first Blood Bowl team creator module.

## Current Scope

- choose a roster template
- create and save teams locally
- add and remove players within template quantity caps
- edit player names and shirt numbers
- track reroll count
- calculate current team value from player values plus rerolls

## Current Seed Data

The first local scaffold includes only rule-source-backed templates from the material currently provided in the repository session:

- Amazon
- Orc

More templates should be added from authoritative roster sources, not guessed.

## Run

```bash
cd modules/team-creator
npm install
npm run dev
```

## Verify

```bash
cd modules/team-creator
npm run test -- --run
npm run lint
npm run build
```
