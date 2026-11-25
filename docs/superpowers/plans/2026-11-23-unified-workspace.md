# Unified Ordenfi workspace

## Goal and approach

Merge the former Swap and Dashboard screens into one operating workspace. The user's confirmed layout is actions on the left and the assistant on the right; retain the dark-and-green owner-supplied brand.

Use one client component shared by `/` and the backward-compatible `/dashboard` route. Keep query parameters, old QR payment links, `#tools` and `#guide` behavior. A separate dashboard navigation item is redundant and will be removed. Mobile stacks the action tools first and the assistant second, without hiding either feature set behind another page.

## Files and tasks

- [x] Add browser regression checks for the combined page, left/right placement, default Swap tab, action tabs, history, one navigation entry and legacy payment links. Observe failure against the previous implementation.
- [x] Extract the current dashboard's state and transaction handlers into `src/components/workspace/operations-workspace.tsx`; reuse the existing actions, activity details, network controls, balance, guide, recovery and progress components.
- [x] Add a reusable assistant panel preserving draft text and focus on hide/restore. Use one assistant instance.
- [x] Route both page entry points to that workspace; consolidate navigation and update generated QR links to the root route.
- [x] Reuse the existing SwapCard inside the shared actions area so both the original testnet swap and mainnet production flow survive. Keep Send, Bridge and all More tools.
- [x] Verify payment query handling, AI swap handoff, action tabs, mobile order, keyboard controls, typecheck, lint, test suite, production build and captured desktop/mobile views.

## Constraints

No transaction execution changes, no deployed-resource renames and no publishing. Keep existing contract, saved-data and authentication identifiers. Existing uncommitted work is adapted in place.
