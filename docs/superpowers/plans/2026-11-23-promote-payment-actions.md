# Promote payment actions

Approved direction: promote Receive and Batch Payments, preserving the dark/lime workspace and right-hand assistant. Recovery belongs inside Bridge when a failed transaction exists. Onramp and Unified Balance remain under More; risk analysis is explicitly a local estimate and paid access is unavailable.

1. Add payment helpers and regression tests for positive USDC amounts, recipient validation, network-bound links, and sequential batches that stop on pending/error without replaying successful transfers.
2. Replace remote QR generation with a local renderer. Receive generates requests for the entered recipient on the selected Arc network; opening a request must honor its encoded network and reject malformed requests.
3. Promote the existing cards into the sidebar. Batch Payments uses the current Arc network, pins the sender, records partial results, locks submitted batches to prevent duplicate sends, and requires an explicit new batch after review.
4. Remove the paid risk execution path while the server is disabled; describe free results as heuristic estimates. Keep recovery contextual within Bridge.
5. Run regression tests, typecheck, targeted lint, production build and browser checks at desktop/mobile sizes with no wallet signing or transfers.
