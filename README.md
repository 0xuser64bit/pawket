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
packages/pawket-sdk  API client, Solana PDA/transaction builders, payments helpers
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

Pawket is a playable, multi-user vertical slice of the core pet + retention loop on Solana devnet.

- **Real per-device identity.** On first run each device mints and persists a real Ed25519 "companion key" (Solana-compatible base58 address, on-device signing). Every install is a distinct wallet that owns its own pet and Passport — no shared demo wallet — and returning players resume their companion automatically.
- **A pet that actually needs you.** Vitals (hunger / happiness / energy / hygiene) drain over real time; care lands on the current decayed values. Mood, the "needs care" focus, and daily streaks all react to neglect, so the daily loop has real stakes.
- **The loop, end to end.** Adopt → care (feed/play/groom/rest with cooldowns + XP) → level up → daily goals → once-per-UTC-day streak reward → Pet Passport timeline, all persisted through the Hono + Postgres API.
- **Focused product surface.** Three confident tabs — Home, Passport, Seasons (the Season One roadmap) — plus a back-navigable Settings with real disconnect / start-over.

The SDK ships offline Anchor-compatible PDA helpers and unsigned transaction builders for game-config init, adoption, and care. Still ahead: Solana Mobile Wallet Adapter device signing of those transactions, devnet deployment + on-chain reads, and the monetization/social layers (payments, Jupiter, Mercuryo, store, friends, seasonal events) — kept as honest typed interfaces, not faked.

## Known local setup requirements

- `pnpm install` needs network access.
- Anchor build passed here with Anchor 0.31.1, but emits upstream Anchor/Solana Rust cfg warnings.
- Full `anchor test` requires a funded/local Solana keypair at `~/.config/solana/id.json` or `ANCHOR_WALLET`.
- Expo native device verification for Solana Mobile requires Android tooling and a real Android/Solana Mobile device.

## Next steps

1. Install dependencies and run all checks.
2. Configure Postgres and run Prisma migrations (now includes `Pet.statsUpdatedAt` for decay).
3. Deploy the synced Anchor program ID to devnet and verify on-chain reads.
4. Wire Solana Mobile Wallet Adapter signing on device and have the companion key sign/send the SDK-built adopt/care transactions.
5. Implement verified payment confirmation for SOL/USDC before enabling Seasons purchases.
