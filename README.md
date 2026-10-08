# Pawket

Pawket is a living companion on Solana. Adopt a luna cat, a moss pup or a
cloud bun in the browser — no wallet, no token — and care for it: feed,
play, brush, rest, four little games, something to wear. Its face is its
record: the temperament you chose is the face it wears when all is well,
and a need (hungry, lonely, tired, scruffy) shows on it until you meet it.
When you want a record nobody can edit or erase, keep it on Solana: every
care becomes a signed transaction, the streak and the level live in
accounts only your wallet can write to, and anyone can look the pet up.

Around the pet: guilds on chain with events and one-vote-per-wallet polls,
a guestbook anyone can wave into (from the page or the pet's Blink), a
Market of looks at prices fixed in the program, a device key that cares
with no popups, a frozen Metaplex Core keepsake card — and, for a guild that
wants one, an optional coin on **Meteora's Dynamic Bonding Curve** that
graduates into **DAMM v2** with its liquidity locked for good. Nothing money
can buy changes a pet.

**Live:** https://pawket.world — on Solana devnet. Playing in the browser
needs no wallet. Keeping a pet on Solana needs a wallet with a little devnet
SOL (0.01 is enough; it is free at [faucet.solana.com](https://faucet.solana.com))
to fill a Pawket Wallet; Pawket pays every network fee and rent. Everything
it holds, counted live: [`/pulse`](https://pawket.world/pulse).

**Program:** [`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`](https://explorer.solana.com/address/PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74?cluster=devnet) (devnet, v0 — mainnet will be v1)

**For judges:** the pitch, a three-minute demo script and the Meteora DBC
write-up are in [`docs/PITCH.md`](docs/PITCH.md); the mainnet plan is
[`docs/MAINNET.md`](docs/MAINNET.md).

## Try it

1. Open the live app and adopt — no wallet, no sign-up, and as many pets as
   you like. Feed, play, brush and rest in the room; the pet's needs fall
   while you are away, and its face (and the deck) says what it wants.
2. Connect a wallet set to devnet ("Connect", top right; in Phantom, turn on
   testnet mode and pick Solana Devnet) holding a little devnet SOL from
   [faucet.solana.com](https://faucet.solana.com).
3. Set up your Pawket Wallet (from the wallet sheet, or `/wallet`): pick how
   long to link this browser, a daily limit and what to put in (from 0.01
   SOL), then "Link this browser". One approval opens it, puts the SOL in
   and links the browser; Pawket pays its rent and every network fee. From
   then on care, rounds, clothes, adoption, guilds, gatherings and waves are
   signed here with no pop-up, inside the limits you set; Market looks and
   guild coins spend the balance only when your wallet approves. Withdraw
   or close it any time; the history of every lamport is read from Solana.
4. On Home, press "Keep on Solana" beside the room's name and confirm. Its
   record on Solana starts today, at level 1 — the sheet says so first.
   Every care after that is a signed transaction; a toast says when Solana
   has it, with the Explorer a tap away.
5. Open "Pepper's record" — the public Passport anyone can read — and keep
   the pet's card in your wallet from there.
6. Share the Passport link: in a Blink-aware client it opens as the pet's
   card, with its four cares for you and "Adopt your own" for everyone else.
7. Open Guilds and join Sunbeam Club, Muddy Paws or Cloud Nine with a pet on
   Solana — or found your own. A guild's link is a Blink too: it opens as
   the guild's card, and a pet joins from the wallet.
8. Open a guild's coin: Sunbeam Club's is on its bonding curve, Cloud Nine's
   has graduated into its DAMM v2 pool. Read the terms and what can go
   wrong, get a quote, and trade it from your Pawket Wallet's balance, your
   wallet approving — or found a guild, gather three pets, and launch its
   coin on a Pawket preset.
9. In a guild's page, say your pet is going to its event and check in when
   it starts, and answer its poll — one vote per wallet. Open someone
   else's pet and wave: it lands in their guestbook, once a day.
10. Visit the Market: twenty-five pieces for pets, twelve rooms and eight
    photo frames, at prices fixed in the program and paid from your Pawket
    Wallet when your wallet approves. A purchase goes straight to Pawket's
    treasury and into your closet on Solana; wear it from the wardrobe,
    live in it from Settings.
11. Make it yours in Profile: your name, your look (hats, glasses, outfits),
    the wardrobe, the stickers each record has earned, and your rooms.
12. Open `/pulse` for everything above, counted from the program and read
    live.

## What happens on chain

| On Solana | What it holds |
| --- | --- |
| `Pet` PDA `[pet, owner, name]` | species, personality, vitals, XP and level, the last time each care was given, what it is wearing |
| `PetPassport` PDA `[passport, pet]` | the UTC-day streak and best streak, care and round counts, and the last eight cares |
| `Guild` PDA `[guild, slug]` | a guild's name, motto, crest, founder and member count. No token, no treasury |
| `GuildMember` PDA `[member, pet]` | one pet's place in one guild, and who paid its rent |
| `PawketWallet` PDA `[wallet, owner]` | a balance only its owner fills or empties, the one device linked to it, until when and how many actions a day |
| `Closet` PDA `[closet, owner]` | what the owner bought in the Market, for good, and what they paid in all |
| `GuildEvent` / `EventRsvp` PDAs | a guild's events, and which pets said they were going and came |
| `GuildPoll` / `Ballot` PDAs | a guild's polls, and one ballot per wallet |
| `Guestbook` PDA `[guestbook, pet]` | every wave a pet has had, and its last eight visitors |

| Instruction | What it does |
| --- | --- |
| `adopt_pet` | a new pet at 72 across the board; the owner signs for the name, a separate `payer` covers rent |
| `perform_care_action` | decays the vitals to now, applies the care, +10 XP, writes the Passport; each care rests 30 minutes |
| `finish_round` | the playground's daily bonus: +25 XP once per UTC day |
| `dress` | one of the three free starter pieces, or nothing. Looks only |
| `found_guild` | a pet founds a guild at its slug and is its first member; the sponsor can pay the rent |
| `join_guild` / `leave_guild` | a pet joins one guild at a time; leaving returns the rent to whoever paid it |
| `open_wallet` / `deposit` / `withdraw` / `close_wallet` | the owner's Pawket Wallet: money in from the owner, and out only to the owner |
| `link_device` / `unlink_device` | the owner links one device (it co-signs) for up to 30 days and 500 actions a day; the owner or the device ends it |
| `*_by_device` (14) | everything the owner signs for their pets but money — care, rounds, clothes, adoption, guilds, events, check-ins, votes, waves — signed by the linked device with no prompt; the sponsor pays as for the owner, or the device pays its own fee from a float the balance refills |
| `buy_with_wallet` | one Market item at its fixed price, from the owner's Pawket Wallet to Pawket's treasury and nowhere else, into their closet |
| `fund_wallet_spend` / `settle_wallet_spend` | bracket a guild-coin trade in one transaction: the Pawket Wallet funds it, and change and proceeds go back to it |
| `dress_owned` / `dress_owned_by_device` | a piece from the closet goes on; the program checks the closet |
| `create_event` / `rsvp` / `check_in` | the founder plans; the guild's pets go, and check in when it starts |
| `create_poll` / `vote` | the founder asks; each wallet with a pet in the guild answers once |
| `wave` | anyone but the owner waves at a pet, once a UTC day |

| Guild coin (Meteora) | a guild's optional coin: a Dynamic Bonding Curve pool on one of Pawket's two preset configs ([`gentle`](https://explorer.solana.com/address/AyvaZmnBDpDfRDXZqXjHbcJKUq1WPLfGL4hT79miBkLJ?cluster=devnet), [`lively`](https://explorer.solana.com/address/4Sj8NYMxqkXcW1Ep6Cv8n9C3zN6gKqkQXHYmaBQASEwX?cluster=devnet)), graduating into a DAMM v2 pool with all of its liquidity locked for good. One billion coins, no allocations, a 1% fee split between Meteora, the guild's founder and Pawket |

| Keepsake (Metaplex Core) | a card for the pet in its owner's wallet, in Pawket's collection [`5t7dq…PfEC9`](https://explorer.solana.com/address/5t7dqAEwdcG6C38XtHsMXbtwWyWZQFDqkjPy7JWPfEC9?cluster=devnet): frozen for good (`PermanentFreezeDelegate`), with the pet's address, species and personality as attributes |

Decay is lazy: stored vitals are their value at `stats_updated_at`, and the
program decays them forward with the same integer arithmetic the web app
uses to draw them. One scripted life (`src/lib/game/lockstep.txt`) is
replayed against the program and against the browser's record; both land on
every number.

**Fees.** `/api/sponsor` checks a transaction — only Pawket's
instructions, the sponsor as fee payer and rent payer and nothing else, no
lookup tables, no priority fees — and signs it first; the wallet then signs
as the owner (a transaction that already carries a signature is one wallets
such as Phantom sign as it is, instead of rewriting it), and the app sends
it with preflight on. A care still cooling down is refused before anyone
pays for it.

**Keepsakes.** On its Passport, a pet's owner can keep the pet's card in
their wallet. The server builds the `CreateV2` — the sponsor pays and signs
as the collection's authority, the card signs its own creation — and the
owner's wallet signs last, so a card never lands where nobody asked for it.
Its key comes from the sponsor's and the pet's address: one card per pet,
found without an indexer. It cannot be sold or sent; there is no market.

**Blinks.** `/adopt`, every `/pet/<address>` and every `/guilds/<slug>`
link are also Solana Actions (`/actions.json`): in a Blink-aware client they
unfurl as an adoption card, the pet's card — its four cares for the owner,
and for everyone else a wave or their own adoption — or the guild's card
with a way in. Pawket pays those fees too.

## The places

- **Home** — the room across the whole width, in 3D: you and the pet at home
  (or a drawn room where 3D cannot draw), with a deck floating beneath it —
  the level as a ring, the four vitals minimized, the four cares (the one
  the pet wants in sun), and Say, Today, Photo and Look. Faces in the row
  above the room bring any of your pets home, and "Keep on Solana" beside a
  browser pet's room name keeps it on Solana. Today's round is a row of five goals under the deck; Photo
  prints the room as a picture to save or share.
- **Park** — every pet the program keeps, read live: a drawn park where the
  pets out today wander on the lawn, what just happened, and everyone.
- **Playground** — four games with any of your pets in them: Catch, Hop,
  Copy and Pairs. A game card plays today's round, the same for everyone on
  the same UTC day, so a score is worth sharing; practice is a new round.
  The first round finished in a day is +25 XP, on Solana too.
- **Profile** — you: your name, you in your room, your whole look (body,
  hair, clothes, shoes, hats and glasses, pastels, three saved outfits, and
  a way to match your pet), then what you keep — every pet, the wardrobe
  (any pet in the mirror; three starter pieces and whatever your closet
  holds from the Market), the sticker book, and settings with your rooms —
  Light and Dark free, twelve more from the Market.
- **Guilds** — optional, always: pets and their people under a name, a motto
  and a crest, kept on Solana. Found one with a pet on Solana, join or leave
  any time; Pawket pays the fee. Its founder plans events and asks polls;
  its pets go, check in and vote — one vote per wallet. Nothing in a guild
  touches a pet.
- **A guild's coin** — optional too: once three pets are in a guild, its
  founder may launch a coin on Meteora from Pawket's gentle or lively
  preset. It trades on its bonding curve, graduates into a DAMM v2 pool
  with its liquidity locked for good, and trades there. Every coin
  transaction is quoted and built by Pawket's server and signed and paid
  by the player. Holders' pets wear the guild's crest pin on its page — and
  that is all a coin does.
- **`/pet/<address>`** — a pet's public Passport, server-rendered from chain,
  with its guild and its guestbook; its owner can keep the pet's card in
  their wallet here, and anyone else can wave.
- **Market** — looks for SOL at fixed prices: twenty-five pieces for pets,
  twelve rooms and eight photo frames, paid from the Pawket Wallet when the
  owner's wallet approves. A sale goes to Pawket's treasury and into the
  buyer's closet on Solana; nothing sold changes a vital, XP or a score, and
  nothing is resold.
- **Pulse** (`/pulse`) — everything above, counted from the program's
  accounts and read live.

## Quickstart

Requires Node 20+ and pnpm 10+.

```sh
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

With no `SPONSOR_KEYPAIR`, a linked browser pays its own fees from the
Pawket Wallet, and nothing that needs rent (keeping a pet, a guild, a
gathering) can be sent. To sponsor locally, make a devnet keypair, fund it,
and put its JSON byte array in `.env.local` as `SPONSOR_KEYPAIR`.

The program (Anchor 1.2, Rust 1.89, Solana CLI 3.x):

```sh
pnpm program:test   # anchor build --arch v2, then the LiteSVM suite
pnpm e2e:devnet     # adoption, care, guilds, the Market and a linked browser, against the deployed program
```

## Commands

| Command            | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Local dev server                           |
| `pnpm build`       | Production build                           |
| `pnpm verify`      | typecheck + lint + test + build            |
| `pnpm test`        | Vitest unit/component tests                |
| `pnpm e2e`         | Playwright (no wallet; the chain spec is opt-in with `PAWKET_DEVNET=1`) |
| `pnpm program:build` | `anchor build --arch v2`, IDL copied to `src/lib/solana/idl/` |
| `pnpm program:test`  | build + LiteSVM tests, including the lockstep replay |
| `pnpm e2e:devnet`  | the whole path against devnet through the sponsor code |
| `pnpm e2e:coins`   | a guild coin's life on devnet: launch, curve, graduation into DAMM v2, a sale, the founder's claim |
| `pnpm assets:3d`   | rebuild `public/3d/` from the source packs (see `docs/ROOM-3D.md`) |

## Structure

- `programs/pawket/` — the Anchor program and its LiteSVM tests
- `app/` — App Router routes; the game shell is `(game)/`; `api/sponsor` pays fees
- `src/components/` — UI; `pk/` is the design system, `wallet/` the wallet layer, `room3d/` the 3D room
- `src/lib/game/` — pure companion math, in lockstep with the program
- `src/lib/guest/` — the browser pet's record and storage
- `src/lib/companion/` — which pet a screen draws: on Solana, else in this browser
- `src/lib/solana/` — program constants (held to the IDL), PDAs, builders, decoders, the send path, the sponsor's rules
- `src/server/` — server-only chain reads and the sponsor's key
- `e2e/` — Playwright, and a Wallet Standard test wallet used only by tests
- `docs/` — architecture, Solana, game design, decisions

Start with `AGENTS.md`, then `docs/ARCHITECTURE.md` and `docs/SOLANA.md`.

## Deployment

Vercel, from `main`. `scripts/vercel-env.sh` writes the production
environment, with the sponsor key marked sensitive. The program deploys with
`solana program deploy` (see `docs/SOLANA.md`); it is upgradeable by the
deploy wallet, which is not the sponsor.

## Credits

The pets, the mark, the rooms, the park and every game piece are drawn in
code (`src/components/pk/pet-art.tsx` and friends) — no image files. 3D
pets: Kenney, Cube Pets (CC0), recoloured to the same coats. 3D people:
Quaternius, Universal Base Characters (CC0). Clothes, clips and fitting are
generated by `scripts/3d/`.
