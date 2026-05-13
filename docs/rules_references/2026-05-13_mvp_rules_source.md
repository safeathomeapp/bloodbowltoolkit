# MVP Rules Source Notes

Date reviewed: 2026-05-13

## Source Material

- Screenshot of rulebook pages 64-66 for blocking, assists, and cancellations
- Screenshot of rulebook page 131 for `Dauntless` and `Defensive`
- Screenshot of rulebook page 133 for `Guard`

## Authoritative Rules Captured For MVP

### Block Strength Comparison

- Compare attacker and target Strength after modifiers.
- Equal Strength: one die.
- One side stronger: two dice, stronger side chooses.
- More than double Strength: three dice, stronger side chooses.

### Offensive Assist

- An active-team player can assist the blocker if adjacent to the target.
- The assisting player must be Marking the target.
- The assisting player must not be Marked by another opposition player.
- A valid assist adds `+1` to the blocker's Strength for the block.

### Defensive Assist

- An inactive-team player can assist the target if adjacent to the blocker.
- The assisting player must be Marking the blocker.
- The assisting player must not be Marked by another opposition player.
- A valid assist adds `+1` to the target's Strength for the block.

### Guard

- `Guard` allows a player to provide offensive and defensive assists regardless of how many opposition players are Marking that player.

### Defensive

- During the opponent's turn, opposition players Marked by this player cannot use `Guard` or `Put the Boot In`.
- For MVP block calculation, `Defensive` matters as a Guard-suppression rule during opponent turns.

### Prone / No Tackle Zone

- A player that is not standing loses its Tackle Zone while Prone or Stunned.
- MVP modeling will keep `isStanding` and `hasTackleZone` separate because the brief requires both prone state and no-tackle-zone state to be representable.

## MVP Interpretation Decisions

- `Dauntless` is not included in MVP unless explicitly requested later.
- `Defensive` will not create assists; it only suppresses `Guard` for marked opponents.
- Explanation output must reflect when a potential Guard assist is invalid because of `Defensive`.
