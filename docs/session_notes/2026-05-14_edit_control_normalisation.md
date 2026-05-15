# 2026-05-14 Edit Control Normalisation

## Summary

This pass normalises the edit-mode setup controls so the draft skills and player status controls use the same interaction style.

## Why This Changed

- `Guard` and `Defensive` were using toggle buttons while `Standing` and `Tackle zone` were still using checkboxes.
- Mixing control types next to each other made the setup surface feel inconsistent.
- `Horns` and `Dauntless` were available on selected placed players but not in the new-player draft, which created an unnecessary mismatch.

## Functional Changes

- Added `DAUNTLESS` and `HORNS` to the `New player skills` draft controls.
- Converted `Standing` and `Tackle zone` from checkboxes to the same toggle-button style used for skills.
- Added disabled styling for toggle buttons so `Tackle zone` still reads correctly when the drafted player is not standing.
