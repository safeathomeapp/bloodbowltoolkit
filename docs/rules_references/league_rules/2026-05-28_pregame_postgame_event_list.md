# Pre-Game And Post-Game Event List

This file is a working interpretation of the league rules pages read in this session.

It is not a replacement for the source pages.

Use this as a quick planning reference:

- for implementation sequencing
- for UI flow planning
- for backend contract design

If any future code depends on a disputed step, re-check:

- [2026-05-28_league_rules_transcription.md](./2026-05-28_league_rules_transcription.md)
- the original screenshot sources in `docs/rules_references/league_rules/`

## Pre-Game Events

What I think the practical pre-game event list is:

1. Confirm the fixture and participating teams.
2. Determine each team's available players for this match.
   - Exclude dead players.
   - Exclude players missing this game.
3. Add Journeymen if a team cannot field 11 players.
   - Use eligible Lineman-type roster rules from the source pages.
   - Journeymen are temporary for this game.
   - They count towards Current Team Value for this game.
4. Calculate each team's Current Team Value for the fixture.
   - Include Journeymen.
   - Exclude any players that do not count toward current availability/CTV.
5. Resolve inducement spending.
   - Higher-CTV team may spend Treasury first.
   - Lower-CTV team then gets Petty Cash based on the CTV gap plus the opponent's Treasury spend.
   - Lower-CTV team may top up within the stated Treasury limit.
6. Record the purchased inducements on the game record.
7. Start the match with the final active match roster.

## In-Game Events Worth Tracking For Post-Game

What I think must be captured during the match so post-game works cleanly:

1. Match result: win, loss, or draw.
2. Touchdowns scored by each team.
3. Casualties caused that count for SPP.
4. Whether any player was deemed to be stalling.
5. SPP-generating actions by player.
   - completions
   - throw team-mate related SPP where applicable
   - interceptions
   - casualties
   - touchdowns
   - MVP assignment
6. Casualty outcomes that matter after the match.
   - especially dead players
   - lasting injuries
   - miss-next-game state
   - niggling injuries or other persistent effects already modeled by the app
7. Which Journeymen actually played for the team.
   - needed because post-game allows hiring those Journeymen

## Post-Game Events

What I think the practical post-game event list is:

1. Record the match outcome.
   - win/loss/draw
   - touchdowns for each team
   - SPP-counting casualties for each team
   - league points earned
2. Calculate and add winnings to Treasury.
   - derive fan attendance
   - divide by two
   - add touchdowns scored
   - add the no-stalling bonus if applicable
   - multiply by `10,000`
3. Update Dedicated Fans.
   - win: possible increase
   - loss: possible decrease
   - draw: unchanged
4. Assign all Star Player Points.
   - completions
   - throw team-mate related awards if applicable
   - interceptions
   - casualties
   - touchdowns
   - MVP
5. Spend SPP on player advancement if desired or required.
   - skills
   - characteristics
   - resulting value increases
6. Run the `Hiring, Firing and Temporarily Retiring` step in order.
   1. Remove dead players from the team draft list.
   2. Hire new players using Treasury.
   3. Fire players if doing so does not drop eligible-for-next-game players below 11.
   4. Hire or fire sideline staff.
   5. Buy additional team re-rolls at double normal cost.
   6. Hire any Journeymen who played in the game if desired.
7. Apply temporary retirement where the rules allow it.
   - My current reading is that this is specifically for players who suffered a Lasting Injury result on the Casualty Table.
   - They remain on the team list.
   - They count toward the max 16 players.
   - They do not count toward Current Team Value.
   - They take no further part in the current season.
8. Resolve Expensive Mistakes if the Treasury is high enough at that step.
9. Prepare for the next fixture.
   - update Team Value
   - update Current Team Value
   - ensure the next-game availability state is correct
   - ensure newly hired players, staff, rerolls, and value increases are reflected

## App Interpretation Notes

What I think this means for the current product shape:

1. Pre-game and post-game should be explicit flows, not just loose edits on the team screen.
2. The app should distinguish clearly between:
   - permanent team state
   - next-match availability
   - match-only temporary state such as Journeymen
3. Journeymen probably need two separate concepts in the product:
   - pre-game temporary match fill-ins
   - post-game optional conversion into permanent hired players
4. Temporary retirement should remain distinct from:
   - dead
   - sold/fired
   - miss next game
5. The current match-room event log should remain the source for post-game factual inputs, while the team-management surface should own the roster mutation step.

## Still Worth Re-Checking Before Implementation

Even with the source pages, these are the areas I would still verify carefully against rule text during implementation:

1. Exact interaction between lasting injuries already modeled in the app and the rulebook's temporary retirement wording.
2. Whether temporary retirement should be represented only as a roster status or also preserve the underlying characteristic reduction details for off-season recovery.
3. Whether the app should force SPP spending immediately when a player reaches a threshold, or merely support it while allowing unspent SPP to persist.
4. Whether all current injury states already stored in the backend map cleanly onto the rulebook sequence without adding a more explicit post-game injury record.
