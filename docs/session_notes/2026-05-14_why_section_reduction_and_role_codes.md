# 2026-05-14 Why Section Reduction And Role Codes

## Summary

This pass trims the `Why?` explanation down to the sections that actually change the block outcome and replaces team-letter naming inside those lines with attacker/defender-relative role codes.

## Why This Changed

- The old `Base`, `Cancelled / Ignored`, and `Final` sections repeated information already shown elsewhere.
- Repeating non-decision text made the explanation feel noisy instead of useful.
- The visible UI already uses `A` and `D` for role markers, so the explanation should follow the same convention rather than switching back to `A1` / `B1` team naming.

## Functional Changes

- Removed the `Base` section from `Why?`
- Removed the `Cancelled / Ignored` section from `Why?`
- Removed the `Final` section from `Why?`
- The explanation now keeps only:
  - `Offensive Assists`
  - `Defensive Assists`
- `Horns` and `Dauntless` notes now appear inside the offensive section when they matter.
- Explanation labels now use attacker/defender-relative codes such as:
  - `A`
  - `D`
  - `A2`
  - `D3`

## Result

- Shorter Why output
- Less duplication with the visible result header
- Easier to inspect whether `Guard`, `Horns`, `Defensive`, or `Dauntless` were actually part of the reasoning
