Status: active historical

# 2026-05-28 End Of Day Handoff Beta Continuation

## Read First Tomorrow

Start with:

- [START_HERE.md](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/START_HERE.md)
- [docs/SESSION_BRIEF.md](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/SESSION_BRIEF.md)
- [docs/ARCHITECTURE_CANON.md](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/ARCHITECTURE_CANON.md)
- [2026-05-28_live_match_auth_handoff_and_turn_guardrails.md](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-28_live_match_auth_handoff_and_turn_guardrails.md)
- this handoff note

## What Was Done After The Last Session Note

The last main session note before this handoff was:

- [2026-05-28_live_match_auth_handoff_and_turn_guardrails.md](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/docs/session_notes/2026-05-28_live_match_auth_handoff_and_turn_guardrails.md)

After that note, the following additional fixes were made:

1. Fixed side-claim fallback in block dice.
   - Symptom: browser showed `Assigned side: BLUE/RED` but `Side not yet claimed in this room`.
   - Fix:
     - added explicit `Claim my side` fallback button
     - session refresh now retries participant claim automatically
   - Result: user confirmed the claim issue is now fixed.

2. Fixed stale session bleed between match rooms.
   - Symptom: opening a fresh competition room could still show old events from a previous room.
   - Cause:
     - block dice was still honoring persisted local session state too early during handoff
   - Fix:
     - if a launch URL provides a `sessionCode`, block dice now ignores stale persisted `currentSessionId` at startup
     - `applySessionContext` now clears old session event/signoff/progression state when a new room is loaded
     - bootstrapped room loading now runs from the handoff URL directly
   - Result: user reported sessions now seem to be sorted.

3. Removed conflicting confirmation controls.
   - Symptom: once claimed, a user could still see both red and blue confirmation buttons.
   - Fix:
     - only render the confirm button for the claimed participant side
   - Result:
     - much clearer ownership in the live room

4. Fixed casualty event deletion foreign-key failure.
   - Symptom:
     - deleting a casualty event failed with a foreign key error on `MatchSessionCasualtyResolution_matchSessionEventId_fkey`
   - Cause:
     - event delete ran before deleting the linked casualty-resolution row
   - Fix:
     - delete any linked `matchSessionCasualtyResolution` rows before deleting the event
   - Status:
     - code fixed
     - user must re-test this specifically tomorrow

## Current Runtime Status

All three dev servers were confirmed running at end of session:

- API: `http://127.0.0.1:3001/`
- Team creator: `http://127.0.0.1:5173/`
- Block dice: `http://127.0.0.1:5174/`

If they are down tomorrow, restart them from:

- `services/api`: `npm run dev`
- `modules/team-creator`: `npm run dev -- --host 127.0.0.1 --port 5173`
- `modules/block-dice-calculator`: `npm run dev -- --host 127.0.0.1 --port 5174`

## Important Product/Implementation State

Do not regress these principles:

- block dice is still treated as a protected module, but it is now being integrated cleanly into the authenticated suite
- no fake multi-entry beta shortcuts were added
- one user, one competition entry remains intact
- competition fixture rooms now hand off into block dice through authenticated launch URLs
- live match actions are meant to be participant-owned, not globally writable by any browser

Do not try to be clever by reviving the old loose match-room behavior. Continue hardening the new clean flow.

## Beta Continuation Plan For Tomorrow

Resume from beta, not from broad planning.

The user said they want to test 4 or 5 match rooms in mixed states later. That is the right next pressure test. Continue from there.

## Beta Checklist 1: Fresh Room Handoff

1. Create a brand new competition and fixture.
2. Create the match room from team creator.
3. Open the room from both browsers using `Open Match Room`.
4. Confirm block dice opens directly into the correct room without showing stale prior events.
5. Confirm each browser shows:
   - assigned side
   - claimed side
6. Confirm each browser only sees its own confirm button.

## Beta Checklist 2: Room Ownership

1. In each browser, confirm the signed-in participant corresponds to the expected side.
2. Confirm a browser cannot claim or act as the wrong side.
3. Confirm the team names shown in block dice are the competition-bound teams, not the original base teams.

## Beta Checklist 3: Turn Start/Stop Rules

1. Confirm the clock cannot start until both sides have claimed the room.
2. Start the turn clock.
3. Confirm start cannot be pressed again while the clock is already running.
4. End the turn.
5. Confirm the clock is stopped but the turn has not yet advanced.
6. Confirm the next turn cannot start until both sides confirm.

## Beta Checklist 4: Event Entry Rules

1. Try adding an event before the clock is running.
   - expected: blocked
2. Try adding a normal event without a player number.
   - expected: blocked
3. Add a valid normal event.
4. Add a casualty and confirm:
   - causing player required
   - injured player required
   - injury result chosen at add-event time
5. Confirm the other browser sees the updates within polling delay.

## Beta Checklist 5: Confirmed Turn Locking

1. End the turn.
2. Confirm from both sides.
3. Confirm the turn advances only after both confirmations.
4. Confirm events from the confirmed turn are no longer practically removable/editable.
5. Specifically check casualty events here too.

## Beta Checklist 6: Casualty Delete Re-Test

This is mandatory to re-check tomorrow.

1. Start a turn.
2. Add a casualty event.
3. Delete it before both sides confirm.
4. Confirm:
   - no foreign key error
   - event disappears cleanly
   - no stale injury result remains attached

If this still fails, inspect the delete path first before changing broader event logic.

## Beta Checklist 7: Half Progression

1. Try `Next half` too early.
   - expected: blocked
2. Confirm it does not generate endless half counts anymore.
3. Confirm second-half transition only happens when the server rules allow it.

## Likely Next Code Work After Beta

If the above mostly passes, next likely work should be:

1. clean up remaining live-match UX rough edges
2. tighten server messages for blocked actions
3. consider whether casualty result editing after creation should be:
   - not allowed at all
   - or allowed only before both confirmations
4. then move back to competition workflow items:
   - submission rejection with TO reason
   - editing unapproved competition copy through competition workflow
   - TO unlock controls

## Files Most Recently Touched In This Pass

- [services/api/src/routes/matchSessions.ts](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/services/api/src/routes/matchSessions.ts)
- [modules/block-dice-calculator/src/shared/integration/matchSessionApi.ts](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/modules/block-dice-calculator/src/shared/integration/matchSessionApi.ts)
- [modules/block-dice-calculator/src/tools/block-dice/components/BlockDiceCalculator.tsx](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/modules/block-dice-calculator/src/tools/block-dice/components/BlockDiceCalculator.tsx)
- [modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx](/C:/Users/kevth/Desktop/Projects/blood-bowl-toolkit/modules/team-creator/src/tools/team-creator/components/TeamCreator.tsx)

## Prompt To Resume Tomorrow

Use this mindset tomorrow:

“Continue the Blood Bowl Toolkit beta-hardening pass from the end-of-day handoff note. Do not re-plan the architecture. Start by re-checking the casualty delete fix and the fresh room handoff behavior, then continue through the listed beta checklists. Preserve the authenticated suite direction and do not reintroduce loose unauthenticated match-room behavior.”
