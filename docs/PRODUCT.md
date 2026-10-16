# Product

<!-- impeccable:product-schema 1 -->

## Platform

Web, with an Android shell around the hosted app. The browser and Android app
share pages, game rules, server APIs and transaction handling.

## Users

Players who want a companion they can return to throughout the day. They can
start without a wallet, account or token. A player who chooses Solana can
use the same wallet on another device to find their pets and public Passports.

## Product Purpose

A player adopts a pet, cares for it and builds a visible history together.
Care creates progression and stickers; customization creates recognition.
The public Passport makes confirmed care history available to others.

A successful core session lets a player adopt, understand the pet's current
needs, complete a care, see its result, customize the room or look, and play
a round. The complete local loop remains available without Solana.

## Positioning

A living companion with a persistent record of care. Pets and their people
lead the experience; guilds support community; coins remain optional.

## Operating Context

The default cluster is devnet. Public configuration is validated in
`src/config/env.ts`; server secrets are read through `getServerEnv()`.
Deployment and environment procedures live in `DEVELOPMENT.md` and
`ENVIRONMENT.md`.

A pet starts in browser storage, or in the Android app's WebView storage.
Keeping it on Solana creates a new program record with the chosen name,
species and personality; browser progression is not imported. The confirmation
flow explains the reset. Solana care changes the screen after confirmation
and a fresh read. A keepsake is a frozen card pointing to the pet's account.

App transactions require a linked, funded Pawket Wallet. Its non-extractable
device key signs non-money actions within the owner's expiry and daily limit.
The owner approves setup, deposits, withdrawals, purchases and coin spending.
Pawket sponsors eligible devnet fees and rent while sponsorship is available;
unsponsored device actions use the wallet's fee float, and rent-bearing actions
wait. Solana Actions have their own owner-approved flow (`SOLANA.md`).

## Capabilities and Constraints

| Area | Supported behavior |
| --- | --- |
| Adoption | Multiple local pets; one chosen pet at home |
| Home | Feed, play, groom, rest; decay estimates, cooldowns, XP, mood, UTC streak and care log; 3D room with flat fallback; emotes, photos and calendar reminders |
| Profile | Player name, look and outfits; pets, wardrobe, record-derived stickers and settings |
| Playground | Catch, Hop, Copy, Pairs; shared daily seeds; one flat daily XP bonus per pet; explicit recording for Solana rounds |
| Public record | Server-read Passport and visit room, guestbook waves, Park discovery and Pulse counts |
| Market | Three free pet pieces; 25 bought pieces, 12 bought rooms and 8 photo frames; fixed program prices and chain-read closet entitlements |
| Guilds | One guild per pet; founding, joining, leaving, events, RSVPs, check-ins and one ballot per wallet per poll |
| Coins | One optional coin per eligible guild; two devnet Meteora presets; quotes, trades, graduation and fee claims on its own page; permanently locked graduated liquidity |
| Android | Wallet app integration, gallery and native sharing, calendar editor, haptics, back behavior, shortcuts and App Links |

Cosmetics and coin balances never change vitals, XP, cooldowns or scores.
Photos can be posed (Wave, Cheer, Cuddle, Dance), both of you facing the
camera, using the room's existing animations. Home has
optional, quiet synthesised chimes and action sounds, sharing the existing
device sound preference with Playground and Settings. Sound defaults off,
requires a gesture after reload, and pauses when the page is hidden or Home
is left. Neither poses nor sound change a saved pet record.
Coin holdings only add the guild's crest pin on that guild's page.
A local pet is labelled "in this browser" or "in this app"; "on Solana"
requires a chain-read record. Guestbooks retain eight recent waves; their
once-per-day check is limited to that retained history (`SECURITY.md`).

There is no pet resale, cosmetic resale, transferable keepsake, guild treasury,
real-time multiplayer, server account system, database, indexer, push
notification service or fiat checkout. These are not promised capabilities.
Mainnet is gated by `MAINNET.md` and unresolved decisions in `OPEN-QUESTIONS.md`.

## Brand Commitments

Pawket's tagline is "A living companion". The mark, typography, colors,
interaction rules and accessibility requirements live in `DESIGN.md`.
Use clear storage and fee language, show verified records and prices, and
never fabricate activity, player counts, traction or asset value.

## Evidence on Hand

The repository includes the Anchor program and IDL, browser game math in
lockstep with it, chain readers and transaction builders, and unit, LiteSVM
and browser suites. `TESTING.md` describes what each proves. Physical Android
consumer-wallet and current-WebView device checks remain a separate release
gate; emulator results cannot establish them.

## Product Principles

1. Care creates identity through accumulated history.
2. Expression never buys progression or competitive advantage.
3. Progress is visible after it is saved or confirmed.
4. Local play stands on its own; Solana adds persistence and public records.
5. Every financial action shows its terms before explicit approval.
