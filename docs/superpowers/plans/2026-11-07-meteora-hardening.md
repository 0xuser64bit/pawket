# Meteora guild-coin hardening

Implementation plan for the audit findings on the Meteora guild-coin feature.
Branch: `meteora-hardening`, based on `dev` at `f89803f`. Do not push.

Each numbered step is one commit. A step includes the implementation, its tests,
and the docs that would otherwise drift. Run the targeted suite before every
commit and the full `pnpm verify` equivalent at the end.

## Invariants

- The server still builds every transaction; clients never invent instruction bytes.
- A trade still requires an explicit owner signature and a visible receipt.
- Coins never use the sponsor. Pawket Wallet pays the network fee.
- No optimistic adopt/care/coin state.
- Devnet stays the default; no mainnet config is added.
- A refusal is a typed `CoinRefusal` with a player-facing message.

## 1. M1 — Bind a trade to a server-signed quote

**Problem.** `POST /api/coins/<slug>/trade` accepts any `amount` and
`minimumOut`. The quote's age is only a UI guard, and the shared action headers
send `Access-Control-Allow-Origin: *`.

**Design.**

- Add `src/lib/coins/quote.ts`: `TradeSide`, `CoinQuote` (the math result), and
  `SealedQuote` (a quote plus a token). Keep the existing field names.
- Add `src/server/coins/quote-token.ts`: HMAC-SHA-256 over a canonical claims
  payload, with a key domain-separated from `derivedSeed` and a 30-second
  expiry. `sealQuote` refuses without the server secret; `openQuote` validates
  the signature, shape, cluster, and expiry.
- `quoteTrade` returns `slug`, `mint`, and `preset` with the quote.
- The quote route seals the quote and returns the token.
- The trade route requires the token and checks slug, cluster, side, amount and
  minimum output before building. `tradeTransaction` also checks the token's
  mint, preset, and route against the live coin, so a quote cannot cross a
  graduation or a preset.
- Coin routes stop using the generic `Access-Control-Allow-Origin: *` headers.
  Add `coinJson`/`coinError`/`coinPreflight` in `src/server/coins/routes.ts`
  with `Cache-Control: no-store` and no cross-origin grant.
- The desk sends `quote.token` with the trade fields.

**Tests.**

- Token round-trip; tampered payload/signature; expired; wrong cluster;
  oversized/garbage tokens.
- Trade route refuses a missing, expired, or mismatched token before calling
  `tradeTransaction`.
- `tradeTransaction` refuses a quote whose route or mint no longer matches.
- Desk test asserts the token is posted and the intent still uses the displayed
  amount/minimum.

**Commit:** `fix(coins): Require a server-signed quote for trades`

## 2. M2 — Trust the right client address and separate coin limits

**Problem.** `caller()` trusts the first `x-forwarded-for` value, which a client
can prepend. One 240/hour limiter is shared by quote, trade, launch, graduate,
claim and position reads.

**Design.**

- `caller()` prefers a valid `x-real-ip` (the proxy-owned header), then the last
  valid `x-forwarded-for` hop, then `"local"`. Normalize IPv4-mapped IPv6 and
  keep IPv6 keyed by /64.
- Add `src/server/coins/limits.ts` with a limiter per operation. Write routes
  count both the caller and the account; quote/position reads count the caller.
- Coin routes use their own limiter. `actionLimit` stays for the Actions API.
- Return 429 with a `Retry-After` header where the route can.

**Tests.**

- Header precedence, spoofed leading hop, invalid header fallback, IPv6 /64.
- Separate buckets: exhausting quotes does not exhaust trades; a write route
  counts both IP and account.

**Commit:** `fix(server): Trust proxy headers and separate coin limits`

## 3. M3 / L6 / L7 — Bound reads, config caches and holder scans

**Problem.** Non-quote `rpc()` reads have no timeout. `readConfig` caches a
pending promise indefinitely. `readCoinStages` awaits the first config read per
preset serially. The holder scan is unbounded and only cached for 15 seconds.

**Design.**

- Add `src/server/coins/reads.ts`: `cachedRead` (TTL, max entries, deletes on
  rejection, does not cache a timed-out read) and `withinDeadline` (abortable
  race that always cleans its timer).
- `rpc()` gets a bounded fetch timeout; the quote-scoped connection keeps its
  caller signal. `readConfig` uses `cachedRead` with a 5-minute TTL and a
  15-second load deadline. A rejected/timed-out read is retried next time.
- `readCoinStages` reads each distinct config once, in parallel, before the
  account loop.
- Holder reads use a 5-second deadline, a 60-second cache, and a hard account
  cap; over the cap or on timeout the display says "Not counted just now".
  Quotes, claims, graduation and position reads never call the holder scan.

**Tests.**

- `cachedRead`: one load for concurrent callers, retry after rejection, TTL
  expiry, entry cap.
- `withinDeadline`: rejects and clears its timer; parent abort propagates.
- `readCoinStages` starts config reads for different presets concurrently and
  reads each config once.
- Holder scan over the cap/timeout returns null and does not poison the next
  display read.

**Commit:** `fix(coins): Bound coin reads, config caches and holder scans`

## 4. M4 — Validate the graduation lookup table on the server

**Problem.** `graduateTransaction` accepts any lookup table account returned by
the RPC, including a deactivated or still-mutable table.

**Design.**

- Add `src/lib/coins/lookup.ts`: `isUsableCoinLookup` requires a non-empty
  table, active state, and no authority (frozen). It also rejects a table whose
  address is not the configured one.
- `graduateTransaction` checks the configured table's address and
  `isUsableCoinLookup` before building; a bad table is a 503 refusal.
- The browser keeps its independent `decodeFrozenCoinLookup` check.

**Tests.**

- Pure helper accepts a frozen active table and rejects deactivated, mutable,
  empty, and wrong-address tables.
- `graduateTransaction` refuses a deactivated table before preparing a
  transaction.

**Commit:** `fix(coins): Validate graduation lookup tables`

## 5. L1 — Authorize launches inside the exported action

**Problem.** `launchTransaction` is exported and only the route checks founder,
listing, member count and the founding pet.

**Design.**

- Add `assertLaunchable(guild, founder)` in `meteora.ts` (or a small
  `src/server/coins/launch.ts`) that checks the founder, `isListed`, member
  count, and the founding pet's current guild. It throws `CoinRefusal`.
- Call it at the start of `launchTransaction`. The route can keep its early
  checks for precise messages, or delegate; either way the exported function is
  safe on its own.
- No second source of truth: both use `isListed`, `COIN_TERMS.minMembers`, and
  `readPet`.

**Tests.**

- Direct `launchTransaction` refuses a non-founder, a delisted/test guild, a
  guild below the member minimum, and a founding pet that left or cannot be
  read.
- The route still returns the existing statuses.

**Commit:** `fix(coins): Authorize launches inside the server action`

## 6. L2 — Cap compute units and priority fees

**Problem.** The intent grammar only permits a compute-unit limit for
graduation and rejects `setComputeUnitPrice`. Coin transactions cannot add a
bounded priority fee.

**Design.**

- Add `src/lib/coins/compute.ts`: per-operation CU ceilings (trade 400k, launch
  600k, graduate 600k, claim 300k), a priority-fee cap, and a default modest
  priority fee.
- The validator accepts at most one `SetComputeUnitLimit` and one
  `SetComputeUnitPrice`, both within the operation's caps, with no accounts.
- `forPlayer` adds the missing compute-budget instructions before the wallet
  brackets; the fee calculation includes them. The graduation SDK's 600k limit
  is accepted as-is.
- `sendPrepared` stops blanket-refusing `SetComputeUnitPrice`; the intent
  validator is the one gate, and it runs before either signature.

**Tests.**

- Intent accepts the default instructions for trade/launch/claim/graduate.
- Intent refuses a CU limit above the cap, a priority fee above the cap,
  duplicates, and compute-budget instructions with accounts.
- `sendPrepared` accepts a capped priority fee and still refuses an uncapped one
  before device signing.
- Funding and fee accounting still work.

**Commit:** `feat(coins): Cap compute units and priority fees`

## 7. L3 / L8 — Report pool fees and the dynamic-fee range

**Problem.** `coin.fees.total` stops at the curve's metrics after graduation.
The page says the graduated pool is a flat 1% fee, but Meteora's dynamic fee can
add up to ~0.2%.

**Design.**

- Add `src/lib/coins/fees.ts`: `totalTradingFees(curveLamports, poolMetrics)`
  adds the DAMM pool's lifetime LP + protocol quote fees; `graduatedFeeLine()`
  returns "1% base, up to 1.2% with Meteora's dynamic fee".
- `liveCoin` uses the helper when the pool is verified.
- The coin page uses `graduatedFeeLine()` and labels the total "Trading fees so
  far" consistently before and after graduation.
- `COIN_TERMS` gains `graduatedMaxFeeBps: 120`; docs match.

**Tests.**

- `totalTradingFees` sums curve + pool LP + protocol fees and ignores pool
  metrics before graduation.
- The fee line reports the base and maximum.
- Page/desk fixtures still render.

**Commit:** `fix(coins): Report pool fees and the dynamic-fee range`

## 8. L4 — Batch pool fee claims

**Problem.** `positionFeeTransaction` builds every position, but the intent
allows at most four. A wallet with five positions gets a transaction that the
client refuses, with no explanation.

**Design.**

- Export `MAX_POOL_CLAIMS = 4` from `intent.ts`; the validator and server use it.
- `positionFeeTransaction` selects at most four positions (prefer positions
  with unclaimed fees), returns `{ transaction, claimed, remaining }`, and the
  route includes the remaining count in its message.
- The desk says claims run four positions at a time and offers the button again
  while `remaining > 0`; after a confirmed claim it refreshes position fees.
- `readPositionFees` continues to report all positions and totals.

**Tests.**

- A five-position wallet builds exactly four claim instructions and reports
  `remaining: 1`.
- The intent still refuses five claims in one transaction.
- The desk shows the batching note and does not disable a legitimate second
  claim.

**Commit:** `fix(coins): Batch pool fee claims`

## 9. L5 — Freeze the coin metadata response

**Problem.** The metadata endpoint is dynamic and cached for five minutes while
the on-chain name and symbol are fixed at launch.

**Design.**

- Add `src/lib/coins/metadata.ts`: one `coinMetadata(guild, appUrl)` object used
  by the route, with the same `coinName`/`coinSymbol` calls as the launch.
- The route returns `Cache-Control: public, max-age=31536000, immutable` for a
  found guild; 404/503 stay `no-store`.
- Add a test that the metadata name/symbol equal the launch's values, that the
  image/external URLs use the configured app origin, and that the cache header
  is immutable.

**Commit:** `fix(coins): Freeze the coin metadata response`

## 10. M5 — Add a graduation keeper

**Problem.** Mainnet expects keepers, but the repo has no keeper or service.

**Design.**

- Add `src/lib/coins/keeper.ts`: a pure `graduationPlan(pools, max)` and
  `keeperLimit(env)` with a hard cap. It selects only unmigrated pools whose
  raised amount meets the config threshold, in deterministic order.
- Add `scripts/graduate-coins.mts`: devnet default, genesis check, local key
  (never the server), dry-run unless `EXECUTE=1`, at most `MAX_GRADUATIONS`
  per run, active/frozen lookup-table check, one JSON log line per pool, an
  optional `KEEPER_WEBHOOK_URL`, and a non-zero exit on failures.
- Document the keeper, its key, its limits and its monitoring in
  `docs/METEORA-INTEGRATION.md`; add the mainnet checklist item in
  `docs/MAINNET.md`.
- No server route signs a graduation with a keeper key.

**Tests.**

- Plan selection: below threshold, already migrated, wrong config, cap,
  deterministic order.
- Limit parsing: default, invalid, and above the hard cap.

**Commit:** `feat(coins): Add a graduation keeper`

## 11. Docs and final verification

- Update `docs/METEORA-INTEGRATION.md`, `docs/SECURITY.md`, `docs/MAINNET.md`,
  and `docs/ENVIRONMENT.md` for the quote token, CORS, limits, read bounds,
  lookup validation, compute budget, fee disclosure, claim batching, metadata
  caching and keeper.
- Run the targeted suites after each commit.
- Run `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/eslint .`,
  `node_modules/.bin/vitest run`, and `node_modules/.bin/next build`.
- Review `git log --oneline dev..HEAD` and `git diff dev...HEAD` for one logical
  change per commit. Do not push.

## Out of scope

- No mainnet config or mainnet deployment.
- No program change; the on-chain rules stay as they are.
- No custody, no seed/private-key handling, no server-held player keys.
- No indexer dependency; holder counts remain best-effort and the docs say so.
