# Pawket — Meteora Integration (DBC → DAMM v2)

**Status:** SPEC (M6). No Meteora code exists today. This is the highest-risk surface (real money, third-party protocol, irreversible txs) — agents implement exactly this shape, no improvisation. DLMM is **deferred** (see §6).

Recommended lifecycle (product truth):

```text
Approved guild → DBC launch → participation → graduation threshold → DAMM v2 liquidity → ongoing utility
```

Players never need to understand the pool transition; the app presents one continuous guild experience with three explicit routing states.

## 1. Design constraints (normative)

1. **Constrained presets only.** Creators pick 1 of 2–3 reviewed DBC presets (`lib/meteora/presets.ts`); raw curve/fee/threshold editing is banned in v1.
2. **Quote asset SOL or USDC only** v1. No custom quotes.
3. **Server-assisted quotes** (`GET /api/guilds/:slug/quotes`) via DBC/DAMM SDKs; client never computes curves. Quotes expire ≤15s; tx freezes the quote at sign.
4. **Simulate first, preflight on.** Failing simulation blocks send; surface program logs plainly.
5. **Explicit sign per swap.** No auto-trading, no recurring buys, no "approve all".
6. **Verified routing only.** DAMM v2 route activates after the indexer verifies mint + pool + migration tx (see `INDEXER.md`). Unverified pools are never quoted or sent to.
7. **Full disclosure pre-sign.** Supply, allocation, vesting, fees, curve, threshold, pool destination, risk acknowledgment — all visible before the wallet opens.

## 2. Preset registry (spec)

```ts
// src/lib/meteora/presets.ts [FUTURE] — values illustrative, finalized at legal/ops review
interface DbcPreset {
  presetId: "pawket-standard-sol" | "pawket-standard-usdc" | "pawket-small-creator";
  quoteMint: "SOL" | "USDC";
  curve: { segments: Array<{ supplyThreshold: string; priceNote: string }>; graduationThreshold: string };
  fees: { launchBps: number; tradingBps: number; creatorShareBps: number; treasuryShareBps: number };
  graduation: { threshold: string; migrationDest: "dammv2-fullrange-compounding" };
  limits?: { maxBuyLamports?: string; maxTxPerWallet?: number }; // where DBC supports it
  dammv2: { strategy: "fullrange-compounding"; lockTerms: string; feeRecipientPolicy: string };
}
```

- Each preset has a human-readable card (who it's for, example price path in plain language, fee example on 1 SOL) + machine config hash. Launch pages pin the hash; any config change = new hash + republication.
- `LaunchConfig` row (see `DOMAIN-MODEL.md`) stores `presetId + mint + dbcPool + dammv2Pool + lifecycleStatus + publishedAt`. Unpublished = `noindex`, unquotable.

## 3. DBC launch phase (client + server)

**Server:** quote via DBC SDK (`amountIn → estimatedOut, priceImpactBps, feeLamports, minOut(slippage)`); validate preset match + wallet limits + route liveness; return expiring quote.
**Client (`quote-ticket.tsx`):** side toggle (buy/sell where supported) → amount input → quote display (estimated out, impact, fees, min-received, expiry countdown) → risk checkbox (first buy per guild, persisted) → Sign CTA (disabled while quoting/sending/stale) → `sendTransaction` → `TransactionStatus` + Explorer link.
**Progress display:** raised vs threshold as **community info** ("412 / 800 SOL to graduation"), never value language ("going to the moon" banned; see copy list in `SAFETY-ECONOMY.md`).

## 4. Migration & DAMM v2 phase (three-state router)

```ts
type LaunchStage = "dbc-active" | "migration-pending" | "dammv2-active" | "ended" | "suspended";
```

| Stage | Quotes | Sends | UI |
| --- | --- | --- | --- |
| `dbc-active` | DBC SDK | DBC route | progress + buy/sell ticket |
| `migration-pending` | **409 ROUTE_PAUSED** | **blocked** | banner "Migration in progress — trading paused. Your tokens are unaffected." + auto-refresh on verification |
| `dammv2-active` | DAMM v2 SDK (verified pool only) | DAMM v2 route | "Active liquidity" badge + same ticket, route label shown |
| `ended` | none | blocked | per-config outcome (no implied refund) |
| `suspended` | none | blocked | policy banner, factual record kept |

- Prefer **full-range compounding** DAMM v2 config v1 (minimizes active management vs concentrated bins).
- Pre-launch publication must name: position owner, lock/vest terms, fee recipients, withdrawal conditions. Post-migration, position + first fee accruals are indexed before "active" shows.

## 5. Failure handling (extends SAFETY-ECONOMY.md table)

- **Indexing lags graduation:** force `migration-pending`, pause route UI, reconcile on verified slot, then activate. Never send to the stale DBC route "because the button was already open" — quotes expire and the router re-checks stage at sign time.
- **Client timeout after confirm:** `unknown` + signature lookup + poll `GET /api/tx/:signature`; never "failed".
- **Pool init fails:** incident state, no route attempts, audit trail, prepublished recovery.
- **Bot/concentration spike:** review + configured limits; no improvised price intervention.

## 6. DLMM: later, not launch scope

DLMM (concentrated bins, dynamic fees) fits future treasury-managed liquidity **only** with a named operator + rebalancing runbook + monitoring. Gating criteria: DBC→DAMM v2 stable across ≥2 launches, operator assigned, treasury policy amended, human approval. Agents: do not add DLMM SDKs, routes, or UI in M6.

## 7. Files agents create (E08–E10)

```text
src/lib/meteora/presets.ts + presets.test.ts      // preset registry, fee math exact, unknown preset rejected
src/lib/meteora/launch-state.ts + .test.ts        // stage machine (5 states + lag case)
src/components/guilds/quote-ticket.tsx            // quote → disclose → sign → status (uses TransactionStatus)
src/components/guilds/launch-progress.tsx         // community-info progress, no value language
src/components/guilds/risk-disclosure.tsx         // first-buy gate, accessible afterward
src/server/meteora/quotes.ts                      // SDK-backed quoting (no secrets to client)
src/server/indexer/migration.ts                   // verification job (see INDEXER.md)
```

SDK/API choices + RPC/indexer provider finalize in Q3/Q4 before code (see `OPEN-QUESTIONS.md`).

## 8. Agent DoD (E08/E09)

- Devnet pilot: buy → Explorer link; migration drill (simulated lag) shows pending, blocks sends, activates on verification.
- Unit tests mock SDKs (no network in Vitest); quote-render + stage-machine + preset-validation tests green.
- Copy audit passes banned-phrase grep (see `AGENT-GUIDE.md`).
- No raw curve math in components (review grep: `curve|bonding|slope` outside `lib/meteora/` fails).
