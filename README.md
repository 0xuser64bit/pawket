# Pawket

Pawket is a living companion on Solana. Adopt a luna cat, a moss pup or a
cloud bun in the browser — no wallet, no token — and care for it: feed,
play, brush, rest, three little games, something to wear. Its face is its
record: the temperament you chose is the face it wears when all is well,
and a need (hungry, lonely, tired, scruffy) shows on it until you meet it.
When you want a record nobody can edit or erase, keep it on Solana: every
care becomes a signed transaction, the streak and the level live in
accounts only your wallet can write to, and anyone can look the pet up.

**Live:** https://pawket-pets.vercel.app — on Solana devnet, and Pawket pays
the network fees, so a wallet with no SOL can play.

**Program:** [`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`](https://explorer.solana.com/address/PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74?cluster=devnet) (devnet)

## Try it

1. Open the live app and adopt — no wallet, no sign-up, and as many pets as
   you like. Feed, play, brush and rest in the room; the pet's needs fall
   while you are away, and its face (and the deck) says what it wants.
2. To keep the pet on Solana, connect a wallet set to devnet (in Phantom,
   turn on testnet mode and pick Solana Devnet). It needs no SOL.
3. Press "Record Pepper" and approve. Every care after that is a signed
   transaction, with its signature and an Explorer link on screen.
4. Open "Their record" — the public Passport anyone can read — and keep the
   pet's card in your wallet from there.
5. Share the Passport link: in a Blink-aware client it opens as the pet's
   card, with its four cares.
6. Open Guilds and join Sunbeam Club, Muddy Paws or Cloud Nine with a pet on
   Solana — or found your own. A guild's link is a Blink too: it opens as
   the guild's card, and a pet joins from the wallet.
7. Make it yours in Profile: your name, your look (hats, glasses, outfits),
   the wardrobe, the stickers each record has earned, and eight rooms.

## What happens on chain

| On Solana | What it holds |
| --- | --- |
| `Pet` PDA `[pet, owner, name]` | species, personality, vitals, XP and level, the last time each care was given, what it is wearing |
| `PetPassport` PDA `[passport, pet]` | the UTC-day streak and best streak, care and round counts, and the last eight cares |
| `Guild` PDA `[guild, slug]` | a guild's name, motto, crest, founder and member count. No token, no treasury |
| `GuildMember` PDA `[member, pet]` | one pet's place in one guild, and who paid its rent |

| Instruction | What it does |
| --- | --- |
| `adopt_pet` | a new pet at 72 across the board; the owner signs for the name, a separate `payer` covers rent |
| `perform_care_action` | decays the vitals to now, applies the care, +10 XP, writes the Passport; each care rests 30 minutes |
| `finish_round` | the playground's daily bonus: +25 XP once per UTC day |
| `dress` | one thing to wear (18 pieces), or nothing. Looks only |
| `found_guild` | a pet founds a guild at its slug and is its first member; the sponsor can pay the rent |
| `join_guild` / `leave_guild` | a pet joins one guild at a time; leaving returns the rent to whoever paid it |

| Keepsake (Metaplex Core) | a card for the pet in its owner's wallet, in Pawket's collection [`5t7dq…PfEC9`](https://explorer.solana.com/address/5t7dqAEwdcG6C38XtHsMXbtwWyWZQFDqkjPy7JWPfEC9?cluster=devnet): frozen for good (`PermanentFreezeDelegate`), with the pet's address, species and personality as attributes |

Decay is lazy: stored vitals are their value at `stats_updated_at`, and the
program decays them forward with the same integer arithmetic the web app
uses to draw them. One scripted life (`src/lib/game/lockstep.txt`) is
replayed against the program and against the browser's record; both land on
every number.

**Fees.** `/api/sponsor` checks a transaction — only Pawket's four
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
unfurl as an adoption card, the pet's card with its four cares, or the
guild's card with a way in, and a player can adopt, care or join without
visiting the site. Pawket pays those fees too.

## The places

- **Home** — the room across the whole width, in 3D: you and the pet at home
  (or a drawn room where 3D cannot draw), with a deck floating beneath it —
  the level as a ring, the four vitals minimized, the four cares (the one
  the pet wants in sun), and Say, Today, Photo and Look. Faces in the bar
  bring any of your pets home. Today's round is a checklist; Photo prints
  the room as a picture to save or share.
- **Park** — every pet the program keeps, read live: a drawn park where the
  pets out today wander on the lawn, what just happened, and everyone.
- **Playground** — four games with any of your pets in them: Catch, Hop,
  Copy and Pairs. A game card plays today's round, the same for everyone on
  the same UTC day, so a score is worth sharing; practice is a new round.
  The first round finished in a day is +25 XP, on Solana too.
- **Profile** — you: your name, you in your room, your whole look (body,
  hair, clothes, shoes, hats and glasses, pastels, three saved outfits, and
  a way to match your pet), then what you keep — every pet, the wardrobe
  (any pet in the mirror; 18 pieces, five earned by stickers), the sticker
  book, and settings with eight rooms to live in.
- **Guilds** — optional, always: pets and their people under a name, a motto
  and a crest, kept on Solana. Found one with a pet on Solana, join or leave
  any time; Pawket pays the fee. No token, nothing to buy, nothing that
  touches a pet.
- **`/pet/<address>`** — a pet's public Passport, server-rendered from chain,
  with its guild; its owner can keep the pet's card in their wallet here.

## Quickstart

Requires Node 20+ and pnpm 10+.

```sh
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

With no `SPONSOR_KEYPAIR`, players pay their own (devnet) fees. To cover
them locally, make a devnet keypair, fund it, and put its JSON byte array
in `.env.local` as `SPONSOR_KEYPAIR`.

The program (Anchor 1.2, Rust 1.89, Solana CLI 3.x):

```sh
pnpm program:test   # anchor build --arch v2, then the LiteSVM suite
pnpm e2e:devnet     # a 0-SOL wallet adopts and cares against the deployed program
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
