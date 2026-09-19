# Pawket (web-first)

Pawket is a **web-first living companion on Solana**. Devnet by default.

Right now the shipped surface is a single landing page. The care loop,
wallet flows, and transaction paths live in `src/lib/` (tested) but are not
rendered — the landing claims nothing beyond what exists.

## Quickstart

Requires Node 20+ and pnpm 10+.

```sh
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

## Commands

| Command          | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Local dev server                           |
| `pnpm build`     | Production build                           |
| `pnpm start`     | Serve the production build                 |
| `pnpm lint`      | ESLint (Next core-web-vitals + TypeScript) |
| `pnpm typecheck` | `tsc --noEmit`                             |
| `pnpm test`      | Vitest unit/component tests                |
| `pnpm e2e`       | Playwright browser smoke tests             |
| `pnpm verify`    | typecheck + lint + test + build            |

## Structure

- `app/` — App Router routes, layouts, and route handlers (server by default)
- `src/components/` — UI; `"use client"` only at interactive leaves
- `src/components/pet/` — deterministic companion avatar (landing art)
- `src/config/` — validated environment + site constants
- `src/lib/game/` — pure companion math (stats, XP, cooldown, decay)
- `src/lib/guest/` — wallet-free companion logic + storage (unrendered)
- `src/lib/solana/` — cluster config, Kit client, PDAs, instructions, account
  reads, tx lifecycle (unrendered)
- `src/lib/utils/` — formatting and hydration helpers
- `docs/` — architecture, development, Solana, testing, workflow
- `e2e/` — Playwright browser tests

Start with `AGENTS.md`, then `docs/ARCHITECTURE.md`.

## Environment

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_*` values are client-safe;
server-only secrets must never carry that prefix. See `docs/ENVIRONMENT.md`.

## Solana

Devnet by default. Wallets connect via Wallet Standard; the connected wallet
signs. Always simulate before sending, confirm with a timeout, and link every
signature to the Explorer for the active cluster. See `docs/SOLANA.md`.

## Deployment

Push to `main` deploys to Vercel. Production uses mainnet configuration only
through explicit environment promotion — never by changing code defaults.
