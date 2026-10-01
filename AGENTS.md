# Pawket — agent operating system

Read this before changing code. Product context lives in `docs/PRODUCT.md`,
architecture in `docs/ARCHITECTURE.md`. This file is the contract for how an
agent works in this repo.

## What this is

Pawket is a **web-first** living companion on Solana. A player adopts a pet
in the browser with no wallet, cares for it (feed / play / groom / rest),
and — when they choose — keeps it on Solana, where every care is a signed
record anyone can check. Devnet by default; Pawket pays the fees.

**Current truth:** a pet starts in this browser. `/adopt` writes it through
`src/lib/guest/` and `src/lib/game/`. Home runs care (feed, play, groom,
rest) with decay, cooldowns, XP, a UTC streak and a care log, in a room
drawn in 3D — the player and the pet in one scene (`src/components/room3d/`,
`docs/ROOM-3D.md`), with the flat SVG room wherever 3D cannot draw.

"Keep Pepper on Solana" carries that pet into the program in
`programs/pawket/` (devnet `PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`): a
`Pet` PDA holds vitals, XP, cooldowns and what it wears; its `PetPassport`
holds the streak, counts and the last eight cares. Decay, cooldowns, XP,
the streak and the daily round bonus are enforced on chain by the same
integer math as `src/lib/game/` (`src/lib/game/lockstep.txt` is replayed by
both). The sponsor (`/api/sponsor`) signs first, as fee payer and rent payer,
and signs nothing but Pawket instructions; the wallet signs second, as
owner. A care
on Solana plays its moment only after it is confirmed; nothing is optimistic.

`useCompanion` (`src/lib/companion/`) decides what a screen draws: the
connected wallet's pet on Solana, else the browser pet — one record shape
for both. Inventory dresses the pet (expression only; on Solana a signed
`dress`). The playground is three solo games (Catch, Hop, Copy), any one of
them a round; on Solana a finished round is kept when the player presses
"Record the round". `/pet/<address>` is the
public Passport, server-rendered from chain; `/park` is every pet the
program keeps, read live. Guilds is the written boundary in
`src/lib/guilds/boundary.ts`: nothing to join, buy or swap. There is no
market. A pet on Solana can have a keepsake: a card in its owner's wallet, a
Metaplex Core asset in Pawket's collection, frozen for good, that points at
the pet (`src/lib/solana/core.ts`, `src/server/keepsake.ts`). The pet stays
the program's account; the card cannot be sold or sent. Do not put a
simulated price, treasury, member count or lobby on a screen, and call a pet
"on Solana" only when it was read from chain.

## Read first

| If you are…               | Read                                                        |
| ------------------------- | ----------------------------------------------------------- |
| New to the repo           | this file → `docs/ARCHITECTURE.md` → `docs/VISION.md` → `docs/PRODUCT.md` |
| Planning any feature      | `docs/ROADMAP.md` → `docs/EPICS.md` → `docs/TASKS.md` → `docs/OPEN-QUESTIONS.md` |
| Implementing a task       | `docs/AGENT-GUIDE.md` + the one spec for your layer         |
| Running the app           | `docs/DEVELOPMENT.md`                                       |
| Changing env/config       | `docs/ENVIRONMENT.md`                                       |
| Touching Solana / wallets | `docs/SOLANA.md`                                            |
| Touching game math        | `docs/GAME-DESIGN.md` (`src/lib/game/` is lockstep)         |
| Touching pets/NFTs        | `docs/NFT-CUSTOMIZATION.md` + `docs/DOMAIN-MODEL.md`        |
| Touching the 3D room      | `docs/ROOM-3D.md` + `docs/DESIGN.md` (“The room in 3D”)     |
| Touching marketplace      | `docs/MARKETPLACE.md` + `docs/API-CONTRACTS.md`             |
| Touching guilds/launches  | `docs/GUILDS.md` + `docs/METEORA-INTEGRATION.md` + `docs/SAFETY-ECONOMY.md` |
| Touching indexer/API      | `docs/INDEXER.md` + `docs/API-CONTRACTS.md` + `docs/ROUTES.md` |
| Adding tests              | `docs/TESTING.md`                                           |
| Declaring work done       | `docs/WORKFLOW.md` (Definition of Done)                     |
| Questioning a decision    | `docs/DECISIONS.md` (history) + `docs/OPEN-QUESTIONS.md` (pending) |

## Sources of truth

One home per fact. If two files disagree, the left column wins.

| Fact                              | Authoritative file                  |
| --------------------------------- | ----------------------------------- |
| Game math, enums                  | `src/lib/game/`                     |
| The program (rules on chain)      | `programs/pawket/src/lib.rs`        |
| Game math ↔ program lockstep      | `src/lib/game/lockstep.txt`         |
| Program ID, seeds, discriminators | `src/lib/solana/program.ts` (held to `src/lib/solana/idl/pawket.json`) |
| PDA derivation                    | `src/lib/solana/pda.ts`             |
| Instruction builders              | `src/lib/solana/instructions.ts`    |
| Account decoding, chain → record  | `src/lib/solana/accounts.ts`        |
| Cluster / RPC / Explorer links    | `src/lib/solana/cluster.ts`         |
| Browser rpc + wallet client       | `src/lib/solana/browser-client.ts`  |
| The one send path                 | `src/lib/solana/send.ts`            |
| Transaction lifecycle + UX copy   | `src/lib/solana/transactions.ts`    |
| What the sponsor will sign        | `src/lib/solana/sponsor.ts`         |
| Sponsor key, float, availability  | `src/server/sponsor.ts`             |
| Keepsake instructions, collection | `src/lib/solana/core.ts` (Metaplex Core) |
| Keepsake key, metadata, creation  | `src/server/keepsake.ts`            |
| Server-side chain reads           | `src/server/solana.ts`              |
| The pet a screen draws            | `src/lib/companion/use-companion.ts`|
| Env names and defaults            | `.env.example` + `src/config/env.ts`|
| Server-only env (guarded)         | `src/config/server-env.ts`          |
| Routes                            | `app/`                              |
| Design system (tokens, components)| `app/globals.css` + `src/components/pk/` |
| Guest companion record            | `src/lib/guest/`                    |
| Wearables (expression only)       | `src/lib/closet/catalog.ts`         |
| Playground games (pure, seeded)   | `src/lib/play/`                     |
| Guild boundary copy               | `src/lib/guilds/boundary.ts`        |
| Player look (3D room)             | `src/lib/player/look.ts`            |
| Moments and emotes                | `src/lib/room/moments.ts`           |
| 3D assets (built, never hand-edited) | `scripts/3d/` → `public/3d/`     |
| Target architecture (M3–M6)       | `docs/ARCHITECTURE-TARGET.md`       |
| Domain types, state machines      | `docs/DOMAIN-MODEL.md`              |
| Route IA + Server/Client split    | `docs/ROUTES.md`                    |
| API envelopes + error codes       | `docs/API-CONTRACTS.md`             |
| Meteora presets + launch stages   | `docs/METEORA-INTEGRATION.md`       |
| Eligibility (cosmetic/social)     | `docs/GUILDS.md` + `docs/INDEXER.md`|
| Task sequence + blockers          | `docs/TASKS.md` + `docs/OPEN-QUESTIONS.md` |

Do not introduce a second store of any of these.

## Commands

```sh
cp .env.example .env.local
pnpm install
pnpm dev              # http://localhost:3000
pnpm verify           # typecheck + lint + test + build (run before Done)
pnpm test             # Vitest
pnpm e2e              # Playwright (needs no wallet; asserts shell, not signing)
pnpm assets:3d        # rebuild public/3d from the source files in assets/
pnpm program:test     # anchor build (SBF v2) + the LiteSVM suite, incl. the lockstep replay
pnpm e2e:devnet       # Vitest against the deployed program: a 0-SOL wallet adopts and cares
PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts   # the same path through the real screens
```

## Workflow (short version)

1. Read the matching doc and the closest existing module — copy that shape.
2. Change the smallest set of layers that own the fact.
3. Keep game math ↔ program constants ↔ tests in sync. Never "just update the UI."
4. Add or extend a test at the layer you changed (see `docs/TESTING.md`).
5. Run `pnpm verify`. Report what you ran, what changed, and what is stubbed.

## Hard rules

- **No custody.** Never ask for, log, upload, or persist a player's seed
  phrase or key. Wallets sign. The only key the app holds is its own devnet
  sponsor (`SPONSOR_KEYPAIR`, server-only), which signs only what
  `checkSponsorable` allows, and the keepsakes `src/server/keepsake.ts`
  builds (it is the collection's authority). It is not the program's
  upgrade authority.
- **No hand-rolled instruction bytes in components.** Use
  `src/lib/solana/instructions.ts`. Never invent discriminators;
  `program.test.ts` holds them to the IDL.
- **No silent sends.** Every send needs explicit user action, simulation
  first (preflight on, here or at the sponsor), and a visible signature +
  Explorer link after (`TxReceipt`). Go through `send.ts`; never a second path.
- **No optimistic adopt/care state.** Wait for confirmation, then reload from
  the source of truth.
- **No `NEXT_PUBLIC_` secrets.** Server-only config has no such prefix and is
  read only via `getServerEnv()` in server code.
- **No program ID / seed / discriminator changes** without an explicit human
  ask and a program deploy plan. A change to the program's math moves
  `src/lib/game/`, `lockstep.txt` and both test suites together.
- **Server Components by default.** `"use client"` only at interactive
  leaves. Never fetch in `useEffect` what a Server Component or `useRequest`
  can own.
- **Honest UI.** "On Solana" only for a pet read from chain; a browser pet
  is "in this browser". No "owned"/NFT/mainnet language: a keepsake is a
  "card", shown only once it is read from chain. "Pawket pays the fee" only
  while `sponsorState()` says it does.
- **Devnet default.** Never target mainnet in code; cluster comes from env.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
