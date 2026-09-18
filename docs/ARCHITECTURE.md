# Architecture

Single Next.js 16 App Router application (React 19, TypeScript strict,
Tailwind v4). One app, not a monorepo — the foundation does not need package
boundaries yet. Split only when a second deployable or a generated program
client forces it.

## Boundaries

```txt
app/                        routes, layouts, route handlers (Server by default)
  layout.tsx                metadata + <Providers>
  providers.tsx             ClientProvider wiring only (no UI, no logic)
  page.tsx                  composes server shell + client leaves
  api/health/route.ts       build version + active cluster
src/components/             UI; "use client" only at interactive leaves
  wallet/                   connection, balance, representative send flow
  transaction-status.tsx    the one tx-status surface every flow uses
  network-badge.tsx         server-rendered cluster/program readout
src/config/                 validated env + site constants
src/lib/game/               pure companion math (no React, no Solana)
src/lib/solana/             cluster, client, PDAs, instructions, tx lifecycle
src/lib/utils/              formatting + error helpers
e2e/                        Playwright browser smoke tests
docs/                       the docs you are reading
```

## Data flow

- Server Components render shell + public config. They never hold wallets.
- One browser client (`browser-client.ts`) owns RPC + wallet state, published
  once via `ClientProvider`.
- Leaves read it with `useClient<AppClient>()` and framework hooks
  (`useWallets`, `useConnectedWallet`, `useRequest`).
- Sends go through `client.sendTransaction([instruction])` with preflight on.
  After confirmation, state reloads from the source of truth — no optimistic
  patches.
- No global store, no second API client, no giant utils file.

## Client/server rules

- Secrets: anything without `NEXT_PUBLIC_` never crosses into `"use client"`
  modules. `getServerEnv()` is server-only by convention (never imported
  from client files).
- Public config (`getPublicEnv()`) is safe both sides with devnet defaults.
- `server-only` is available for future server modules holding credentials.

## What was removed and why

Expo / React Native / expo-router shell, `app.json`, Expo assets: existed
only for the mobile-first direction. The Hono + Prisma backend and Anchor
workspace from pre-reset history are intentionally not restored — the
foundation has no persistence or program deploy yet (see `docs/DECISIONS.md`).
Git history preserves all of it for reference.
