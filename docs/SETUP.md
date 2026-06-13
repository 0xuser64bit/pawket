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

## Core pet lifecycle vertical slice

The current MVP loop is real on the API/database path:

1. Connect with the clearly labeled local/dev wallet in the mobile app.
2. Adopt a pet through `POST /pets/adopt`.
3. View the persisted active pet through `GET /pets/:walletAddress`.
4. Perform care actions through `POST /pets/:petId/care`.
5. Stats, XP, level, mood, last-care info, care-action history, and passport events are written to Postgres.
6. Reloading the app/session fetches the active pet from the API again.
7. Open Pet Passport to fetch `GET /pets/:petId/passport` and view the timeline.

This does not claim on-chain adoption/care yet. Solana Mobile Wallet Adapter and Anchor transaction builders remain honest stubs until the devnet path is wired.

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
curl http://localhost:8787/pets/<petId>/passport
```

## Mobile commands

```sh
pnpm --filter @pawket/mobile dev
pnpm --filter @pawket/mobile typecheck
pnpm --filter @pawket/mobile build
```

The mobile app currently uses the SDK client instead of raw fetch calls for pet reads, adoption, care actions, and passport loading.

## Anchor

Install Rust, Solana CLI, and Anchor CLI. The placeholder program ID in `Anchor.toml` and `lib.rs` must be replaced by a generated keypair before deployment:

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

## What is real now

- Shared package is the source of truth for pet enums, stats, schemas, mood, XP, level, care effects, cooldown validation, and initial state.
- API routes are service-backed and persist core lifecycle state through Prisma/Postgres.
- SDK exposes typed methods for the pet lifecycle.
- Mobile uses a clearly labeled dev wallet plus the SDK/API path for adoption, care, pet reload, and passport timeline.

## Still stubbed / intentionally not faked

- Solana Mobile Wallet Adapter device signing.
- Anchor transaction construction from mobile/SDK.
- Devnet deployment and on-chain pet reads.
- Payments, Jupiter swaps, Mercuryo on-ramp, store, friends, marketplace, cosmetics, and seasonal events.

## Known blockers in minimal environments

- Without network access, package installation cannot complete.
- `prisma:migrate` requires a reachable Postgres database.
- Anchor build may emit upstream Anchor/Solana `unexpected cfg` warnings. They are documented warnings, not Pawket logic errors.
- `anchor test` requires a Solana keypair at `~/.config/solana/id.json` or `ANCHOR_WALLET`.
- Without Android tooling and a real device, Expo native builds cannot fully verify Solana Mobile Wallet Adapter integration.
