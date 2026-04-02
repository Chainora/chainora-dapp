# Verification Checklist

## Pre-Edit
- Identify behavior-sensitive paths (routing, wallet connect, query flows).
- Confirm non-negotiable constraints from prompt.

## Post-Edit
- Run targeted diagnostics for touched files.
- Run `yarn -s tsc --noEmit`.
- Run `yarn build` when changes affect runtime wiring.

## For Route/UI Changes
- Verify route navigation and fallback behavior.
- Verify loading/error/empty states.
- Verify no layout regressions on common breakpoints.

## For Web3/Query Changes
- Verify provider setup order remains valid.
- Verify query cache keys still align with data consumers.
- Verify expected network/chain config is used.
