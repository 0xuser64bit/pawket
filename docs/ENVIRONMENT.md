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
| `NEXT_PUBLIC_SOLANA_RPC_URL`    | `https://api.devnet.solana.com`        | The browser's RPC; `/api/rpc` routes browsers through Pawket's proxy to `SOLANA_RPC_URL` (allow-listed calls, Pawket's program only, rate-limited). Never a URL with a key — the app refuses one |
| `NEXT_PUBLIC_SOLANA_WS_URL`     | (derived from RPC URL)                 | Override only when needed          |
| `NEXT_PUBLIC_PAWKET_PROGRAM_ID`| `PawkHv…M74` (devnet program)          | Changes only with a program deploy |
| `SOLANA_RPC_URL`                | (the public RPC URL)                   | Server-only; may carry a provider key |
| `SPONSOR_KEYPAIR`               | (empty: players pay their own fees)    | Server-only; the devnet fee sponsor |

## Validation

`src/config/env.ts` parses `process.env` through Zod with devnet-first
defaults. `getPublicEnv()` is cached and safe in client code.
`src/config/server-env.ts` holds `getServerEnv()` and imports
`server-only`, so any client-side import fails the build instead of
leaking. Invalid values fail fast at startup, not mid-transaction.

## Security rules

- A player's keys never exist here: wallets sign, the app never asks for,
  holds or logs a seed phrase or a player's key.
- The one key the app holds is its own: `SPONSOR_KEYPAIR`, a devnet hot
  wallet with a small float that pays fees and rent. It is server-only, it
  is not the program's upgrade authority, and it signs only what
  `checkSponsorable` allows (Pawket instructions, itself as fee payer and
  rent payer only). Never commit it; `.keys/` and `*-keypair.json` are
  ignored.
- Nothing sensitive reaches the client bundle: grep for `NEXT_PUBLIC_` in
  review if a secret is ever added nearby.
