# Pawket

Pawket is a mobile-first virtual pet game on Solana. Adopt a living companion, care for it daily, collect memories, visit friends, join seasonal events, and build an evolving Pet Passport.

Tagline: **A living on-chain companion game for Solana Mobile.**

## Tech stack

- Monorepo: pnpm workspaces + Turborepo
- Mobile: Expo React Native + TypeScript, structured for Solana Mobile Wallet Adapter integration
- API: Hono + TypeScript + Zod
- Database: PostgreSQL + Prisma
- Solana: Anchor program in `programs/pawket`
- Packages: shared Zod/types/utilities and a typed Pawket SDK
- Tests: Vitest for TypeScript packages/API, Anchor tests for the program

## Structure

```txt
apps/mobile          Expo mobile app foundation
apps/api             Hono API, Prisma schema, services, routes
packages/shared      Shared types, Zod schemas, constants, game math
packages/pawket-sdk  API client, Solana client skeleton, payments helpers
programs/pawket      Anchor program foundation and tests
docs                 Product, architecture, setup, roadmap, security
scripts              Utility scripts
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 14+ or Supabase-compatible Postgres
- Expo tooling for local mobile development
- Rust, Solana CLI, and Anchor CLI for program builds/tests

## Setup

```sh
pnpm install
cp .env.example .env
pnpm --filter @pawket/api prisma:generate
```

Run the API:

```sh
pnpm --filter @pawket/api dev
```

Run the mobile app:

```sh
pnpm --filter @pawket/mobile dev
```

Run workspace checks:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Run Anchor tests after installing Anchor/Solana/Rust:

```sh
cd programs/pawket
anchor test
```

## Current status

Pawket now has a playable local/dev vertical slice for the core pet loop and first retention loop. The mobile app can connect a clearly labeled dev wallet, adopt a pet through the API, reload the active pet from the database-backed API, perform care actions, update stats/XP/level/mood, view daily goals and care streaks, claim a once-per-UTC-day bonus XP reward after all four goals are complete, and view a Pet Passport timeline.

The core loop is real for the API/Postgres path. Solana Mobile Wallet Adapter, Anchor transaction construction, payments, Jupiter, Mercuryo, store, friends, marketplace, cosmetics, and seasonal events remain honest typed stubs/interfaces until implemented.

## Known local setup requirements

- `pnpm install` needs network access.
- Anchor build passed here with Anchor 0.31.1, but emits upstream Anchor/Solana Rust cfg warnings.
- Full `anchor test` requires a funded/local Solana keypair at `~/.config/solana/id.json` or `ANCHOR_WALLET`.
- Expo native device verification for Solana Mobile requires Android tooling and a real Android/Solana Mobile device.

## Next steps

1. Install dependencies and run all checks.
2. Configure Postgres and run Prisma migrations.
3. Generate/sync the Anchor program ID and deploy to devnet.
4. Wire real Solana Mobile signing and transaction builders.
5. Implement verified payment confirmation for SOL/USDC before enabling purchases.
