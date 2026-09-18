# Pawket — Indexer, Tx-Status & Eligibility Services

**Status:** SPEC (E10, M6; read-only status pieces usable from M3). Until this ships, UI labels chain reads "live RPC read" and timeouts "unknown — check signature". After it ships, every chain-derived view carries `indexedAt + lagSlots`.

## 1. Why an indexer

RPC reads are truthful but slow/unshaped for: launch stage, migration verification, holder concentration, liquidity/fees, vesting unlocks, treasury flows. The indexer polls → verifies → caches into Postgres so the app can block stale-route sends and show freshness honestly. Provider decision: Q4 (recommendation: custom RPC poller first, Helius webhooks later).

## 2. Scope (tables fed)

| Job | Reads | Writes | Cadence |
| --- | --- | --- | --- |
| `launch-state` | DBC progress, threshold, migration tx, DAMM v2 pool + position | `LaunchConfig.lifecycleStatus`, `dammv2Pool`, verified slot | 10–30s (5s during migration window) |
| `balances` | guild-token holders, concentration, team/vesting wallets | holder snapshots + concentration metrics | 1–5 min |
| `liquidity-fees` | pool reserves, fees accrued, withdrawals | pool snapshots | 1–5 min |
| `treasury` | multisig wallet signatures/slots/memos | `TreasuryEvent` rows | 30–60s |
| `pets` | Pet/Passport accounts by owner (until RPC-direct suffices) | `PetMeta` mirror + `indexedAt` | on-demand + 1 min sweep |

## 3. Verification rules (normative)

- **Migration activates DAMM v2 routing only when:** graduation tx confirmed + DAMM v2 pool address matches pre-published destination policy + pool mint == guild mint + initial liquidity present at verified slot. Any mismatch → incident state, no routing.
- **Lag signal:** `GET /api/indexer/status → { lagSlots, lastVerifiedSlot, indexedAt, healthy }`. `healthy = lagSlots < threshold (e.g., 50)`. Unhealthy → route-dependent sends blocked with "chain data delayed" copy; reads show staleness badge.
- **Backoff:** RPC errors → exponential backoff + jitter, alert after N consecutive failures; never hammer the RPC from clients (jobs run server-side only; clients poll `/api/*`).

## 4. Tx-status reconciliation

```text
client signs → sends → confirm(30s) → confirmed | failed | unknown(timeout)
unknown → show signature + "Look up" → GET /api/tx/:signature → poll until confirmed/failed (or manual Explorer link)
```

- Server checks signature status via RPC (confirmed/finalized), records slot, returns `explorerUrl` from `cluster.ts`. Client timeout never overwrites to "failed".
- All send UIs (adopt/care/checkout/swap) share this path via `TransactionStatus` + a `useTxStatus(signature)` hook [FUTURE].

## 5. Eligibility (cosmetic/social only)

Pure function of (chain balance at verified slot + DB membership/rules) → `benefits[]` (badge/cosmetic/event-access/vote-entry). Cached 30–60s with `evaluatedAt`. **Type-level ban:** the `Benefit` type has no power fields; adding `xpMultiplier|statBoost|priority|discountBps>cosmetic-scope` fails review. Evaluations logged for dispute review.

## 6. Analytics pipeline (feeds E12)

Three separated streams (game-health / market-health / safety) with distinct retention + access; PII minimal (wallet addresses hashed in analytics store; raw addresses only in operational tables). Event schemas versioned; unknown fields rejected in tests.

## 7. Ops

- Jobs are idempotent + single-flight (DB advisory lock or platform cron lock); overlapping runs skip, never double-write.
- Alerts: lag threshold, verification mismatch, consecutive RPC failures, concentration spike, authority change. Named owner + runbook link per alert (see `SAFETY-ECONOMY.md` §6).
- Local dev: jobs runnable on demand (`pnpm indexer:once`) against devnet with rate-limit guard; never against mainnet from code (env cluster only).

## 8. Agent DoD (E10)

- Kill-indexer drill documented + passing: UI degrades to pending/stale states, blocks sends, recovers without phantom changes.
- Tests: verification-match/mismatch, lag-block, timeout→unknown→confirmed reconciliation, eligibility shape (no power keys).
- `/api/indexer/status` + freshness meta on all chain-derived responses.
