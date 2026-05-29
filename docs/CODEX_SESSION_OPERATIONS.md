Status: active operational doc

# Codex Session Operations

This file exists to stop future sessions from drifting on runtime assumptions, persistence mode, and server handling.

## Canonical Startup Docs

The mandatory startup reading set is now intentionally small:

1. `docs/SESSION_BRIEF.md`
2. `docs/ARCHITECTURE_CANON.md`

Do not treat older planning docs as mandatory startup reading unless the current task explicitly requires them.

## Mandatory Session Start

Before making changes:

1. read `docs/SESSION_BRIEF.md`
2. read `docs/ARCHITECTURE_CANON.md` if the task touches architecture, workflows, accounts, teams, competitions, or rewrite scope
3. check `git status`
4. check whether dev servers are already running

## Server Discipline

Do not start dev servers casually.

Before starting any server:

1. check whether one is already running
2. tell the user what you are about to start
3. record the host and port actually used
4. report the URL back to the user

If a server is already running, do not silently start a duplicate unless there is a clear reason.

## Runtime Facts To Remember

### Shared API

- expected local host: `127.0.0.1`
- expected local port: `3001`
- env file: `services/api/.env`

### Team Creator

- Vite dev server usually starts at `5173`
- env file: `modules/team-creator/.env.local`
- current default mode is API mode, not local mode

### Block Dice

- Vite dev server usually starts at `5173` or next available port
- if team creator is already on `5173`, block dice will usually move to `5174`

## Persistence Rules

### Repository Mode Matters

The team creator can run in:

- local browser storage mode
- shared API repository mode

Always state which mode is active when discussing missing teams or persistence behavior.

### Origin Matters

`localhost` and `127.0.0.1` are different browser origins.

That means:

- local storage is different
- generated API-user identity in local storage is different

Never assume missing teams were deleted before checking whether the origin changed.

## Required Communication After Server Changes

Whenever you start, stop, or restart a server, tell the user:

- which process changed
- which folder it came from
- which URL is now expected
- whether the app is using local or API persistence

## Beta Workflow Rule

The expected working rhythm is:

1. code
2. beta test with the user
3. document the pass in `docs/session_notes/`
4. push the completed pass to GitHub

Do not treat beta as optional when the change needs human interaction or product-direction confirmation.

## Cross-Module Beta Rule

When asking the user to beta test behavior that spans:

- `modules/team-creator/`
- `modules/block-dice-calculator/`

both modules must be checked for shared ownership and shared backend context first.

For these beta passes, confirm:

- both modules point at the same API base URL
- both modules are using the intended shared data path
- the visible team universe is consistent enough for the test being requested

If this is not true, fix or clearly explain the mismatch before asking the user to beta test.

## Documentation Discipline

After any meaningful implementation pass:

- add a session note
- update `docs/SESSION_BRIEF.md` if startup context changed
- update `docs/ARCHITECTURE_CANON.md` if canonical product or workflow assumptions changed

If runtime behavior changed in a way that affects testing:

- update this file too

## Current Project Focus

The active architectural direction is:

- preserve block-dice stability
- separate league / matched play / exhibition workflows correctly
- add real accounts and competition-bound team copies
- reduce workflow drift before bolting on more competition logic

The current implementation focus may vary by session, but it must stay inside the canon defined by:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

## Rulebook Discipline

If Blood Bowl rules are uncertain:

- ask for the page
- use the uploaded page
- do not invent missing steps

This is especially important for post-game sequencing and roster administration.
