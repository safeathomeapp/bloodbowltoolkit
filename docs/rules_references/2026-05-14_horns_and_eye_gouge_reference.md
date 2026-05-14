# Rules Reference: Horns And Eye Gouge

## Source

- User-provided screenshot reference on `2026-05-14`

## Horns

### Excerpt Meaning

- `Horns (Active)` applies `+1` to the player's Strength Characteristic whenever that player declares a Blitz Action, for any Block Actions performed during that Blitz Action.

### Impact On Current Implementation

- This supports the current temporary implementation direction.
- The calculator currently treats `Horns` as a `+1 ST` modifier only when the block is part of a blitz.
- That is aligned closely enough with the provided wording for the current phase of work.

## Eye Gouge

### Excerpt Meaning

- `Eye Gouge (Active)` prevents an opposing player from providing Offensive or Defensive Assists after they have been Pushed Back by this player, until after they are next activated.

### Impact On Current Implementation

- This does not change the current pre-block dice calculation flow yet.
- The current calculator determines block dice before any push-back result has happened.
- `Eye Gouge` becomes relevant only if the toolkit later models post-block state changes or chained follow-up calculations after a push-back.

## Decision

- Keep `Horns` active in the current temporary implementation track.
- Keep `Eye Gouge` deferred and out of the current assist engine until post-block state is modeled.
