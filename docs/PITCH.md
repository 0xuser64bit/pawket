# Pawket — pitch, demo and bounty notes

For the Colosseum Crypto World's Fair submission (due 2026-10-12, 11:59pm PT)
and Meteora's "Best use of DBC" track. Every figure here can be checked on
`/pulse` or on Explorer; on devnet the counts include Pawket's own tests.

## One line

**Pawket is a living pet that starts in your browser and, when you choose,
keeps every care as a signed record on Solana — a Passport nobody can edit,
and the identity your pet carries into guilds, games and a market of looks.**

## The problem

- Virtual pets are one of the oldest loops in games, and every one of them
  forgets you: progress lives on someone's server, and it is gone when the
  game is.
- "On-chain games" ask for a wallet, a token and gas before anyone has had
  fun, and most of them sell power.

## What Pawket does

1. **Play first.** Adopt in three taps, no wallet, no sign-up. Feed, play,
   brush, rest — needs fall while you are away, and the pet's face says
   what it wants. A 3D room, four mini-games with a daily round everyone
   shares, a wardrobe, eight free rooms.
2. **Keep it when it matters.** One signature moves the pet onto Solana:
   from then on every care is a transaction, decay and cooldowns are
   enforced by the program with the same integer math as the browser
   (replayed against both), and the **Passport** — streak, counts, the last
   eight cares, stickers, guestbook — is public. Pawket pays the fees; a
   wallet with no SOL can play.
3. **No popups.** A Pawket Wallet links this device with one approval: a
   non-extractable WebCrypto key the program lets care for your pets, inside
   a daily limit and an end date, and nothing else. It can never move money.
4. **Meet others.** The Park shows every pet on chain. Guilds are on chain:
   found or join one, plan events your pets RSVP to and check in at, ask
   polls each wallet answers once. Anyone can wave at a pet into its
   guestbook — from the page, or from its Blink on X.
5. **Make it yours.** The Market sells looks — never power — at prices fixed
   in the program; a purchase goes straight to Pawket's treasury and into
   your closet on Solana. A pet on Solana can have a keepsake: a frozen
   Metaplex Core card in your wallet that points at it.
6. **Guild coins, with guardrails.** A guild of three pets may launch one
   optional coin on **Meteora's Dynamic Bonding Curve**, from Pawket's
   presets only, that graduates into a **DAMM v2** pool with all of its
   liquidity locked for good. Holders' pets wear the guild's crest pin; a
   coin never touches a vital, XP, a score or who may join.

## Why Solana, and what it composes with

| Primitive | How Pawket uses it |
| --- | --- |
| Anchor program (`PawkHv…eM74`) | pets, Passports, guilds, gatherings, guestbooks, the Market, the Pawket Wallet — 25 instructions, 11 account types |
| Fee payer + partial signing | the sponsor signs first as fee payer for Pawket instructions only (`checkSponsorable`), the player signs as owner |
| Solana Actions / Blinks | adopt, care, wave and join a guild from a shared link |
| Metaplex Core | a frozen keepsake card per pet, found without an indexer |
| Meteora DBC + DAMM v2 | guild coins: two presets, launch, partial-fill trades, graduation, fee splits |
| WebCrypto Ed25519 | a non-extractable device key the program scopes to care |
| Kit v8 | every client call; Meteora's SDKs stay server-side |

## Business model (honest, and already on chain)

1. **The Market** — looks for SOL at fixed prices, paid straight into the
   treasury (`/pulse` shows what has been paid in).
2. **Guild coins** — Pawket is Meteora's partner on its presets: 40% of the
   1% trading fee (Meteora keeps 20%, the guild's founder gets 40%), a 0.01
   SOL launch fee, and half of each graduated pool's locked LP fees.
3. **What it pays for** — the treasury is how the sponsor gets paid for at
   scale, so playing stays free for players who never pay (on devnet the
   sponsor is topped up by hand). Rent per pet is about 0.004 SOL
   (`docs/MAINNET.md` has every account's cost).

No pay-to-win, no selling pets, no token required to play: money buys looks
and nothing else, and the rules are in the program.

## Traction (devnet, read live)

Point judges at `/pulse`: pets kept on Solana, the wallets keeping them,
cares recorded, guilds and their gatherings, coins launched and graduated,
Market sales and the treasury. Say plainly that devnet includes test runs.

## Roadmap

- **Now (v0, devnet):** everything above, free, with Pawket paying fees.
- **v1 (mainnet):** after an external review of the program, a multisig
  upgrade authority and treasury, and legal review of coin copy
  (`docs/MAINNET.md`). Then: marketing, friends and visits, seasons.

## Demo script (3 minutes)

1. **0:00 — Adopt.** Landing → "Adopt a pet": a moss pup, "Brave", named.
   No wallet. Home: the 3D room, feed and play; the pet reacts.
2. **0:30 — Keep it on Solana.** Connect a wallet with **0 SOL**; "Record
   Biscuit"; one approval; the receipt shows the signature and "Paid by
   Pawket". Feed again: a signed care, the Explorer link.
3. **1:00 — No popups.** Open the Pawket Wallet, link this device (one
   approval). Care again: no wallet prompt, the receipt says "Signed by this
   device".
4. **1:20 — The Passport.** Open "Their record": stickers, the last cares,
   the guestbook. From a second wallet, wave. Share the link: in a
   Blink-aware wallet it is the pet's card — four cares for the owner, a
   wave or an adoption for everyone else.
5. **1:50 — Guilds.** Sunbeam Club: the pets, the event (RSVP, check in),
   the poll (vote once). Open its coin: the terms on Paper, what can go
   wrong, a quote, a buy. Then Cloud Nine's coin: graduated into DAMM v2,
   its pool verified.
6. **2:30 — The Market.** Buy the halo (devnet SOL); wear it from the
   wardrobe. The sale lands in the treasury.
7. **2:45 — Pulse.** Everything above, counted from the program, live.

## Meteora bounty write-up ("Best use of DBC")

**A new use case: community coins that cannot be bent into a pump.** Guild
coins are optional coins for communities of pet owners. DBC is central: it
is the only way a coin exists in Pawket, and Pawket is the partner on every
config.

- **Constrained presets, never free-form curves** (`src/lib/coins/presets.ts`,
  made by `scripts/coin-presets.mts`): a *gentle* curve whose price rises
  only 3× to graduation — arriving early buys little, so it suits members
  over traders — and a *lively* 10× curve. Each is validated against
  Meteora's own `validateConfigParameters` in tests.
- **No allocations, fixed supply, immutable mint**; the founder buys on the
  curve like everyone (optionally first, in the launch transaction).
- **Graduation into DAMM v2 with 100% of liquidity permanently locked**,
  half in the founder's position and half in Pawket's — nobody can pull it.
- **One coin per guild, impossible to impersonate:** the mint key derives
  from Pawket's server secret and the guild's slug, so only Pawket's server
  can make the guild's coin, and it is found with one read.
- **Partial-fill buys** (`swap2`) so the buy that fills the curve takes only
  what graduation needs; **verified routing** — the DAMM v2 route is used
  only at the pool address the preset derives.
- **Safety as product:** terms and risks on Paper before any signature, a
  disclosure read once per coin, a banned-phrase test over every coin
  surface, stages decided on the server, and a coin never touches a pet.
- **End to end on devnet:** `pnpm e2e:coins` launches with a first buy, buys
  to the threshold, graduates, sells in the DAMM v2 pool and claims the
  founder's fees — every transaction built by the server and signed only by
  the player.
- **Mainnet-ready presets:** mainnet thresholds are ≥ 10 SOL so Meteora's
  keepers migrate them; they ship after legal review.
