# Setup

## Local development

```sh
pnpm install
cp .env.example .env
pnpm --filter @pawket/api prisma:generate
pnpm --filter @pawket/api prisma:migrate
pnpm --filter @pawket/api dev
pnpm --filter @pawket/mobile dev
```

## Core pet lifecycle and retention vertical slice

The current MVP loop is real on the API/database path:

1. Connect with the clearly labeled local/dev wallet in the mobile app.
2. Adopt a pet through `POST /pets/adopt`.
3. View the persisted active pet through `GET /pets/:walletAddress`.
4. Perform care actions through `POST /pets/:petId/care`.
5. Stats, XP, level, mood, last-care info, care-action history, and passport events are written to Postgres.
6. Reloading the app/session fetches the active pet from the API again.
7. View deterministic daily goals through `GET /pets/:petId/daily-goals?walletAddress=...`.
8. Claim the once-per-UTC-day `+25 XP` daily reward through `POST /pets/:petId/daily-goals/claim` only after feed, play, groom, and rest are all complete for the current UTC day.
9. Open Pet Passport to fetch `GET /pets/:petId/passport` and view the timeline.

This does not claim on-chain adoption/care yet. The SDK can build unsigned Anchor-compatible initialize/adopt/care transactions offline, but Solana Mobile Wallet Adapter signing, devnet deployment, transaction sending, confirmation, and on-chain reads are not wired.

## Required environment variables

API:

```sh
DATABASE_URL=postgresql://postgres:password@localhost:5432/pawket?schema=public
DIRECT_URL=postgresql://postgres:password@localhost:5432/pawket?schema=public
API_HOST=0.0.0.0
API_PORT=8787
API_VERSION=0.1.0
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_CLUSTER=devnet
```

Mobile:

```sh
EXPO_PUBLIC_API_URL=http://localhost:8787
```

For Android emulator development, use `http://10.0.2.2:8787` if `localhost` resolves to the emulator instead of your host machine.

## Database

Set `DATABASE_URL` and `DIRECT_URL` to any PostgreSQL or Supabase-compatible Postgres URL. Then apply the checked-in migration:

```sh
pnpm --filter @pawket/api prisma:generate
pnpm --filter @pawket/api prisma:migrate
```

The first migration creates:

- users keyed by wallet address
- active pets owned by users
- pet stats, XP, level, species, personality, and last-care fields
- care action history
- daily reward claims keyed by pet and UTC date
- passport events
- existing starter inventory/payment/event tables

## API commands

```sh
pnpm --filter @pawket/api dev
pnpm --filter @pawket/api test
pnpm --filter @pawket/api typecheck
```

Useful endpoints:

```sh
curl http://localhost:8787/health
curl http://localhost:8787/pets/DevnetDemoWallet1111111111111111111111111111
curl -X POST http://localhost:8787/pets/adopt \
  -H 'content-type: application/json' \
  -d '{"walletAddress":"DevnetDemoWallet1111111111111111111111111111","name":"Nova","species":"luna_cat","personality":"curious"}'
curl -X POST http://localhost:8787/pets/<petId>/care \
  -H 'content-type: application/json' \
  -d '{"walletAddress":"DevnetDemoWallet1111111111111111111111111111","actionType":"feed"}'
curl 'http://localhost:8787/pets/<petId>/daily-goals?walletAddress=DevnetDemoWallet1111111111111111111111111111'
curl -X POST http://localhost:8787/pets/<petId>/daily-goals/claim \
  -H 'content-type: application/json' \
  -d '{"walletAddress":"DevnetDemoWallet1111111111111111111111111111"}'
curl http://localhost:8787/pets/<petId>/passport
```

## Mobile commands

```sh
pnpm --filter @pawket/mobile dev
pnpm --filter @pawket/mobile typecheck
pnpm --filter @pawket/mobile build
```

The mobile app currently uses the SDK client instead of raw fetch calls for pet reads, adoption, care actions, daily goals, daily reward claims, and passport loading.

## Anchor

Install Rust, Solana CLI, and Anchor CLI. The checked-in program ID is synced across `programs/pawket/programs/pawket/src/lib.rs`, `programs/pawket/target/idl/pawket.json`, and the SDK. If the program keypair changes, sync it before deployment:

```sh
cd programs/pawket
anchor keys sync
anchor build
anchor test
```

Anchor alignment today:

- `adopt_pet` matches API initial stats, XP, level, species, and personality concepts.
- `perform_care_action` matches shared care effects, XP rewards, per-action cooldowns, and owner checks.
- Passport on-chain state is currently an event count, while the rich timeline is API/database-backed.
- The SDK derives the program PDAs and builds unsigned Anchor-compatible instructions for game config initialization, adoption, and care actions.

## What is real now

- Shared package is the source of truth for pet enums, stats, schemas, mood, XP, level, care effects, cooldown validation, initial state, daily goals, UTC streaks, and daily reward values.
- API routes are service-backed and persist core lifecycle plus daily reward claim state through Prisma/Postgres.
- SDK exposes typed methods for the pet lifecycle and daily goals, plus Solana PDA helpers and unsigned transaction builders.
- Mobile uses a clearly labeled dev wallet plus the SDK/API path for adoption, care, pet reload, daily goals, reward claims, and passport timeline. The wallet screen also shows the configured program ID, cluster, and RPC while stating that mobile signing is not connected yet.

## Still stubbed / intentionally not faked

- Solana Mobile Wallet Adapter device signing.
- Sending/signing the SDK-built Anchor transactions from mobile.
- Devnet deployment and on-chain pet reads.
- Payments, Jupiter swaps, Mercuryo on-ramp, store, friends, marketplace, cosmetics, and seasonal events.

## Known blockers in minimal environments

- Without network access, package installation cannot complete.
- `prisma:migrate` requires a reachable Postgres database.
- Anchor build may emit upstream Anchor/Solana `unexpected cfg` warnings. They are documented warnings, not Pawket logic errors.
- `anchor test` requires a Solana keypair at `~/.config/solana/id.json` or `ANCHOR_WALLET`.
- Without Android tooling and a real device, Expo native builds cannot fully verify Solana Mobile Wallet Adapter integration.
