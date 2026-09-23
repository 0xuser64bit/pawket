# Architecture

Single Next.js 16 App Router application (React 19, TypeScript strict,
Tailwind v4). One app, not a monorepo — the foundation does not need package
boundaries yet. Split only when a second deployable or a generated program
client forces it.

## Boundaries

```txt
app/                        routes, layouts, route handlers (Server by default)
  page.tsx                  landing
  adopt/                    three-step adoption, no dock
  (game)/                   shell: mark, dock, theme
    home/                   the room and the care loop
    inventory/              the pet and the wardrobe
    playground/             one solo round
    guilds/                 the boundary. no directory, no swap
    pet/[id]/               the record for the pet in this browser
  api/health/route.ts       build version + active cluster
src/components/             UI; "use client" only at interactive leaves
  pk/                       design system
  home/ adopt/ pet/ inventory/ play/
src/config/                 validated env + site constants
src/lib/game/               pure companion math (no React, no Solana)
src/lib/guest/              companion record, migration, localStorage
src/lib/closet/             wearable catalog
src/lib/play/               gate pattern and score
src/lib/guilds/             boundary copy
src/lib/solana/             cluster, client, PDAs, instructions, tx lifecycle
                            (library only — no screen sends)
src/lib/utils/              formatting + hydration helpers
e2e/                        Playwright browser tests
docs/                       the docs you are reading
```

## Data flow

- Server Components render the shell and public config. They never hold wallets.
- The companion lives in `localStorage` (`pawket.guest-pet.v1`). The schema
  version is inside the JSON. Leaves read it with `useSyncExternalStore`.
  The server snapshot is always empty, so hydration matches, then the stored
  pet replaces it.
- Care, wardrobe and a finished round are pure functions in `src/lib/guest/`.
  The screen saves the returned pet. A failed save is told to the player.
- One browser Solana client (`browser-client.ts`) still exists for a later
  send path. No screen calls it.
- No global store, no second API client, no database, no giant utils file.

## Client/server rules

- Secrets: anything without `NEXT_PUBLIC_` never crosses into `"use client"`
  modules. `getServerEnv()` is server-only by convention (never imported
  from client files).
- Public config (`getPublicEnv()`) is safe both sides with devnet defaults.
- `server-only` is available for future server modules holding credentials.

## What was removed and why

Expo / React Native / expo-router shell, `app.json`, Expo assets: existed
only for the mobile-first direction. The Hono + Prisma backend and Anchor
workspace from pre-reset history are intentionally not restored. The
companion persists in the browser, not in a database. The simulated market
and guild-swap screens were removed in the same pass — see `docs/DECISIONS.md`.
Git history preserves the old surfaces for reference.
