# Environment

`.env.example` lists application runtime variables. `src/config/env.ts`
validates public values; `src/config/server-env.ts` reads trimmed server values.
Key bytes and derivation-secret format are checked by their consumers; this
reader does not itself validate the server RPC's URL or cluster.
The program ID is a source constant held to the IDL, not an environment option.

For local setup, use [DEVELOPMENT.md](DEVELOPMENT.md). For a private RPC,
configure the proxy as described below. Before rotating keys, read
[Sponsorship](#sponsorship) and [SECURITY.md](SECURITY.md#verification-and-incident-handling).
Mainnet requires [MAINNET.md](MAINNET.md), not just new env values.

## Runtime variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Canonical page and metadata origin; must be an http(s) origin, and https (not localhost) on a Vercel production build, because keepsake and coin metadata URIs carry it onto Solana |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet`, `testnet`, `mainnet-beta` or `localnet`; mainnet remains separately gated |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Public devnet RPC | Browser-safe endpoint; `/api/rpc` uses Pawket's allow-listed proxy |
| `SOLANA_RPC_URL` | Public endpoint for the selected cluster when the browser uses `/api/rpc`; otherwise the public RPC value | Server RPC; may contain a provider credential |
| `SPONSOR_KEYPAIR` | Unset | Server-only devnet fee/rent sponsor JSON byte array |
| `DERIVATION_SECRET` | First 32 bytes of `SPONSOR_KEYPAIR`, when present | Server-only 32-byte secret as 64 hex characters; derives keepsake and coin signers. Without either value, derived reads/creation are unavailable |
| `COLLECTION_AUTHORITY_KEYPAIR` | `SPONSOR_KEYPAIR` | Server-only collection authority JSON array of 64 bytes; does not replace the sponsor as fee/rent payer |

Use `NEXT_PUBLIC_SOLANA_RPC_URL=/api/rpc` with `SOLANA_RPC_URL` for a provider
endpoint whose credentials must stay on the server. Direct browser RPC accepts
only the public Solana hosts or loopback endpoints, without credentials, query
parameters, fragments or paths. Custom providers always use the proxy; keys can
appear in a hostname or path as well as a query. Prefixing a secret with `NEXT_PUBLIC_` exposes
it to the browser build and is prohibited.

The direct public RPC default is devnet even if another cluster is selected;
set both public cluster and RPC together. The validator rejects a known public
Solana host for the wrong cluster, but cannot verify a custom server endpoint's
chain. With `/api/rpc`, an unset `SOLANA_RPC_URL` falls back to the selected
cluster's public URL. Verify the custom provider's genesis before using it;
do not assume matching UI copy proves the server reached the intended chain.

Public values are embedded during the Next.js build. Change deployment
configuration and rebuild to change them. `getPublicEnv()` caches validated
values; server config is accessed only through `getServerEnv()`. `server-only`
prevents a client import of privileged modules.

## Sponsorship

An unset key disables sponsorship. A linked device then pays eligible app
fees from its device float, replenished in bounded amounts from Pawket Wallet,
so the wallet must hold SOL and the device must already be able to pay the fee.
Device-routed rent-bearing actions wait for sponsorship; owner-approved Market
purchases use their own payer path ([MARKETPLACE.md](MARKETPLACE.md)).
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
Their sponsored actions still spend the sponsor's float for fees and rent.
The sponsor also signs as the keepsake collection's authority unless
`COLLECTION_AUTHORITY_KEYPAIR` is set. The shared `e2e/devnet.ts` helper
requires the sponsor to hold at least 2 SOL before a run; a separate collection
authority does not waive that float guard.

## Operational script inputs

Runtime variables are not interchangeable with operator key-file paths.
`scripts/vercel-env.sh` writes **Production** Vercel values, sets the cluster to
devnet and reads `.keys/sponsor.json`; it does not configure the `dev` branch's
Preview environment. It is a deployment mutation, not a setup check. Optional
server RPC, derivation and collection-authority values are written only when
provided; omission does not remove an existing remote value.

Coin scripts use `PAYER`, `PAYER_KEYPAIR` or `TREASURY_KEYPAIR` as local file
paths, not JSON arrays; see
[METEORA-INTEGRATION.md](METEORA-INTEGRATION.md#sources-and-operational-tools).
The graduation keeper reads `KEEPER_KEYPAIR` (a local file path),
`EXECUTE=1`, `MAX_GRADUATIONS` and an optional `KEEPER_WEBHOOK_URL` from the
operator's environment. They configure that script only; they are not
application runtime variables and are not read by `getServerEnv()`. The keeper
key must not be the sponsor, treasury or upgrade authority.
`scripts/keepsake-collection.mts` reads `.keys/sponsor.json`, checks devnet
genesis and creates a new collection; it neither updates the source collection
constant nor migrates an existing collection's authority. No script here is
permission to create accounts, rotate keys or change deployment settings.

## Origins

Production uses `NEXT_PUBLIC_APP_URL=https://pawket.world`. Local development
uses localhost. Android's start URL is checked against the official origin by
`src/lib/native/assetlinks.test.ts`.

Configure `dev` with a branch-specific Vercel Preview value of
`NEXT_PUBLIC_APP_URL=https://dev.pawket.world`; keep production values scoped
to Production. Its intended RPC and cluster are devnet, with no preview sponsor
key. These are deployment settings to verify in Vercel, not values enforced by
the checkout or `vercel-env.sh`. See `DEVELOPMENT.md` for the release workflow.

`www.pawket.world` redirects to the apex with paths and queries preserved.
Keep `pawket-pets.vercel.app` serving older APKs and metadata URIs; redirecting
it away breaks their trusted origin. Local pets, settings and non-extractable
device keys are origin-scoped and cannot be copied between domains. Chain pets
return when the same wallet connects; a device needs a new approved link.
