# Environment

`.env.example` lists application runtime variables. `src/config/env.ts`
validates public values; `src/config/server-env.ts` validates server values.
The program ID is a source constant held to the IDL, not an environment option.

## Runtime variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Canonical page and metadata origin |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet`, `testnet`, `mainnet-beta` or `localnet`; mainnet remains separately gated |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public devnet RPC | Browser-safe endpoint; `/api/rpc` uses Pawket's allow-listed proxy |
| `SOLANA_RPC_URL` | Public endpoint for the selected cluster when the browser uses `/api/rpc`; otherwise the public RPC value | Server RPC; may contain a provider credential |
| `SPONSOR_KEYPAIR` | Unset | Server-only devnet fee/rent sponsor JSON byte array |

Use `NEXT_PUBLIC_SOLANA_RPC_URL=/api/rpc` with `SOLANA_RPC_URL` for a provider
endpoint whose credentials must stay on the server. The public env parser
refuses credential-bearing URLs. Prefixing a secret with `NEXT_PUBLIC_` exposes
it to the browser build and is prohibited.

Public values are embedded during the Next.js build. Change deployment
configuration and rebuild to change them. `getPublicEnv()` caches validated
values; server config is accessed only through `getServerEnv()`. `server-only`
prevents a client import of privileged modules.

## Sponsorship

An unset key disables sponsorship. A linked, funded device pays eligible app
fees from its Pawket Wallet float; rent-bearing actions wait for sponsorship.
Mainnet sponsorship is disabled. The sponsor signs only approved Pawket roles,
never acts as program upgrade authority, and is not the treasury.

The same secret currently derives keepsake and coin addresses and authorizes
the keepsake collection. Rotating it is not a routine safe configuration
change: Q10 in `OPEN-QUESTIONS.md` must be resolved to preserve those addresses
and authorities. Keep server keys out of logs, source, client bundles and APKs.
Operational scripts document their own local key inputs; do not put a player's
wallet secret in an application environment variable.

## Origins

Production uses `NEXT_PUBLIC_APP_URL=https://pawket.world`. Local development
uses localhost. Android's start URL is checked against the official origin by
`src/lib/native/assetlinks.test.ts`.

`www.pawket.world` redirects to the apex with paths and queries preserved.
Keep `pawket-pets.vercel.app` serving older APKs and metadata URIs; redirecting
it away breaks their trusted origin. Local pets, settings and non-extractable
device keys are origin-scoped and cannot be copied between domains. Chain pets
return when the same wallet connects; a device needs a new approved link.
