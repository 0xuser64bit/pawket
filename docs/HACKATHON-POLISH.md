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

Root cause of "Solflare opens, shows nothing to sign, and freezes": 0.6.0
re-authorizes every request with the token Pawket saved. When the wallet
no longer honoured it, the adapter disconnected and then waited forever
(`await new Promise(() => {})`) without closing the session, so the wallet
sat on "awaiting requests" and Pawket on its spinner until both were
killed; the retry worked only because the failure had cleared the token.

The pinned MWA 0.6.0 patch now asks the wallet to authorize again in the
same session when it refuses its own token (a different account is
refused), closes the session on every exit, and gives a wallet app a
minute to open and 85 seconds to answer. The protocol 2.3.0 patch rejects
a waiting request as soon as the wallet closes the session (3.0.0's fix).
Authorization finishes before capability discovery, and cache writes are
awaited. Pawket's signing deadline (150s) outlasts both limits, so a retry
never overlaps a live session. Linking refuses stale wallet-read errors.

Checked on the Android 16 emulator in the debug shell with the official
test wallet: decline then retry; a cleared wallet (stale token) prompts a
fresh authorization in the same session; backing out of the signing screen
returns an error at once instead of hanging. `mobile-session.test.ts`
covers the same paths. Solflare and Phantom on a physical phone remain the
final check.

## Home and navigation

Home's header is whose room it is on the left and, on the right, where the
pet lives ("On Solana") or — for a pet in this browser — the labelled
"Keep on Solana" button; "In this browser" is said in the caption. The
family takes its own full-width row under the header and scrolls when it
outgrows it. The 2D/3D choice is a two-segment switch in the room's top
corner (the wall, clear of the pet), always readable, the view in use
raised; it replaces the cut-off "Flat room" button that sat below the deck.
The room's sentence moved under the deck so a care button never moves under
a finger. The wallet sheet links to Pawket Wallet; Home no longer repeats
that line. Profile is the rightmost dock destination. The phone regression
includes twelve pets at 320px, the corner switch's targets and dock order.

## Sharing

Adoption, Passport, guild and playground links open the same preview sheet.
The sheet offers native sharing, explicit copying and a selectable link if
clipboard access is refused. Cancelling native sharing stays quiet.
