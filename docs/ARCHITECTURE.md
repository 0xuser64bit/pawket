# Architecture

Pawket is one Next.js App Router application with an Anchor program and an
Android shell. React/TypeScript owns interactive leaves; server routes own
privileged reads and transaction preparation. `package.json` and the native
build files own dependency versions.

## Boundaries

| Directory | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, metadata and APIs; Server Components by default |
| `src/components/pk/` | Shared design system |
| `src/components/` | Product screens and interactive controls |
| `src/components/room3d/` | Lazy-loaded room renderer for Home, Profile and visits; no record writes |
| `src/config/` | Validated public/server environment, site configuration and room themes |
| `src/lib/game/` | Pure care math, enums, stickers and lockstep fixture |
| `src/lib/guest/` | Local companion record, migrations and storage |
| `src/lib/companion/` | Connected wallet's chain pets, local pets and the active selection |
| `src/lib/player/`, `closet/`, `market/` | Player look, cosmetic catalog and chain closet reads |
| `src/lib/play/`, `room/` | Seeded solo games, local bests, sounds, moments and emotes |
| `src/lib/guilds/`, `coins/` | Pure rules, presets, stages, disclosures and delisting |
| `src/lib/solana/` | IDL/constants, PDAs, instruction builders, account decoding, clients and shared send path |
| `src/lib/wallet/` | Device key, wallet state, setup and chain history |
| `src/lib/native/` | Page-side Android bridge, inert in a browser |
| `src/server/` | Server-only chain reads, shared scan caches, sponsorship, keepsakes and coin preparation |
| `programs/pawket/` | Authoritative chain rules and LiteSVM tests |
| `android/` | Origin-locked WebView, native capabilities and release configuration |
| `scripts/3d/`, `assets/`, `public/3d/` | Source assets, reproducible build and generated room assets |
| `e2e/` | Browser tests and test-only wallet tooling |

`ROUTES.md` maps pages and APIs. [AGENTS.md](../AGENTS.md) maps individual facts to their
source files; do not add another store of those facts.

## Persistence and reads

Local pets live in the `pawket.pets.v1` list. The former single-pet record is
migrated only after the new list is written successfully. Player settings,
looks, best scores and active pet selection also stay on the device, scoped
to the origin. `useSyncExternalStore` provides cached snapshots and storage
change notifications. Android uses its own WebView storage.

Solana pets live in Pet and Passport PDAs, with related guild and wallet
accounts. Browser reads use the shared RPC and `useRequest`; server pages use
`src/server/solana.ts`. `toCompanionRecord` maps chain state into the record
shape used for local care projections and presentation. `useCompanion` combines
the wallet's pets and local pets, then resolves the device's active selection.

Large public scans have bounded caches: pet/guild scans share eight seconds
within a process and twenty seconds through Next's Data Cache; Pulse caches
its measurements for thirty seconds. Failed reads are not cached as successful
records. Cached discovery counts are chain-derived snapshots, not immediate
transaction receipts. Confirmation refreshes use the relevant source read.
There is no database, indexer or background worker.

## Writes

Local care and rounds use pure game/guest functions, then save the changed
pet. Storage failure must be visible. Keeping a local pet on Solana creates
a new chain pet; it does not import local progression.

App sends use `usePawketSend` and `send.ts`. A linked, funded Pawket Wallet is
required for app actions. Non-money instructions become program-checked device
twins; owner approval remains mandatory for wallet management and spending.
The sponsor signs eligible devnet transactions first. The client verifies the
message, sends with preflight, waits for confirmation, then reloads the record.
Unknown outcomes retain the existing signature. No optimistic chain care or
replacement send is permitted. `SOLANA.md` describes the owner-approved Actions
flow and prepared coin/keepsake transactions.

The room draws saved or confirmed moments and never mutates a record. Its
renderer and assets load only when a room needs them; flat rendering provides
fallback and the player's explicit alternative.

## Privileged boundaries

`getServerEnv()` and server modules import `server-only`. Public env is safe
on both sides; provider secrets stay on the server. The sponsor's allow-list is
pure and tested separately from its key and float. Meteora's SDKs, web3.js v1
and Anchor clients stay in `src/server/coins/` and operational scripts; lint
enforces that boundary. Android's bridge never carries keys or transactions.
