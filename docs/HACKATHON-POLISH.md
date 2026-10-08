# Hackathon product pass — 8 October 2026

Owner request: fix repeated mobile wallet linking; give Home's growing pet
list room; put the room-view switch somewhere readable; keep Profile at the
right of the dock; move Pawket Wallet into the wallet sheet; share links in
a sheet; reduce the starter wardrobe and themes and expand the Market.

Constraints: no program or APK version bump. The owner explicitly approved
program changes and devnet redeployment on 8 October. No automatic
owner-wallet fallback, no pretend sales or
balances, one coherent purpose per commit. Browser-only adoption and care
remain free. Purchases never affect care or progression.

Commit sequence and owning files:

1. Mobile sessions: the pinned MWA package patch, session regression checks,
   `browser-client.ts`, `wallet-sheet.tsx` and wallet-link recovery as needed.
2. Wallet routing: `use-send.ts`, its tests, wallet history and wallet UI.
   Require a fresh linked, funded Pawket Wallet for pet actions everywhere.
3. Home and navigation: `home-screen.tsx`, `pet-switcher.tsx`, `dock.tsx`,
   `wallet-chip.tsx`, shared CSS and mobile layout checks.
4. Sharing: reuse the existing `Sheet` and photo dialog conventions in
   adoption, Passport, guild and playground share actions.
5. Market and wardrobe: `catalog.ts`, `themes.ts`, Market/Profile/theme UI,
   their contract tests and matching docs. The deployed program currently
   sells only pieces 19–22 and rooms 64–65, and only the owner approves money.
   Extra paid entitlements need a program change; never fake client-only sales.
6. Full verification: `pnpm verify`, focused browser/mobile checks, and real
   devnet checks where available. Physical Solflare evidence remains distinct
   from automated transport tests.

Verification and remaining limits are recorded below as each commit lands.

## Mobile sessions

The pinned MWA 0.6.0 patch closes sessions on success, refusal and timeout;
the association deadline covers the handshake and the request has its own
85-second deadline. Authorization finishes before capability discovery, and
cache writes are awaited. A failed reauthorization now rejects instead of
waiting forever after disconnect. Linking refuses stale wallet-read errors.
Transport tests exercise a refusal followed by a successful retry and an
unanswered authorization; they do not mock transaction signatures or prove
behaviour on a physical Solflare installation.
