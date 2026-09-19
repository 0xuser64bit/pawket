# Pawket (web-first)

Pawket is a **web-first living companion on Solana**: adopt a guest companion
in seconds with no wallet, care for it daily, or connect a Wallet Standard
wallet and adopt on-chain. Devnet by default.

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
- `src/components/pet/` — companion chamber, adopt forms, deterministic avatar
- `src/config/` — validated environment + site constants
- `src/lib/game/` — pure companion math (stats, XP, cooldown, decay)
- `src/lib/guest/` — wallet-free companion (logic, storage, hook)
- `src/lib/solana/` — cluster config, Kit client, PDAs, instructions, account
  reads, shared send hook, tx lifecycle
- `src/lib/utils/` — formatting and hydration helpers
- `docs/` — architecture, development, Solana, testing, workflow
- `e2e/` — Playwright browser tests (shell + wallet-free care loop)

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
