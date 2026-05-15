# 2026-05-14 Result Header Cleanup

## Summary

This pass simplifies the result section header and moves the `Why?` control into the header row.

## Why This Changed

- `Block Result` was redundant and slightly misleading because the tool is calculating dice to be rolled, not resolving the block itself.
- The `Why?` control belongs at the top of the result section rather than buried lower in the result content.

## Functional Change

- Removed the `Block Result` heading line
- Kept only the `Result` header
- Moved `Why?` / `Hide Why` into the top-right of the result header row
