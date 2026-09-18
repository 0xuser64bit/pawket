# Environment

## Strategy

| Prefix            | Bundle   | Use for                                              |
| ----------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_*`   | Browser  | Cluster, RPC URL, WS URL, program ID, app URL — never secrets |
| No prefix         | Server only | RPC API keys, indexer tokens, privileged config    |

`.env.example` is the registry of every variable. If you add one, add it
there first with a safe default or a blank placeholder.

## Variables

| Name                            | Default                                | Notes                              |
| ------------------------------- | -------------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | `http://localhost:3000`                | Canonical origin                   |
| `NEXT_PUBLIC_SOLANA_CLUSTER`    | `devnet`                               | `devnet`/`testnet`/`mainnet-beta`/`localnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL`    | `https://api.devnet.solana.com`        | Custom RPC per environment         |
| `NEXT_PUBLIC_SOLANA_WS_URL`     | (derived from RPC URL)                 | Override only when needed          |
| `NEXT_PUBLIC_PAWKET_PROGRAM_ID`| `FQwe9…Sef` (devnet program)           | Do not change without a deploy plan|
| `SOLANA_RPC_API_KEY`            | (empty)                                | Server-only, reserved for future   |

## Validation

`src/config/env.ts` parses `process.env` through Zod with devnet-first
defaults. `getPublicEnv()` is cached and safe in client code;
`getServerEnv()` must only be called in server code. Invalid values fail fast
at startup, not mid-transaction.

## Security rules

- Private keys, seed phrases, and signing credentials must never exist in env
  or in the repo. Wallets sign; the app never holds keys.
- Nothing sensitive reaches the client bundle: grep for `NEXT_PUBLIC_` in
  review if a secret is ever added nearby.
