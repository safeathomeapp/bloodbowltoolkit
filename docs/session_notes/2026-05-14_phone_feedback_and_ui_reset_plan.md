# Session Note: Phone Feedback And UI Reset Plan

## Source Of Feedback

- Real-phone test run on the current `feature/blitz-why-panel` branch
- Feedback captured directly from the project owner during guided testing

## Feedback Recorded

- The current UI is broadly too rough and visually weak, not just the candidate-square labels.
- Candidate squares should rely more on clean outline states and less on extra badge noise.
- The current forced distinction between one `BEST` square and multiple `ALT` squares is incorrect when the math is identical.
- The product should not nominate one square as better unless there is an actual mathematical reason in the rules output.
- In the tested case, all equivalent attack squares should have been shown as equally valid rather than splitting one green square from multiple blue squares.

## Product Conclusions

- The current candidate-square ranking presentation is overstating certainty.
- The board must distinguish between:
  - mathematically better squares
  - mathematically tied squares
  - unreachable squares
  - occupied squares
- If several candidate squares produce the same block result and the same relevant reasoning, they should share the same visual treatment.
- The current candidate labels added for readability solved one problem but also introduced avoidable visual clutter.

## Required Correction Plan

1. Refactor blitz candidate evaluation so it returns equivalence groups rather than a single preferred square.
2. Change the UI to highlight all top-tier tied squares the same way.
3. Remove `BEST` and `ALT` wording when there is no true distinction.
4. Simplify candidate visuals toward cleaner outline-based states with less in-cell labeling.
5. Re-test on a phone after the tie-aware update before making broader visual decisions.
6. After candidate semantics are correct, perform a wider UI cleanup pass for the whole calculator surface.

## Implementation Shape

### Rules Layer

- Replace single-candidate “best” assumptions with score-group logic.
- Preserve explicit invalidated and occupied states.
- Keep square-specific `Why?` behavior because that interaction still aligns with the revised UX direction.

### UI Layer

- Remove misleading single-square promotion when the top result is tied.
- Use one shared visual state for all equally optimal candidate squares.
- Reduce badge density and rely on stronger borders, spacing, and hierarchy.
- Keep the current explicit `Mark unreachable` action unless later testing shows a better control.

## Files Expected In The Next Pass

- `src/tools/block-dice/rules/calculatePotentialBlockCandidates.ts`
- `src/tools/block-dice/rules/calculateBestPotentialBlock.ts`
- `src/tools/block-dice/rules/calculateTargetPreviews.ts`
- `src/tools/block-dice/types/blockDice.ts`
- `src/tools/block-dice/components/BlockDiceCalculator.tsx`
- `src/tools/block-dice/components/BlockDiceCalculator.module.css`

## Next Recommended Step

- Implement tie-aware candidate ranking first.
- Immediately follow that with the smaller UI simplification needed to remove fake “best vs alt” language.

## Git Branch Used

- `feature/blitz-why-panel`

## Commit Hashes

- Pending verification and commit
