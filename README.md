# Pawket

Pawket is a living companion on Solana. Adopt a luna cat, a moss pup or a
cloud bun in the browser — no wallet, no token — and care for it: feed,
play, brush, rest, a round in the playground, something to wear. When you
want a record nobody can edit or erase, keep it on Solana: every care
becomes a signed transaction, the streak and the level live in accounts only
your wallet can write to, and anyone can look the pet up.

**Live:** https://pawket-pets.vercel.app — on Solana devnet, and Pawket pays
the network fees, so a wallet with no SOL can play.

**Program:** [`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`](https://explorer.solana.com/address/PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74?cluster=devnet) (devnet)

## What happens on chain

| On Solana | What it holds |
| --- | --- |
| `Pet` PDA `[pet, owner, name]` | species, personality, vitals, XP and level, the last time each care was given, what it is wearing |
| `PetPassport` PDA `[passport, pet]` | the UTC-day streak and best streak, care and round counts, and the last eight cares |

| Instruction | What it does |
| --- | --- |
| `adopt_pet` | a new pet at 72 across the board; the owner signs for the name, a separate `payer` covers rent |
| `perform_care_action` | decays the vitals to now, applies the care, +10 XP, writes the Passport; each care rests 30 minutes |
| `finish_round` | the playground's daily bonus: +25 XP once per UTC day |
| `dress` | one thing to wear, or nothing. Looks only |

Decay is lazy: stored vitals are their value at `stats_updated_at`, and the
program decays them forward with the same integer arithmetic the web app
uses to draw them. One scripted life (`src/lib/game/lockstep.txt`) is
replayed against the program and against the browser's record; both land on
every number.

**Fees.** The wallet signs as the owner. `/api/sponsor` checks the
transaction — only Pawket's four instructions, the sponsor as fee payer and
rent payer and nothing else, no lookup tables, no priority fees, every other
signer already signed — co-signs and sends it with preflight on. A care
still cooling down is refused before anyone pays for it.

**Blinks.** `/adopt` and every `/pet/<address>` link are also Solana
Actions (`/actions.json`): in a Blink-aware client they unfurl as an
adoption card, or as the pet's card with its four cares, and a player can
adopt or care without visiting the site. Pawket pays those fees too.

## The places

- **Home** — the room, in 3D: you and your pet in one scene. Care plays out
  between you, after it is saved (or confirmed, on Solana).
- **Park** — every pet the program keeps, read live: who was out today and
  what just happened.
- **Playground** — five gates, then run them back. The first finished round
  of a day is +25 XP.
- **Inventory** — your pets, on Solana and in this browser, and a free
  wardrobe that changes looks and nothing else.
- **Guilds** — the written boundary for a layer that does not exist yet:
  nothing to join, buy or swap.
- **`/pet/<address>`** — a pet's public Passport, server-rendered from chain.

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

3D pets: Kenney, Cube Pets (CC0). 3D people: Quaternius, Universal Base
Characters (CC0). Clothes, clips and fitting are generated by
`scripts/3d/`.
