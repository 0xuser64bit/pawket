# Pawket — Meteora Integration (DBC → DAMM v2)

**Status:** BUILT on devnet (2026-10). A guild with three pets may launch one
optional coin on a Pawket preset; it trades on Meteora's Dynamic Bonding
Curve, graduates into a DAMM v2 pool with its liquidity locked for good, and
trades there. The mechanics — accounts, routes, stages — are in
`docs/SOLANA.md` ("Guild coins"); the decision is in `docs/DECISIONS.md`.
This file is the contract every coin surface holds to, and what remains
before mainnet. DLMM is **deferred** (§6).

```text
A guild of three pets → founder launches on a preset → DBC curve → threshold raised
  → graduation (keepers on mainnet; a button on devnet) → DAMM v2 pool, liquidity locked → trades there
```

Players never need to understand the pool transition: the coin's page shows
one stage at a time (`LaunchStage`) and offers only what that stage allows.

## 1. Constraints (normative — all hold today)

1. **Presets only.** A founder picks `gentle` or `lively`
   (`src/lib/coins/presets.ts`); raw curve, fee or threshold parameters are
   never taken from a request. Each preset is one config account on chain,
   made by `scripts/coin-presets.mts`, and `curve.test.ts` holds it to
   Meteora's own validation and to the terms the page publishes.
2. **SOL is the only quote asset.**
3. **Server-assisted quotes.** `GET /api/coins/<slug>/quote` quotes with
   Meteora's math (`swapQuote2` partial fill on the curve, `CpAmm.getQuote`
   in the pool); the client never computes a curve. A quote is shown with
   its age and must be taken again after 20 seconds.
4. **Preflight on.** Every coin transaction is sent with preflight; one that
   would fail lands nothing.
5. **Explicit sign per trade.** No auto-trading, no "approve all", no linked
   device: a Pawket Wallet's device can never sign a coin transaction.
6. **Verified routing only.** The DAMM v2 route is used only when the pool
   exists at `deriveDammV2PoolAddress(config for the preset's fee option,
   mint, wSOL)` and holds those mints. Anything else is `pending`.
7. **Disclosure before signing.** The terms (supply, fee split, threshold,
   locked liquidity, launch fee) are on the page before anyone signs, and
   what can go wrong (`COIN_RISKS`) must be read once per coin, per device,
   before the first trade or launch.
8. **The player pays.** Pawket's sponsor pays for pets, never for coins:
   `checkSponsorable` refuses any instruction that is not Pawket's.
9. **No promise of value.** `copy.test.ts` holds every coin surface to the
   banned-phrase list; a meter toward graduation is "community
   participation", never a price path.

## 2. The presets

| | Gentle | Lively |
| --- | --- | --- |
| Price along the curve | rises 3× | rises 10× |
| Market cap start → graduation (devnet) | 2 → 6 SOL | 1 → 10 SOL |
| Market cap start → graduation (mainnet) | 10 → 30 SOL | 5 → 50 SOL |
| Supply | 1,000,000,000, immutable | same |
| Allocations / vesting | none | none |
| Trading fee | 1% (0.2% Meteora, 0.4% founder, 0.4% Pawket) | same |
| Launch fee | 0.01 SOL to Pawket (a tenth to Meteora) | same |
| Graduated pool | DAMM v2, 1% fee, 100% of liquidity permanently locked (half founder, half Pawket) | same |

Mainnet thresholds are above the 10 SOL Meteora's keepers migrate at.
Devnet's are a fifth, so a rehearsal graduates on faucet SOL.

## 3. Stages (`src/lib/coins/stage.ts`)

| Stage | Quotes | Trades | Page |
| --- | --- | --- | --- |
| `none` | — | — | the founder's launch panel, or "no coin" |
| `dbc` | curve | curve | progress toward graduation (bloom segments), the ticket |
| `pending` | refused: "paused" | refused | "Graduating"; on devnet a button anyone may press |
| `damm` | verified pool | verified pool | "Active liquidity · DAMM v2", the ticket |
| `suspended` | refused | refused | Pawket stopped offering trades; nothing changed on chain |

## 4. Failure handling

- **Index lag after graduation.** A migrated curve whose pool is not yet
  readable at the derived address is `pending`: trading pauses rather than
  routing anywhere unverified.
- **Price moved since the quote.** The trade carries the quote's
  `minimumOut`; Solana refuses a worse fill and only the network fee is
  spent. The receipt names what did not change.
- **Client timeout after sending.** "Still waiting", never "failed", with
  the signature to look up (`TxReceipt`).
- **A buy larger than the curve has left.** Partial fill: it takes what
  graduation needs and returns the rest in the same transaction.
- **Guild delisted.** `suspended`: trades stop here; holdings are untouched.

## 5. Before mainnet

- Legal review of the coin copy, the disclosure and the asset-model row
  (Q6). Until it is signed, `COIN_CONFIGS` has no mainnet entry and the
  coin page says coins are off there.
- `pnpm dlx tsx scripts/coin-presets.mts mainnet-beta` with a multisig as
  the treasury (`docs/MAINNET.md`), and the treasury's partner-fee claims
  run from a script, never from the server.
- A paid RPC: the holder count is a token-program scan.

## 6. DLMM: later, not launch scope

DLMM (concentrated bins, dynamic fees) fits treasury-managed liquidity
**only** with a named operator, a rebalancing runbook and monitoring. Gating
criteria: DBC → DAMM v2 stable across launches, an operator assigned, the
treasury policy amended, human approval.

## 7. Files

```text
src/lib/coins/presets.ts       presets, terms, config addresses, the fee split (pure)
src/lib/coins/stage.ts         the stage machine (pure)
src/lib/coins/copy.ts          what can go wrong, what a coin does and never does, banned phrases
src/server/coins/curve.ts      a preset as DBC config parameters (shared with the script)
src/server/coins/meteora.ts    reads, quotes and transactions — the one module on Meteora's SDKs
src/server/coins/routes.ts     what the coin routes share
app/api/coins/[slug]/*         quote, launch, trade, graduate, claim, metadata
app/(game)/guilds/[slug]/coin  the coin's page; src/components/coins/coin-desk.tsx its controls
scripts/coin-presets.mts       makes the preset configs on a cluster
scripts/seed-coins.mts         the starter guilds' coins, through the routes
src/server/coins/devnet.test.ts  a coin's whole life on devnet (pnpm e2e:coins)
```
