# Pawket — Target Architecture

**Status:** SPEC (target), written before program v2. The left column below is the M0 foundation as it was then, not the product now: `docs/ARCHITECTURE.md` is what is built, and wins wherever the two disagree.

## 1. Current vs target

```text
M0 FOUNDATION (2026-09, historical)        TARGET (M3–M6, planned)
─────────────────                          ──────────────────────
Next.js 16 App Router, React 19, TS strict (same, keep)
Tailwind v4, no component lib              (same until product UI demands one)
Kit v8 + walletSigner + solanaRpc          (same; add Meteora SDKs server-side)
Single browser client singleton            (same; add read-only RPC client for server)
No DB, no API beyond /api/health           [FUTURE] Postgres + Prisma, session + registry APIs
Chain reads: none in UI (SOL send only)    [FUTURE] PDA reads + indexer cache with lag flag
Sends: SOL transfer only                   [FUTURE] adopt/care + fixed-price buys + DBC/DAMM swaps
```

One app, not a monorepo — unchanged until a second deployable or generated program client forces a split (per `DECISIONS.md`).

## 2. Boundaries (target)

```txt
app/                               routes, layouts, route handlers (Server by default)
  (marketing)/page.tsx             landing, no wallet required
  (game)/home/                     Home space (E02)
  (game)/adopt/                    adoption flow (E01/E05)
  (game)/pet/[address]/            pet detail, care, customize (E01/E03)
  (game)/inventory/                collection hub (E03)
  (game)/marketplace/              browse/detail/checkout/receipts (E05)
  (game)/playground/               games + daily goals (E06)
  (game)/guilds/ + [slug]/         discovery + profile + events + treasury (E07/E08/E09)
  api/                             REST handlers, Zod-validated (E04+)
src/components/                    UI; "use client" only at interactive leaves
  pet/                             adopt-form, care-panel, pet-avatar, passport-timeline
  wallet/                          (exists) connection, balance, send flows
  marketplace/                     [FUTURE] listing-card, checkout-sheet, receipt-view
  guilds/                          [FUTURE] guild-card, launch-progress, quote-ticket, risk-disclosure
  transaction-status.tsx           (exists) THE tx-status surface every flow uses — extend, don't fork
  network-badge.tsx                (exists) cluster/program readout — extend with indexer lag dot
src/config/                        env + site constants (sources of truth stay here)
src/lib/game/                      pure companion math (no React, no Solana) — token code NEVER imports power from here
src/lib/solana/                    cluster, client, PDAs, instructions, tx lifecycle (Kit v8 only)
src/lib/meteora/                   [FUTURE] DBC/DAMM presets, quote types, state machine (no raw curve math in components)
src/lib/guilds/                    [FUTURE] eligibility pure helpers (cosmetic/social only — type-level ban on power fields)
src/server/                        [FUTURE] db client, auth, indexer, registry services (imports server-only)
data/                              [FUTURE] static catalogs (cosmetics.json) before DB seeding
e2e/                               Playwright smoke (shell + route presence, never signing)
```

## 3. Data flow (normative)

- **Server Components** render shell + public config + SEO-critical guild/marketplace content. Never hold wallets.
- **One browser client** (`browser-client.ts`) owns RPC + wallet state, published via `ClientProvider`. Leaves read via `useClient<AppClient>()` + `useWallets/useConnectedWallet/useRequest`.
- **Reads:** Server Components use a **read-only RPC client** (no wallet plugin) or the **indexer cache** (`/api/*`) with `indexedAt` + `lagSlots` surfaced; wallet leaves use `useRequest` for live balances. Chain is source of truth for ownership/progression; DB is cache + social graph.
- **Sends:** `client.sendTransaction([ix])` with preflight on → confirm (`confirmed`, 30s timeout → unknown-not-failed) → reload from source of truth → signature + Explorer link. No optimistic adopt/care/balance patches. Meteora swaps follow the same lifecycle with quote frozen at sign time (see `METEORA-INTEGRATION.md`).
- **No second client, no global store, no giant utils.** Meteora quote helpers are pure + server-assisted, not a parallel tx stack.

```text
[Browser leaf] → validate → PDA/preset → build ix (instructions.ts / meteora/) → simulate
  → wallet sign → send → confirm (30s) → reload (RPC/indexer) → TransactionStatus + Explorer link
[Server route] → Zod parse → authZ (session/wallet) → Prisma → indexer reconcile → JSON envelope
[Indexer job] → RPC polling → verify (migration/pool/treasury) → DB cache + lag metric
```

## 4. Client/server rules (extensions to ARCHITECTURE.md)

- Secrets: anything without `NEXT_PUBLIC_` never crosses into `"use client"`. `getServerEnv()` stays server-only. New secrets (`DATABASE_URL`, `RPC_API_KEY`, `INDEXER_TOKEN`) go in `server-env.ts` + `.env.example` first (E04).
- Public config (`getPublicEnv()`) gains only: `indexerUrl` (optional override), `featureFlags` (guilds, launches — devnet-gated). Never secrets, never mainnet promotion.
- `"use client"` only at interactive leaves. Never fetch in `useEffect` what a Server Component or `useRequest` can own. Quote tickets poll via `useRequest`, not manual effects.
- Honest UI: loading / lag / pending-migration states are first-class; stale-indexed data shows "as of slot N · Xs ago" and blocks route-dependent sends.

## 5. Tech choices (locked unless OPEN-QUESTIONS says otherwise)

| Decision | Choice | Why |
| --- | --- | --- |
| Chain SDK | Kit v8 + plugins + `@solana-program/*` | Maintained path; web3.js/wallet-adapter legacy, banned |
| NFTs | **Proposed:** Metaplex Core (see Q1) | Single-asset model fits pets + cosmetics; low rent; links to PDA via `petMint` field |
| DB | **Proposed:** Postgres + Prisma (see Q2) | Registry + listings + votes need relations; introduced at M3, not earlier |
| Indexer | **Proposed:** custom RPC poller → DB cache (see Q4) | Full control over migration verification + lag signal; Helius webhooks later |
| Meteora | DBC SDK + DAMM v2 SDK, server-assisted quotes | Never hand-roll curves; constrained presets only |
| Styling | Tailwind v4, no component lib yet | Matches foundation; add only on product-UI demand |
| Tests | Vitest colocated + Playwright smoke | Locked values = breaking-change alarms, not test fixes |

## 6. What agents must not do

- No second Solana client, no second tx-status component, no second env store.
- No hand-rolled instruction bytes / discriminator invention in components (use `instructions.ts`).
- No token-balance → game-power data flow (enforced by type + review checklist in `AGENT-GUIDE.md`).
- No program ID / seed / discriminator changes without human ask + deploy plan.
- No mainnet targeting in code; cluster from env, devnet default.
