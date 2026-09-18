# Pawket (web-first)

Pawket is becoming a **web-first living companion on Solana**: adopt, care for,
and grow an on-chain companion from the browser. Devnet by default.

This repository is the clean Next.js foundation. Product features build on top
of it; the foundation itself only proves the shell, wallet plumbing, Solana
client infrastructure, and verification loop.

## Quickstart

Requires Node 20+ and pnpm 9+.

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
- `src/config/` — validated environment + site constants
- `src/lib/game/` — pure companion math (stats, XP, cooldown, decay)
- `src/lib/solana/` — cluster config, Kit client, PDAs, instructions, tx lifecycle
- `src/lib/utils/` — formatting and error helpers
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
