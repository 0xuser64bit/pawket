# Mobile hardening — 6 October 2026

This pass addresses the owner's phone feedback in the shared web product.
The Android shell, APK version, program, device permissions and game math
are unchanged. An installed shell receives these fixes through the hosted
web deployment; it needs no new APK.

## Changes

- Android pet actions use a freshly read Pawket Wallet device link. Missing
  or expired links, daily limits, unavailable sponsorship and insufficient
  device fee funds explain how to recover rather than opening an owner-wallet
  prompt. Spending SOL still requires the owner's approval, as the program
  requires. The shell offers a link to setup after connection.
- One transaction may run per tab, including preparation. Network preparation
  is bounded, unanswered signing ends after 90 seconds, and a late signature
  is never broadcast. An adapter association timeout is reported as a failure
  rather than silently treated as a player declining. A blocked action does
  not wait for another unnecessary wallet refresh. The progress message says
  preparation until the signer is actually called, including sponsor and
  server-built transactions.
- A device key is kept only after its IndexedDB transaction commits. Aborted
  persistence cannot leave the player with a linked key the app failed to keep.
  Wallet connection returns to the action that opened it.
- The theme control is an accessible 44px icon. Shared sheets animate both
  arrival and dismissal, trap keyboard focus, return it on close, and keep
  controls reachable on short screens. Photos now reuse that sheet. Touch
  fields retain a 16px minimum, and helper/error descriptions have unique IDs.
- Rounds can pause and resume; hiding the page pauses them. Catch captures
  finger drags and releases held keys on blur. Copy locks input between
  patterns. Copy and Pairs preserve pending completion across pauses and
  callback changes. Landscape layouts keep the playing areas above the dock.

## Verification

- `pnpm verify`: typecheck, lint, 346 unit tests and production build pass;
  14 opt-in devnet unit tests are skipped by this command.
- `PLAYWRIGHT_PORT=3100 pnpm e2e e2e/layout.spec.ts e2e/smoke.spec.ts e2e/mobile.spec.ts e2e/room.spec.ts --workers=2`:
  45 checks pass. The strengthened landscape dock-clearance checks also pass.
  Layout coverage visits all 19 route states listed in `e2e/layout.spec.ts`
  at 320, 375 and 768px, including empty and missing-data screens.
- Final visual inspection covers portrait photo sheets, all four games in
  landscape, desktop Home and Market; the earlier portrait audit covers
  adoption, Home, Park, Playground, Profile's tabs, Wallet, Market, Pulse,
  guild discovery/detail/coin and a missing public Passport.
- `PLAYWRIGHT_PORT=3100 PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts --workers=1`:
  three real devnet flows pass: adoption/care/Passport/keepsake, guild founding
  and joining, and Pawket Wallet deposit/link/device care/history/unlink/close.
  The wallet flow also passes after the preparation/signing refinement; it
  waits for the care's own receipt and checks the owner's signature count.
  This uses the test wallet, not a consumer wallet or physical Android phone.
- Android `./gradlew testDebugUnitTest` passes with JDK 21 and the configured
  Android SDK. Native source is unchanged.
- Routing tests explicitly cover link expiry, daily limits, missing device
  fee funds, hydration and concurrent actions. Signing tests check that a
  timed-out operation's eventual signature cannot send a transaction.

## Still requiring phone evidence

The reported Phantom/Solflare screen stall has not been reproduced on a
physical phone. This pass fixes competing sessions, silent association-timeout
handling and unbounded waits on Pawket's side; it does not establish a defect
inside either wallet app. Follow `ANDROID-PHONE-CHECK.md` with the installed
release and record the phone, WebView and wallet versions, device link/care
result and return/cancel behaviour. The physical verification checkpoint in
`ANDROID-HANDOFF.md` remains open.
