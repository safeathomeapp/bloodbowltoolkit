# Matched Play Ruleset And Workflow Plan

This file is a working implementation-oriented summary of the matched play pages read in this session, followed by a proposed workflow split across league play, matched play, and exhibition.

It is not a replacement for the source images.

Primary references:

- [2026-05-28_matched_play_rules_transcription.md](./2026-05-28_matched_play_rules_transcription.md)
- [2026-05-28_league_rules_transcription.md](../league_rules/2026-05-28_league_rules_transcription.md)

## Matched Play Ruleset

What matched play appears to require:

### Team Building

1. A matched play team is drafted from the normal team rosters.
2. The budget is event-defined, not fixed league start value.
3. Common examples given are `1,100,000`, `1,150,000`, and `1,200,000` gold pieces.
4. All budget must be spent during drafting.
5. Any unspent gold is lost.
6. Sideline staff and inducements must be written onto the team draft list.
7. Matched play teams start with `Dedicated Fans = 0`.
8. Additional dedicated fans may still be purchased during team construction.

### Inducements

1. There is no league-style CTV comparison and no petty cash flow.
2. Inducements are simply bought directly onto the team draft list.
3. Coaches may spend as much or as little on inducements as they wish.
4. The team must still have at least `11` players.
5. A tournament may ban or customize inducements.

### Tiers

1. Every roster belongs to a tier from `1` to `4`.
2. Better teams are in better tiers.
3. Better tiers get fewer skill points.
4. Tier lists are external and may change over time through the Designers' Commentary.

### No Persistent Progression

1. Players do not generate star player points during matched play.
2. Players do not gain advancements from matched play games.
3. Casualties do not persist from one matched play game to the next.
4. Each new matched play game starts with a full healthy team again.
5. Temporary players acquired during a game do not persist to the roster afterward.

### Skill Points

1. Teams receive skill points based on tier:
   - Tier 1: `6`
   - Tier 2: `8`
   - Tier 3: `9`
   - Tier 4: `10`
2. A primary skill costs `1` skill point.
3. A secondary skill costs `2` skill points.
4. Secondary-skill caps by tier are:
   - Tier 1: `1`
   - Tier 2: `2`
   - Tier 3: `3`
   - Tier 4: `4`
5. A player may only receive one additional skill.
6. Star players cannot receive additional skills.
7. Elite skills can only appear up to four times in a matched play roster.
8. Purchased matched-play skills do not increase player value or team value.

### Star Players

1. A normal star player costs `2` skill points plus their normal gold-piece cost.
2. A mega-star costs `4` skill points plus their normal gold-piece cost.
3. Tier 1 teams may include up to `1` star player.
4. Tier 2-4 teams may include up to `2` star players.
5. Teams may include at most `1` mega-star.
6. Pair-hired star players count as one star-player choice, but still take two roster spaces.
7. Teams may still never exceed `2` star players total, including mega-stars.

## Workflow Split

The product should treat the three modes as different procedures, not different labels on one generic editor.

### 1. League Play

League play needs explicit lifecycle workflows:

- persistent saved team
- pre-game sequence
- match facts
- post-game sequence
- off-season / redraft later

What league play should own:

1. Persistent injuries and recovery state.
2. Persistent SPP and advancement.
3. Persistent treasury.
4. Dedicated fans changes after games.
5. Journeymen pre-game and optional post-game hiring.
6. Post-game firing / temporary retirement / dead-player handling.
7. Expensive mistakes.
8. Match-room closure feeding a post-game admin flow, not directly mutating every roster field in one shortcut.

### 2. Matched Play

Matched play needs a team-construction workflow, but not league persistence:

- build roster to event budget
- buy inducements directly
- spend skill points
- optionally include star players
- play the game
- discard match-only injuries and temporary gains

What matched play should own:

1. Event budget.
2. Tier selection or tier lookup.
3. Skill-point allocation.
4. Star-player and mega-star caps.
5. Inducement purchase at build time.
6. No post-game progression.
7. No persistent casualty carry-over.

### 3. Exhibition

Exhibition should remain deliberately loose:

1. Free-form drafting.
2. No budget enforcement if you want that.
3. No persistent progression.
4. Minimal or no validation warnings beyond basic usability.

Your note is consistent with this:

- exhibition can mostly disable roster-construction error warnings
- exhibition does not need league or matched-play sequencing logic

## Proposed Procedure Design

### Team Domain

Keep one canonical team shape, but add an explicit rules context for how it is being used:

- `LEAGUE`
- `MATCHED_PLAY`
- `EXHIBITION`

This context should drive validation and available workflows, not fork the entire persistence model.

### Saved Team Categories

What I think is the cleanest split:

1. `League Team`
   - persistent
   - mutable through league workflows
2. `Matched Play Roster`
   - event-format build sheet
   - persistent as a saved roster if useful
   - no post-game progression
3. `Exhibition Roster`
   - optional lightweight save
   - permissive validation

### Team Creator Modes

The team creator should stop behaving like one blended editor.

It should have distinct procedures:

1. `League Draft`
   - build the initial league team
2. `League Team Management`
   - normal persistent roster view
3. `League Pre-Game`
   - next-fixture availability
   - journeymen
   - inducements if you want that later
4. `League Post-Game`
   - winnings
   - fans
   - SPP awards and spending
   - hiring/firing/temp retirement
   - expensive mistakes
5. `Matched Play Build`
   - budget
   - roster
   - inducements
   - tier-based skill points
   - star players
6. `Exhibition Build`
   - free-form editor
   - warnings mostly disabled

### Block Dice Responsibilities

What block dice should do:

1. Load teams into a tactical session.
2. Record match facts where relevant.
3. For league play, hand the result into post-game processing.
4. For matched play, avoid league progression entirely.
5. For exhibition, stay purely tactical.

What block dice should not own:

1. League treasury administration.
2. Matched-play team construction.
3. General roster management.

## Recommended Implementation Order

### Pass 1: Define Game Context

Add an explicit gameplay context across frontend and backend:

- `LEAGUE`
- `MATCHED_PLAY`
- `EXHIBITION`

Use it to gate:

- validations
- visible controls
- progression behavior
- import behavior

### Pass 2: Untangle Team Creator

Restructure the team creator so that:

1. drafting fields are not presented as league post-game admin controls
2. post-game actions are not always-on general editing buttons
3. matched-play skill points and star players have their own builder flow
4. exhibition disables or softens warnings

### Pass 3: Stop Wrong Workflow Leakage

For league:

1. remove direct always-on `Fire`, `Temp Retire`, and `Mark Dead` from the generic team editor
2. move them behind a league post-game procedure
3. stop using `draftBudget - TV` as the meaning of live treasury

For matched play:

1. disable persistent progression apply
2. disable post-game team mutation
3. keep only match facts if you still want the log

### Pass 4: Build Matched Play Builder

Implement:

1. event budget
2. tier selection / lookup
3. skill-point spending
4. secondary-skill cap enforcement
5. star-player and mega-star cap enforcement
6. inducement purchasing on the roster itself

### Pass 5: Build League Procedures

Implement explicit:

1. league pre-game
2. league post-game

Do not keep faking these through generic editor state.

## What Already Looks Wrong

Based on the current codebase shape, these are the key structural issues to fix:

1. Live league treasury is still draft-budget arithmetic instead of a real league treasury ledger.
2. Post-game actions are exposed as generic always-on roster edits.
3. Match-session progression currently writes too much directly into the saved team for league play.
4. MVP is currently modeled like a live match event, but in league rules it belongs to post-game.
5. Matched play currently has no isolated builder workflow, so it would inherit league-oriented fields unless we split it deliberately.

## Questions

These are the only questions I need answered before turning this into an implementation contract:

1. Do you want `Matched Play` rosters to be persistable as their own saved roster type, or should matched play be a one-off build sheet only?
2. For matched play, do you want tier values to be manually selected per roster for now, or should I infer them from the roster template data once we add tier metadata?
3. Do you want matched-play star players and inducements stored directly on the saved roster, or treated as event-level overlays that can vary by tournament?
4. For league play, do you want the first restructuring pass to be mostly workflow gating and field separation, before implementing full winnings/fans/post-game math?
5. For exhibition, should warnings be fully removed, or just demoted to non-blocking informational notes?
