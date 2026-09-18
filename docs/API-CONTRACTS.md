# Pawket — API Contracts

**Status:** SPEC (E04+). `/api/health` is the only built handler — copy its shape (NextResponse.json, no wallet, public env only). All new handlers follow this file; Zod schemas live next to handlers (`route.schema.ts`) and are unit-tested.

## 1. Conventions (normative)

- **Envelope:** success `{ data, meta: { indexedAt?, lagSlots?, slot? } }`; error `{ error: { code, message, details? } }`. One-sentence `message` suitable for UI; `code` is `SNAKE_CASE` for client branching.
- **Validation:** Zod `safeParse` at handler top; 400 with field errors; never throw raw Zod errors to client.
- **Auth:** reads are public; writes require wallet-signature session (SIWS-style) or server multisig role. Guest writes are local-only (no API).
- **Pagination:** `?cursor=&limit=` (default 20, max 100) → `{ data:[], page: { nextCursor, hasMore } }`.
- **Freshness:** any chain-derived response includes `indexedAt` (ISO) + `lagSlots` once indexer exists; pre-indexer, `source:"rpc-live"`.
- **Idempotency:** order/quote intents accept `Idempotency-Key` header; retries with same key return original.
- **No custody:** handlers never accept seed phrases/private keys; signature verification only.

```ts
// shared sketch — src/server/api/envelope.ts [FUTURE]
type Success<T> = { data: T; meta?: { indexedAt?: string; lagSlots?: number; slot?: number; source?: "rpc-live"|"indexer" } };
type Failure = { error: { code: string; message: string; details?: Record<string,string[]> } };
```

## 2. Pets (E01 read-through; DB cache from E04)

```text
GET /api/pets?owner=<address>&cursor=&limit=
→ { data: Pet[], page, meta:{indexedAt, lagSlots} }
  400 INVALID_OWNER on bad address (use parseAddress server-side)

GET /api/pets/:address
→ { data: Pet, meta } | 404 PET_NOT_FOUND | 400 INVALID_ADDRESS
```

`Pet` shape = `DOMAIN-MODEL.md` §3 (stats 0–100 ints, xp int, level int, mood enum, freshness).

## 3. Marketplace (E05)

```text
GET /api/marketplace/listings?kind=&species=&cursor=&limit=
→ { data: Listing[], page }  // priceLamports as STRING (bigint-safe JSON)

POST /api/marketplace/orders
body: { listingId: string, buyerWallet: string, idempotencyKey?: string }
→ 201 { data: OrderIntent { orderId, priceLamports: string, feeLamports: string, totalLamports: string, expiresAt } }
  400 LISTING_UNAVAILABLE | 409 ORDER_EXISTS (same idempotency key → return original)
  // Client then signs chain tx (adopt) and calls confirm:

POST /api/marketplace/orders/:id/confirm
body: { signature: string }
→ { data: Order { status:"confirmed"|"unknown"|"failed", signature, slot?, explorerUrl } }
  // unknown = timeout; client shows lookup CTA, polls GET below.

GET /api/marketplace/orders/:id → receipt (order + listing snapshot + signature/slot/explorerUrl)
```

Price math is server-canonical (feeBps applied with integer lamports, remainder to treasury). Client never computes totals.

## 4. Guilds (E07) + eligibility (E10)

```text
GET /api/guilds → approved/live only [{ slug, name, purpose, memberCount, badgeIds, status }]
GET /api/guilds/:slug → { guild, policy:{utilityStatement, policyUrl, admins, treasuryWallets}, stats, launchSummary? }
POST /api/guilds/apply (rate-limited 3/day/IP)
body: { name, purpose, admins[], utilityStatement, moderationPlan, allocationPlan, treasuryPolicy, requestedPresetId }
→ 202 { data: { applicationId, status:"in-review" } }
POST /api/guilds/:slug/join | /leave (session) → membership
GET /api/guilds/:slug/eligibility?wallet=<address>
→ { data: { isMember, tokenBalance: string, benefits: Array<{ id, kind:"badge"|"cosmetic"|"event-access"|"vote", label }> }, meta }
  // CONTRACT: benefits contain NO stat/xp/matchmaking/power fields. Test asserts key absence.
```

## 5. Launches + quotes (E08–E10, M6 only)

```text
GET /api/guilds/:slug/launch → { data: LaunchState, meta }
type LaunchState =
 | { stage:"dbc-active", mint, dbcPool, progressPct, quoteAsset, fees, graduationThreshold, disclosuresUrl }
 | { stage:"migration-pending", mint, message, expectedNote }
 | { stage:"dammv2-active", mint, dammv2Pool, verifiedSlot }
 | { stage:"ended", reason, configRef } | { stage:"suspended", banner }

GET /api/guilds/:slug/quotes?side=buy|sell&amountLamports=<string>&slippageBps=<int>
→ { data: { route:"dbc"|"dammv2", estimatedOut: string, priceImpactBps: number, feeLamports: string, minOut: string, quotedAt, expiresAt } }
  409 ROUTE_PAUSED during migration-pending (client must block sends)
  400 INVALID_AMOUNT | UNSUPPORTED_ROUTE (unverified pool never quoted)

GET /api/tx/:signature → { data: { status:"confirmed"|"failed"|"unknown", slot?, explorerUrl } }
GET /api/indexer/status → { data: { lagSlots, lastVerifiedSlot, indexedAt, healthy: boolean } }
GET /api/treasury/:slug → { data: { wallets, signers, threshold, events: TreasuryEvent[], balanceLamports } }
```

Quotes are indicative + expire (≤15s); tx uses frozen quote; slippage enforced at send; failures surface program logs without masking uncertainty.

## 6. Errors (catalog — extend, don't rename)

| Code | When | HTTP |
| --- | --- | --- |
| `INVALID_OWNER/ADDRESS/AMOUNT` | Zod/address parse fail | 400 |
| `LISTING_UNAVAILABLE` | sold/expired/delisted | 400 |
| `ROUTE_PAUSED` | migration-pending or suspended | 409 |
| `PET_NOT_FOUND` | unknown PDA | 404 |
| `RATE_LIMITED` | abuse guard | 429 |
| `TX_UNKNOWN` | confirm timeout — lookup, don't claim failure | 200 (`status:unknown`) |

## 7. Agent checklist (per handler)

1. `.env.example` first if new env is needed; `server-env.ts` for secrets.
2. `route.schema.ts` with Zod + colocated `route.schema.test.ts` (rejects bad input with exact codes).
3. Handler is thin: parse → authZ → service (`src/server/*`) → envelope. No game math, no PDA bytes, no Meteora params inline.
4. Pagination + idempotency + freshness meta included where applicable.
5. `pnpm verify` + contract test green before wiring UI.
