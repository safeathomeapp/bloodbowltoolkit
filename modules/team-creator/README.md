# Team Creator

Blood Bowl team creator module.

## Current Scope

- choose a roster template
- create and save teams
- add and remove players within template quantity caps
- edit player names and shirt numbers
- track reroll count
- calculate current team value from player values plus rerolls

## Repository Modes

The module can run against:

- local browser storage
- the shared API in `services/api/`

Set the repository mode with Vite env vars:

```bash
cd modules/team-creator
cp .env.example .env.local
```

Available env vars:

- `VITE_TEAM_REPOSITORY_MODE=local|api|auto`
- `VITE_API_BASE_URL=http://127.0.0.1:3001`

Recommended shared-backend development mode:

- `VITE_TEAM_REPOSITORY_MODE=api`
- `VITE_API_BASE_URL=http://127.0.0.1:3001`

## Current Seed Data

The current local scaffold includes rule-source-backed templates from the uploaded rulebook screengrabs:

- Amazon
- Black Orc
- Bretonnian
- Chaos Chosen
- Chaos Dwarf
- Chaos Renegade
- Dark Elf
- Dwarf
- Elven Union
- Gnome
- Goblin
- Halfling
- Human
- Imperial Nobility
- Khorne
- Lizardmen
- Necromantic Horror
- Norse
- Nurgle
- Ogre
- Old World Alliance
- Orc
- Shambling Undead
- Skaven
- Snotlings
- Tomb Kings
- Underworld Denizens
- Vampire
- Wood Elf

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
