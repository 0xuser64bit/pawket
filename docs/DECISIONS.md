# Architectural decisions

The current decisions below explain the implementation. Superseded designs
and detailed change records remain in Git history. Update this document when
an accepted decision changes; put unresolved choices in `OPEN-QUESTIONS.md`.

## One web product, one Android shell

Next.js App Router owns pages and APIs; React and TypeScript own interactive
leaves; Tailwind and `src/components/pk/` own the design system. A single web
application keeps product rules in one place. Android adds phone capabilities
and Mobile Wallet Adapter through an origin-locked WebView, with no second
game store or transaction engine. See `ARCHITECTURE.md` and `ANDROID.md`.

## Local adoption, optional chain persistence

The player begins with localStorage pets and can keep multiple pets. One
chosen pet is remembered per device. Solana identity comes from the connected
Wallet Standard wallet; there is no embedded wallet or server session.
`useCompanion` presents local and chain pets in one record shape. Existing
storage migrations remain supported so an update does not discard a pet.

## Program accounts own the game

A Pet PDA owns identity, vitals, XP, cooldowns and wearing. Its Passport owns
streaks, counts and recent care. Pure browser math and the program replay the
same `lockstep.txt`; neither side may change alone. Confirmed chain state is
read again before care animation or success is shown. Pets are not transferable.

## Pawket Wallet is required for app transactions

A linked Pawket Wallet is required for app actions. Until 17 October 2026 it
also had to hold SOL even while Pawket sponsored, though the program never
needed a balance for a sponsored device action; 74 wallets kept pets on
Solana and 12 had a Pawket Wallet. The balance is now required only where it
is spent: Market looks, coins, and the device's fees while sponsorship is
unavailable. The sponsor's own per-caller limits and hourly budget bound
what empty wallets can cost it. No owner-wallet
fallback spends from the external balance. Non-money actions use the device's
program-checked instruction twins; money always requires the owner's approval.
Coin spending is bracketed atomically by `fund_wallet_spend` and
`settle_wallet_spend`, preserving preexisting owner SOL and returning change
and proceeds to Pawket Wallet. See `SOLANA.md` and `SECURITY.md`.

## A device key has a narrow lifetime and scope

WebCrypto generates a non-extractable Ed25519 key in IndexedDB. The owner
approves its link, expiry and daily limit; the device co-signs. It cannot
authorize spending. A revoked or expired key stops acting. Unsupported WebViews
must update rather than create exportable keys or fall back to owner signing.

## Sponsorship is bounded and separate from ownership

The devnet sponsor signs first as fee and approved rent payer. The client
checks that the message is unchanged, simulates and sends through `send.ts`.
The sponsor is neither the program upgrade authority nor the treasury. It
has a float floor, per-caller limits and an hourly rent budget read from its
own balance. Sponsorship is conditional,
and mainnet sponsorship is disabled.

## A keepsake is a frozen card

Metaplex Core provides one permanently frozen card pointing to the pet PDA.
It cannot transfer or burn. The program record remains the pet. Address
recovery currently depends on the sponsor secret; secret separation is still
unresolved (Q10).

## Cosmetics are fixed-price entitlements

Three starter pieces are free. The Market sells 25 pet pieces, 12 rooms and
8 photo frames; program prices and the owner's Closet govern purchases and
availability. Item slots are stable. Existing wearing is not stripped by a
catalog change. Stickers derive from records and unlock no purchase benefit.
There is no resale or effect on progression.

## Room things are free, or come with a Market room

The room's things — a picture, a plant, a rug, the pet's bed and something
past it (`src/lib/room/decor.ts`) — arrived while the program was frozen in
review, so none has an item id or a price. Most are free; each of the twelve
Market rooms brings one thing of its own, open once the closet holds that
room. A purchase gained something; nothing that was bought changed. Where
things stand is kept on the device, like the player's look, and a visit shows
the room as it came. Selling a room thing on its own would need item ids and
prices in a program upgrade (`MAINNET.md`).

## Guild membership is independent of coin holdings

Each pet joins one guild through its member PDA. Events and polls are program
accounts; each wallet votes once per poll. Membership needs no database or
token balance. Coin holdings only pin the crest on a holder's pets on the
guild page. Delisting changes Pawket's surfaces, never chain membership.

## Meteora stays on the server

Only `src/server/coins/` and operational scripts import Meteora SDKs and
web3.js v1. The rest of the app uses Solana Kit. Two constrained devnet presets
use SOL, immutable supply and permanently locked DAMM v2 liquidity. Chain reads
decide the stage and verify the derived pool. The server checks the coin's
creator matches the founder and requires the founding pet's membership for
launch; founder powers in the program still need a decision (Q9).

## Aggregate counts of the core loop

Nothing measured whether browser players come back, so Pawket counts its own
loop with Vercel Web Analytics custom events (`src/lib/analytics/events.ts`):
adoptions, cares, rounds, a daily Home open bucketed by the oldest pet's age
and the time since any care, the Keep on Solana steps, device links and their
failure class, each send's kind and outcome, reminders and pet copies. Every
property is a fixed word; no event carries a name, address, signature, score
or free text, and counted page addresses lose their query and any Solana
address. A Settings choice turns counting off, page views included, and a
browser sending Global Privacy Control or Do Not Track is never counted.
`/privacy` lists what is counted.

The counts are proxies, not cohorts. Day-one returns are `home_opened` with
`petAge=1` over the previous day's `pet_adopted`; week-one returns use
`petAge=7-13` against adoptions a week earlier. Several pets or devices blur
them; nothing identifies a player to make them exact. Chain pets also have
their own record in Pulse. Custom events record only on Vercel plans that
include them; without one, the calls are inert.

## Chain reads precede infrastructure

The app reads program and token accounts directly, with bounded shared caches
for large scans. There is no database or indexer. Add either when a measured
limit or approved feature justifies its ownership, recovery and privacy costs.
Pulse and discovery display chain-derived counts, never seeded UI totals.

## Daily play does not reward purchasing or score inflation

Catch, Hop, Copy and Pairs use pure seeded steps. Each game has a shared daily
UTC seed. The first recorded round per pet per UTC day earns a flat XP bonus;
score never scales it. There is no real-time multiplayer or money prize.

## Care reminders stay on the phone

The Android app's care reminder is a local notification, not a push service:
the page works out from the pets' records when the first need begins and the
phone keeps one inexact alarm for it. No server holds a list of who wants
reminding, a device token or a schedule. It is off until the player turns it
on, and it reaches only phones with the app; the web keeps calendar reminders.

## Stable origin and release signer

`pawket.world` is the official origin. The previous Vercel origin remains
available for older APKs and metadata. Local records and device keys do not
move across origins; the same wallet recovers chain pets and approves a new
device link. Android updates keep the package and signer.
