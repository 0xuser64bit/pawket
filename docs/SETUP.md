# Setup

## Local development

```sh
pnpm install
cp .env.example .env
pnpm --filter @pawket/api prisma:generate
pnpm --filter @pawket/api dev
pnpm --filter @pawket/mobile dev
```

## Database

Set `DATABASE_URL` to any PostgreSQL or Supabase-compatible Postgres URL. Then create and apply the initial migration:

```sh
pnpm --filter @pawket/api prisma:migrate
```

## Anchor

Install Rust, Solana CLI, and Anchor CLI. The placeholder program ID in `Anchor.toml` and `lib.rs` must be replaced by a generated keypair before deployment:

```sh
cd programs/pawket
anchor keys sync
anchor test
```

## Known blockers in minimal environments

- Without network access, package installation cannot complete.
- Anchor build currently works locally with Anchor 0.31.1, but Rust emits upstream Anchor/Solana `unexpected cfg` warnings. They are documented warnings, not Pawket logic errors.
- `anchor test` requires a Solana keypair at `~/.config/solana/id.json` or `ANCHOR_WALLET`. In this environment the root `pnpm test` records the missing keypair and lets TS tests continue.
- Without Android tooling and a real device, Expo native builds cannot fully verify Solana Mobile Wallet Adapter integration.
