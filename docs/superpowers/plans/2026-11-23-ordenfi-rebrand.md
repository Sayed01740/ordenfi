# Ordenfi implementation plan

## Goal

Rebrand the existing application to Ordenfi and deliver a coherent, accessible finance interface without changing execution guarantees.

## Direction

Product: stablecoin operations with wallet-confirmed execution.
Character: precise, composed, assured.
World: an operator's ledger, where amounts, routes, and approvals are readable.
Moments: the live swap amount and the transaction review are the visual emphasis.
Signature: a consistent sequence from request through review to wallet confirmation.

Hallmark theme: Console, first of three dealt directions; app scope. Graphite surfaces, amber operator actions, cool system information. Preserve the existing app shell topology and route destinations.

## Files and sequence

- [x] Establish product truth and one token system. Replace `src/app/globals.css`; keep the premium stylesheet path as a compatibility layer. Reduce the root font stack to a reading face and a measured-data face.
- [x] Introduce `src/lib/brand.ts`, Ordenfi SVG identity assets, new metadata and regenerated raster icons/social preview. Keep the existing production URL as fallback until a domain is supplied.
- [x] Rebuild navbar, footer, homepage swap/assistant composition and shared controls. Preserve existing handlers and routes.
- [x] Correct token-selector names, mobile input sizing, connection entry points, disclosure state, focus behavior and touch targets.
- [x] Update public app copy, AI product prompts, documentation and agent metadata. Preserve compatibility identifiers and deployed contract names.
- [x] Verify auth statement compatibility, compile/lint/build and existing tests; inspect desktop and mobile screenshots. Run the design detectors and a fresh reviewer pass.

## Validation

Use existing transaction/auth tests for behavior; add regression coverage where behavior changes. Visual changes are verified through rendered checks rather than implementation-mirroring tests. Inspect keyboard access, wallet connection, AI collapse/restore, network controls, mobile scrolling, accessible names and stale branding.

## Deletions

None. The audit's unreachable components remain until their retirement is explicitly approved. Existing uncommitted work is preserved and adapted in place.
