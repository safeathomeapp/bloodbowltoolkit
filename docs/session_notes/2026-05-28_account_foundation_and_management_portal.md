Status: historical session note

# 2026-05-28 Account Foundation And Management Portal

## Summary

This pass established real account foundations for the shared API flow and replaced the old pseudo-user identity approach in team creator.

The work covered:

- backend account/auth foundation
- frontend account portal integration
- profile editing
- staged email-change verification
- database cleanup of intrusive/obsolete fields

## Backend

Implemented real auth routes in `services/api`:

- signup
- email verification
- password login
- magic-link login
- session lookup
- logout

Added authenticated session handling and ownership enforcement across:

- team routes
- main competition write actions

Added account management routes for signed-in users:

- `PATCH /auth/profile`
- `POST /auth/email-change/request`
- `POST /auth/email-change/verify`

## Data Model

The user model was first expanded for auth/session support, then simplified for product fit.

Final active account fields now center on:

- `displayName`
- `email`
- `emailVerifiedAt`
- `townOrCity`
- `country`

Added staged email-change fields:

- `pendingEmail`
- `pendingNormalizedEmail`

Removed previously introduced low-fit fields:

- `username`
- `normalizedUsername`
- `locationArea`
- `whatsappHandle`
- `steamHandle`

## Frontend

Added a shared auth client in team creator and replaced the old auto-created `Local Coach` identity flow.

The account entry point was moved into the header account circle so account actions are not buried inside competitions.

The header account portal now supports:

- account creation
- verification token entry
- password login
- magic-link request and consume
- logout
- coach-name update
- town/city update
- country update
- staged email change and verification

Auth feedback was also surfaced directly inside the account portal so failed login attempts are visible immediately.

## Beta-Test Outcomes

Confirmed working during user-guided beta testing:

- signup
- verification
- password login
- magic-link login
- logout
- save/load teams under authenticated account
- competition create/join visibility under authenticated account
- profile updates

One issue found during beta:

- profile save initially failed with `Failed to fetch`

Cause:

- CORS `Access-Control-Allow-Methods` did not include `PATCH`

Fix:

- updated API CORS method list to include `PATCH`

## Verification

Verified in this pass:

- `services/api`: prisma migrate deploy, prisma generate, TypeScript build
- `modules/team-creator`: TypeScript build and Vite build
- live browser beta testing against local dev servers

## Deferred

Do not spend time on this yet unless cleanup ROI rises:

- consider renaming account `displayName` to `coachName` later once account/competition/team-copy foundations are stable

## Next Recommended Step

Proceed to competition-bound team copies and locking.

That is the next structural dependency for:

- league destructive progression on copies
- matched-play locked non-destructive entries
- TO approval/rejection workflow
- proper separation between base teams and competition teams
