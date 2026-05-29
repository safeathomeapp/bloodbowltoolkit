Status: reference planning doc

# Competition Workflow Questions And Rewrite Guidance

Superseded for startup and canonical product assumptions by:

- `docs/SESSION_BRIEF.md`
- `docs/ARCHITECTURE_CANON.md`

Keep this file for planning history and detailed answer traceability.

This document captures the planning response to the proposed competition model so it can be reviewed outside the terminal.

## Current Read Of The Direction

The direction is coherent.

The key shift is that `league` and `matched play` are not just team-building presets. They are `competition types` with manager-defined rulepacks.

That gives a cleaner model than what the code is doing now.

## What This Implies Structurally

1. A user creates a `competition`.
2. Competition has a `type`:
   - `LEAGUE`
   - `MATCHED_PLAY`
3. Competition also has a configurable `ruleset`:
   - starting purse
   - team tier mapping
   - allowed / disallowed rosters
   - inducement allow-list
   - inducement cost overrides
   - star player rules if needed later
   - format such as round robin / knockout
   - max players / teams
4. Users join competitions with an existing saved team.
5. If the competition is a league, joining should warn that the team becomes league-destructive and offer `copy before lock`.
6. If the competition is matched play, joining can use the existing team without destructive progression.
7. Team creator can still reuse most of the current roster UI, but league-only progression fields and workflows must be gated by competition context.

That is the right direction.

## Questions Still Needing Answers

These are the questions still needed before locking an implementation contract:

1. In this model, is the creator always the competition manager, or can managers be reassigned / multiple?
2. Do competitions admit `players` first and then teams, or is entry always `team-based`?
3. For leagues, can one coach enter more than one team into the same league?
4. For matched play, can one coach enter more than one team into the same event?
5. When a league team is copied on join, should the copied team immediately become `league-locked` and hidden from normal non-league editing, or just tagged as bound to that league?
6. If a user declines `copy before lock`, do we lock the original team directly with a strong confirmation?
7. Once a team is league-locked, what edits are still allowed outside the league workflow:
   - none
   - cosmetic only
   - only through explicit pre/post-game flows
8. For matched play, is there any concept of `locking` a roster to a specific event snapshot, or is it always a reusable non-destructive reference?
9. Should matched play validation be based on:
   - the competition's custom tier/ruleset only
   - or optionally an official preset plus local overrides
10. For the tier editor, do you want:
   - drag/drop roster tokens between Tier 1/2/3/4/Not Allowed
   - or a table/grid editor first, with drag/drop later
11. Do inducement rules need only:
   - allow / disallow
   - and cost override
   - or also quantity caps per inducement
12. Do you want competition presets at creation:
   - official league
   - official matched play
   - local club preset
   - blank custom
13. For public competitions, can anyone join instantly, or do all entries still require manager approval?
14. Is the existing submission approval flow intended to become the universal entry approval flow for both league and matched play?
15. For matched play formats like knockout and round robin, do you want bracket / round generation in the first workflow pass, or just rules + roster validation first?

## Rewrite Guidance

### Best Time To Rewrite

The best time is not `after everything gets worse`, and also not `right now before the workflow is frozen`.

The best time is:

1. After the rules and workflow contract is finished for:
   - league competition lifecycle
   - matched play competition lifecycle
   - team locking / copy semantics
2. After identifying which current behaviors are actually correct and worth preserving.
3. After writing a minimal regression suite around those correct behaviors.

So the right moment is probably `before` implementing too much more competition logic into the current tangled code, but `after` the domain contract is settled.

### Best Way To Rewrite

1. Freeze the product model first.
   - competition
   - ruleset
   - team entry
   - league lock
   - matched play non-destructive entry
2. Extract a written domain contract.
3. Write tests around the current correct rules math and team-state behavior.
4. Start a fresh codebase or fresh app shell beside the current one.
5. Port in small slices:
   - canonical types
   - pure validation/rules functions
   - API contracts
   - UI workflows
6. Reuse only code that is clean and test-backed.
7. Treat the current app as a reference implementation, not as the thing to keep patching forever.

## Recommendation

The current recommendation is:

- do one more planning pass
- then rewrite before building full competition workflow on top of the current structure

If the rewrite is delayed until leagues, matched play, locking, presets, tier overrides, inducement overrides, and workflow gating are all bolted onto the current code, the rewrite will be more expensive.

## Suggested Next Planning Deliverable

The next useful planning output would be a formal domain model and implementation contract covering:

- entities
- state transitions
- workflow boundaries
- an `allowed in league / allowed in matched play / allowed in exhibition` matrix

## Answered Decisions

These decisions were provided after the initial question pass and should now be treated as current planning assumptions unless later changed.

### Competition Management

1. The creator is not necessarily the only authority forever.
2. There should be a `head TO` / manager concept.
3. Authority can be delegated through tokens that grant a limited management feature set.
4. Match policing is primarily handled by the two participating players.
5. TOs and managers should be able to override certain player decisions when necessary.

### Entry Model

1. Competitions admit players first, then teams.
2. Team locking before an event matters because of anti-counterplay concerns.
3. A team must be locked a configured number of hours before the event.

### Team Limits Per Competition

1. League: one player, one team.
2. Matched play: one player, one team.

### League Locking

1. If a team is copied on join, the copy becomes the league-bound team.
2. Once the team is submitted, it should be locked.
3. A TO or manager can unlock it.
4. If the user declines `copy before lock`, the original team is locked directly after a strong confirmation.

### Editing Allowed After Lock

Allowed after lock outside normal league progression:

- team name
- player names
- player numbers / list ordering
- inducements, where competition rules allow them

All other destructive or progression-relevant edits should remain workflow-controlled and locked unless a TO unlocks the team.

### Matched Play Locking

1. Matched play should also lock a roster once it is tied to a competition.
2. If the user attempts to edit a locked matched-play team, the preferred flow may be to direct them toward copying it first.

### Validation Source

1. Validation should ideally be derived from the competition's custom rules.
2. Official presets should still exist as the starting point, but validation should follow the edited competition rulepack.

### Tier Editing

1. Drag-and-drop is the preferred end state for tier assignment.
2. Tier management should support Tier 1 / 2 / 3 / 4 / Not Allowed style assignment.

### Inducement Rules

Competition inducement configuration should support:

- cost
- quantity cap

Allow/disallow can be inferred from whether the configured allowed quantity is above zero.

### Presets And Reuse

1. League and matched-play creation should start from baked-in official defaults, or as close as possible.
2. Users then edit those defaults for local or event needs.
3. Clubs should be able to save a competition as a reusable draft template for future use.

### Approval Model

1. Public competitions still require manager approval.
2. The existing submission approval flow should become the universal entry approval flow for both league and matched play.

### Initial Scope

1. First matched-play pass should focus on rules and roster validation.
2. Bracket generation and round-robin generation can come later.

## Additional Account And Competition Decisions

These later answers add a user-account layer and refine submission, locking, and draft-template behavior.

### User Accounts

If a user wants to save a team or join a competition, they must sign up.

Current intended account basics:

- username
- email
- verified email
- broad location / area
- account deletion
- user-data deletion

This implies the project should stop treating local pseudo-user identity as a long-term model for competition participation.

### Competition Ownership And Visibility

1. A competition is started by a user.
2. That user controls whether it is:
   - invite only
   - public
3. Invite-only access may be shared by:
   - QR code
   - URL

### Entry Sequence

The intended flow is now:

1. A player joins the competition.
2. The player has a time frame to decide their team.
3. The player submits a team.
4. The TO approves and locks both the player entry and the team entry.

If a player later wants to withdraw:

1. they request to leave
2. the TO confirms the removal
3. the invite / slot can then be passed to another player

### Competition Team Assignment And Copying

On competition entry, the user should be told:

`Teams assigned to competitions are locked for the duration. If you wish to keep an editable version, create a copy.`

Current planning meaning:

1. The competition-bound version is always the locked one.
2. Once confirmed and locked by the TO, it takes on a new double-barrelled naming system.
3. The original non-competition team remains editable as normal.
4. The locked competition team is the live competition team.

### Locking Semantics

1. Manager / TO can unlock a team only up to competition start.
2. Anything involving gold cost or team value is locked once the team is competition-bound.
3. Locked team exceptions still allowed:
   - team naming
   - player naming
   - shirt number designation / list ordering

### League Inducement Storage

League inducements should be stored per:

- fixture
- round

not on the persistent base team.

### Submission Approval

1. Legality is checked at approval time.
2. If approval fails, the TO should have a small text box for the rejection reason.

### Competition Draft Templates

Reusable competition drafts should save the full competition setup:

- rules
- format
- tier mapping
- allowed rosters
- inducement settings
- other edited competition configuration

The user should be asked whether they want to keep a draft copy for future events when creating the competition.

### TO / Manager Override Scope

Current intended override scope is broad:

- unlock a team
- approve or reject submission
- edit later competition administration
- override match confirmation / signoff
- force-close a match

### Team Copies And Naming

The new naming model means:

1. the original unlocked team remains the normal editable team
2. the competition-assigned team is a distinct locked copy
3. the locked copy is the live competition team for that event

### Tier Source

1. There should be one official default tier list.
2. Local competition-specific tiers can be overridden and saved inside the reusable competition draft/template.

## Final Answered Decisions

These later answers close most of the remaining planning gaps.

### Signup And Verification

1. Email verification must happen immediately after signup.
2. Login should support:
   - email + password
   - magic link
3. Additional contact fields such as WhatsApp or Steam usernames are desired for competition contact purposes.
   - This is currently a requested profile-field direction, not yet a finalized mandatory-schema statement.

### Competition Slot Occupancy

1. A player occupies a competition slot once they join, even before team submission.
2. This is part of why the time-based lock / submission deadline matters.
3. If no team is submitted in time, that slot may be reassigned.

### Approval Scope

1. Approval is on team submission.
2. There is no separate pre-approval step for the player independent of the team submission in the current model.

### Competition Copy Timing

1. The competition-bound copy is created at the moment of submission.
2. That submission captures a snapshot in time.

### Rejected Submission Editing

1. If the submission is rejected, the player edits the competition copy.
2. They do not edit the original unlocked base team as the primary correction path.

### Matched Play Inducement Locking

1. In matched play, inducements are chosen after roster draft.
2. Once roster and inducements are finalized, both are locked for the competition.

### TO Unlock Limits

Even with TO authority, these are not considered valid ordinary editable changes once locked because they affect gold cost or TV:

- roster composition
- skills
- inducements

### Team Visibility

1. Competition-bound teams should be shown separately from normal teams.
2. However, all team categories should still be visible to the user.

This implies a UI split such as:

- normal editable teams
- competition teams

rather than hiding competition copies entirely.

### Invite Sharing

Invite flows should support:

- invite URL
- QR code

### Account Deletion Constraint

1. Account deletion should be blocked if the user is in an active competition with an approved team.
2. This implies deletion policy must be aware of active competition participation state.

## Additional Product Constraints

### TO Contact Requirement

1. A TO must have at least one way to contact players in the competition.
2. There is concern that exposing visible player contact methods directly may create privacy / GDPR friction.
3. Preferred direction is therefore to avoid a broad internal social messaging system for now.
4. A slimmer contact approach is likely better, such as:
   - platform-routed email relay
   - limited competition contact channel
   - optional visible contact fields rather than mandatory public display

Current planning implication:

- contactability is mandatory
- broad profile contact exposure should be minimized
- a lightweight relay model is likely preferable to public contact disclosure

### Stable Block Dice Boundary

1. The current `block-dice-calculator` module is considered working and should not be rewritten as part of the broader cleanup.
2. Any new architecture must continue to feed that module reliably.
3. Database fields, API contracts, and shared type names should be planned with block-dice compatibility in mind.

Current planning implication:

- preserve or intentionally adapter-wrap the current block-dice integration contract
- do not treat block dice as part of the messy rewrite target
- rewrite should focus on team / competition / account architecture around the stable tactical module
