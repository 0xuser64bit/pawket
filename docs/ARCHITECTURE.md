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
  adopt/                    three-step adoption, no dock; adds a pet beside the others
  (game)/                   shell: mark, dock, wallet chip, room switch
    home/                   the room across the width, the deck, the care loop, photos
    park/                   every pet on Solana, read live (Server)
    profile/                you: name, look, outfits, pets, wardrobe, stickers, settings
    inventory/              redirects to the profile's shelf
    playground/             four games: Catch, Hop, Copy, Pairs; a shared daily round
    guilds/                 every guild on Solana (Server); new/ founds one; [slug]/ is one,
                            with its gatherings; [slug]/coin/ is its coin on Meteora
    market/                 looks for SOL at the program's prices; the closet read from chain
    pulse/                  everything the program holds, counted live (Server)
    pet/[id]/               an address: the public Passport (Server);
                            anything else: the browser pet's record
  api/health/route.ts       build version + active cluster
  api/sponsor/route.ts      signs Pawket transactions first, as fee payer
  api/keepsake/             a pet's card in its owner's wallet (Metaplex Core)
  api/coins/[slug]/         a guild coin's quote, launch, trade, graduation, fee claim, metadata
  api/actions/              Solana Actions: adopt, care, wave, join a guild, their icons
src/components/             UI; "use client" only at interactive leaves
  pk/                       design system
  wallet/                   connect sheet, wallet chip, address line, tx receipt
  home/ adopt/ pet/ profile/ guilds/ play/ market/ coins/
  room3d/                   the 3D room: one R3F Canvas, loaded only by Home
src/config/                 validated env (public + server-only) + site constants
src/lib/game/               pure companion math (no React, no Solana) + lockstep.txt
src/lib/guest/              the browser pet's record, migration, localStorage
src/lib/companion/          which pet a screen draws: on Solana, else this browser
src/lib/closet/             wearable catalog (its order is the on-chain slot)
src/lib/play/               the four games as pure seeded steps, local bests, sound
src/lib/guilds/             the rule, slugs and crests, the delisting list
src/lib/coins/              guild-coin presets, stages and copy (pure); src/server/coins/ speaks Meteora
src/lib/market/             the connected wallet's closet
src/lib/player/             the player's look (3D room), localStorage
src/lib/room/               moments and emotes, as data
src/lib/solana/             program constants + IDL, PDAs, builders, decoders,
                            the send path, the sponsor's rules, browser rpc/wallet
src/server/                 server-only: chain reads, the sponsor's key and float, the pulse, coins
src/lib/utils/              formatting + hydration helpers
src/lib/native/             the Android app's bridge, seen from the page (inert in a browser)
android/                    the Android app: the official webshell around the hosted app (docs/ANDROID.md)
e2e/                        Playwright, and a Wallet Standard wallet for tests only
scripts/3d/                 asset pipeline: source packs → public/3d/ GLBs
scripts/vercel-env.sh       production environment, sponsor key marked sensitive
public/3d/                  built GLBs (validated, meshopt-compressed)
docs/                       the docs you are reading
```

## Data flow

- The browser's pets live in `localStorage` as one list
  (`pawket.pets.v1`; the one pet from before moves in on first read), read
  with `useSyncExternalStore`; care, the wardrobe and a round are pure
  functions in `src/lib/guest/` and the screen saves the one pet it changed.
- A pet on Solana lives in two PDAs. The browser reads the connected
  wallet's pets with `useRequest` over `fetchPetsOnChain`, and
  `toCompanionRecord` turns each into the same record shape, so every screen
  draws both kinds with the same functions. `useCompanion` lists them all
  and picks the one at home (`pawket.active-pet`, a per-device choice of a
  browser id or an address). Each pet on Solana is read with its Passport
  and its guild place in one batch.
- A care on Solana: `send.ts` builds, the sponsor signs first as fee
  payer, the linked, funded device signs for its owner, the client checks the message came back
  unchanged and sends it with preflight, waits for `confirmed`, then
  re-reads the pet. The room plays the moment only then.
- Server Components (Passport, Park, the landing's count) read the chain
  through `src/server/solana.ts` at request time. No indexer, no database;
  the one shared read is the scan of every pet, which callers within 8
  seconds of each other share (a failed scan is never kept).
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
only for the mobile-first direction. The Android app that came later is not
that shell: it is a WebView around this app (`android/`, `docs/DECISIONS.md`),
so nothing on screen is written twice. The Hono + Prisma backend from
pre-reset history is intentionally not restored. The Anchor program was
restored and deployed to devnet (see `docs/DECISIONS.md`), without its store instructions. The
companion persists in the browser, not in a database. The simulated market
and guild-swap screens were removed in the same pass — see `docs/DECISIONS.md`.
Git history preserves the old surfaces for reference.
