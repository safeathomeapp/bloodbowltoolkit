# 2026-05-14 Attacker/Defender Normalisation And Horns Order

## Summary

This pass normalised the active block roles to `Attacker` and `Defender` across the visible UI and aligned the temporary `Horns` / `Dauntless` rules handling with the provided Blood Bowl wording.

## Why This Direction Changed

- `Target` was starting to create ambiguity once blitz previews and candidate squares were introduced.
- `Attacker` and `Defender` are clearer and map better to the actual block resolution flow.
- The temporary `Dauntless` logic previously matched defender Strength too early.
- The provided rules reference clarified that `Horns` must be applied first during a blitz, and only then should `Dauntless` be checked.

## Functional Changes

- Token role markers now use:
  - `A` for attacker
  - `*A` for blitzing attacker
  - `D` for defender
- User-facing calculate-mode guidance now refers to attackers and defenders instead of blockers and targets.
- Board summary labels now use `Attacker` and `Defender`.
- Attacker card Strength now reflects:
  - printed Strength by default
  - `+1 ST` from `Horns` first during blitz mode
  - temporary `Dauntless` only if the defender is still stronger after Horns
- Temporary `Dauntless` no longer lowers Strength and no longer triggers if Horns already reaches the defender Strength.

## Rules Note

This still uses the temporary deterministic `Dauntless` model already agreed for the MVP:

- no `D6` roll yet
- if attacker Strength after Horns is still lower than defender Strength, attacker rises to match defender Strength

This keeps the implementation simple while preserving the correct Horns-before-Dauntless ordering.
