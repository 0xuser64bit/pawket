# Environment

`.env.example` lists application runtime variables. `src/config/env.ts`
validates public values; `src/config/server-env.ts` validates server values.
The program ID is a source constant held to the IDL, not an environment option.

## Runtime variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Canonical page and metadata origin; must be an http(s) origin, and https (not localhost) on a Vercel production build, because keepsake and coin metadata URIs carry it onto Solana |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet`, `testnet`, `mainnet-beta` or `localnet`; mainnet remains separately gated |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public devnet RPC | Browser-safe endpoint; `/api/rpc` uses Pawket's allow-listed proxy |
| `SOLANA_RPC_URL` | Public endpoint for the selected cluster when the browser uses `/api/rpc`; otherwise the public RPC value | Server RPC; may contain a provider credential |
| `SPONSOR_KEYPAIR` | Unset | Server-only devnet fee/rent sponsor JSON byte array |

Use `NEXT_PUBLIC_SOLANA_RPC_URL=/api/rpc` with `SOLANA_RPC_URL` for a provider
endpoint whose credentials must stay on the server. Direct browser RPC accepts
only the public Solana hosts or loopback endpoints, without credentials, query
parameters, fragments or paths. Custom providers always use the proxy; keys can
appear in a hostname or path as well as a query. Prefixing a secret with `NEXT_PUBLIC_` exposes
it to the browser build and is prohibited.

Public values are embedded during the Next.js build. Change deployment
configuration and rebuild to change them. `getPublicEnv()` caches validated
values; server config is accessed only through `getServerEnv()`. `server-only`
prevents a client import of privileged modules.

## Sponsorship

An unset key disables sponsorship. A linked device then pays eligible app
fees from its Pawket Wallet float, so the wallet must hold SOL; rent-bearing
actions wait for sponsorship.
Mainnet sponsorship is disabled. The sponsor signs only approved Pawket roles
and pays for keepsakes (`src/server/keepsake.ts`),
never acts as program upgrade authority, and is not the treasury.

Two optional server-only keys take over jobs the sponsor key otherwise does.
`DERIVATION_SECRET` (64 hex characters) is what keepsake and coin addresses
are derived from (`src/server/derive.ts`); unset, it is the sponsor key's first
32 bytes, which every address so far came from. Set it to that seed before the
sponsor ever rotates, back it up like the sponsor key, and never change it once
set: every derived address would move. `COLLECTION_AUTHORITY_KEYPAIR` (a
keypair's JSON array) signs keepsakes as the collection's authority; unset, the
sponsor does. Move the collection's update authority on chain to that key
before setting it. Keep server keys out of logs, source, client bundles and APKs:
a malformed keypair is refused by its variable's name alone (`keypairBytes` in
`src/config/server-env.ts`), because a JSON parser's own error quotes its input.
Operational scripts document their own local key inputs; do not put a player's
wallet secret in an application environment variable.

## Devnet test keys

The opt-in devnet suites fund their test wallets from `PAWKET_TEST_FUNDER` (a
keypair's JSON array) or `.keys/test-funder.json`; make one with
`solana-keygen new -o .keys/test-funder.json` and fund it from a devnet faucet.
They refuse a funder that is the sponsor, and never use the deploy wallet.
Their sponsored actions still spend the sponsor's float, because the sponsor
signs as the keepsake collection's authority unless
`COLLECTION_AUTHORITY_KEYPAIR` is set, so each run first requires the
sponsor to hold at least 2 SOL (`e2e/devnet.ts`).

## Origins

Production uses `NEXT_PUBLIC_APP_URL=https://pawket.world`. Local development
uses localhost. Android's start URL is checked against the official origin by
`src/lib/native/assetlinks.test.ts`.

The `dev` branch uses a branch-specific Vercel Preview value of
`NEXT_PUBLIC_APP_URL=https://dev.pawket.world`; production values stay scoped
to Production. Its public RPC and cluster are devnet, with no preview sponsor
key configured. See `DEVELOPMENT.md` for the release workflow.

`www.pawket.world` redirects to the apex with paths and queries preserved.
Keep `pawket-pets.vercel.app` serving older APKs and metadata URIs; redirecting
it away breaks their trusted origin. Local pets, settings and non-extractable
device keys are origin-scoped and cannot be copied between domains. Chain pets
return when the same wallet connects; a device needs a new approved link.
