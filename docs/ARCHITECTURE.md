# Architecture

Single Next.js 16 App Router application (React 19, TypeScript strict,
Tailwind v4). One app, not a monorepo — the foundation does not need package
boundaries yet. Split only when a second deployable or a generated program
client forces it.

## Boundaries

```txt
programs/pawket/            the Anchor program (Rust) and its LiteSVM tests
app/                        routes, layouts, route handlers (Server by default)
  page.tsx                  landing (revalidates each minute: a live count from chain)
  adopt/                    three-step adoption, no dock
  (game)/                   shell: mark, dock, wallet chip, theme
    home/                   the room and the care loop
    park/                   every pet on Solana, read live (Server)
    inventory/              pets (on Solana, in this browser) and the wardrobe
    playground/             one solo round
    guilds/                 the boundary. no directory, no swap
    pet/[id]/               an address: the public Passport (Server);
                            anything else: the browser pet's record
  api/health/route.ts       build version + active cluster
  api/sponsor/route.ts      signs Pawket transactions first, as fee payer
  api/keepsake/             a pet's card in its owner's wallet (Metaplex Core)
src/components/             UI; "use client" only at interactive leaves
  pk/                       design system
  wallet/                   connect sheet, wallet chip, address line, tx receipt
  home/ adopt/ pet/ inventory/ play/
  room3d/                   the 3D room: one R3F Canvas, loaded only by Home
src/config/                 validated env (public + server-only) + site constants
src/lib/game/               pure companion math (no React, no Solana) + lockstep.txt
src/lib/guest/              the browser pet's record, migration, localStorage
src/lib/companion/          which pet a screen draws: on Solana, else this browser
src/lib/closet/             wearable catalog (its order is the on-chain slot)
src/lib/play/               gate pattern and score
src/lib/guilds/             boundary copy
src/lib/player/             the player's look (3D room), localStorage
src/lib/room/               moments and emotes, as data
src/lib/solana/             program constants + IDL, PDAs, builders, decoders,
                            the send path, the sponsor's rules, browser rpc/wallet
src/server/                 server-only: chain reads, the sponsor's key and float
src/lib/utils/              formatting + hydration helpers
e2e/                        Playwright, and a Wallet Standard wallet for tests only
scripts/3d/                 asset pipeline: source packs → public/3d/ GLBs
scripts/vercel-env.sh       production environment, sponsor key marked sensitive
public/3d/                  built GLBs (validated, meshopt-compressed)
docs/                       the docs you are reading
```

## Data flow

- The browser pet lives in `localStorage` (`pawket.guest-pet.v1`), read
  with `useSyncExternalStore`; care, the wardrobe and a round are pure
  functions in `src/lib/guest/` and the screen saves the result.
- A pet on Solana lives in two PDAs. The browser reads the connected
  wallet's pets with `useRequest` over `fetchPetsOnChain`, and
  `toCompanionRecord` turns each into the same record shape, so every screen
  draws both kinds with the same functions. `useCompanion` picks the one in
  play (`pawket.active-pet`, a per-device choice).
- A care on Solana: `send.ts` builds, the sponsor signs first as fee
  payer, the wallet signs as owner, the client checks the message came back
  unchanged and sends it with preflight, waits for `confirmed`, then
  re-reads the pet. The room plays the moment only then.
- Server Components (Passport, Park, the landing's count) read the chain
  through `src/server/solana.ts` at request time. No cache, no indexer, no
  database.
- The 3D room is a client leaf behind `next/dynamic`: three.js loads only
  with it. It never reads or writes the pet record.
- No global store, no second API client, no database, no giant utils file.

## Client/server rules

- Secrets: anything without `NEXT_PUBLIC_` never crosses into `"use client"`
  modules. `getServerEnv()` and everything in `src/server/` import
  `server-only`, so a client import fails the build.
- Public config (`getPublicEnv()`) is safe both sides with devnet defaults.
- The sponsor's rules (`src/lib/solana/sponsor.ts`) are pure and tested; its
  key and float (`src/server/sponsor.ts`) are server-only.

## What was removed and why

Expo / React Native / expo-router shell, `app.json`, Expo assets: existed
only for the mobile-first direction. The Hono + Prisma backend from
pre-reset history is intentionally not restored. The Anchor program was
restored as v2 (see `docs/DECISIONS.md`), without its store instructions. The
companion persists in the browser, not in a database. The simulated market
and guild-swap screens were removed in the same pass — see `docs/DECISIONS.md`.
Git history preserves the old surfaces for reference.
