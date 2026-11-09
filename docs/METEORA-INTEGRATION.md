# Meteora integration

Implemented on devnet. A guild with three pets may launch one
optional coin on a Pawket preset; it trades on Meteora's Dynamic Bonding
Curve, graduates into a DAMM v2 pool with its liquidity locked for good, and
trades there. The mechanics — accounts, routes, stages — are in
`docs/SOLANA.md` ("Guild coins"); the decision is in `docs/DECISIONS.md`.
This file describes coin routing and the requirements before mainnet.

```text
A guild of three pets → founder launches on a preset → DBC curve → threshold raised
  → graduation (keepers on mainnet; a button on devnet) → DAMM v2 pool, liquidity locked → trades there
```

Players never need to understand the pool transition: the coin's page shows
one stage at a time (`CoinStage`) and offers only what that stage allows.

To change terms, start with `src/lib/coins/presets.ts`, then
`src/server/coins/curve.ts` and `curve.test.ts`. To investigate a quote or
transaction, follow `coin-desk.tsx` → `app/api/coins/[slug]/` →
`src/server/coins/meteora.ts` → the [shared send path](SOLANA.md#transaction-lifecycle).
Use [Sources and operational tools](#sources-and-operational-tools) for config,
lookup-table, keeper and treasury work. The config, lookup-table and treasury
scripts sign transactions when invoked; the graduation keeper only dry-runs
unless `EXECUTE=1` is set.

Guild discovery and Pulse read curve and graduated-pool accounts in batches
of at most 100, preserving account order when resolving each guild's stage.
Missing or wrong-program graduated pools remain pending, not tradable.
Holder analytics are read only for display and crest eligibility, with a
5-second deadline, a 60-second cache and a 5,000-account cap; over the cap or
on timeout the page says "Not counted just now" and the next read tries again.
Quotes, transaction preparation and position fees never wait for that optional
scan. Config reads are cached for five minutes with a 15-second load deadline;
a failed or timed-out read is not cached.

## Routing and approval rules

1. **Presets only.** A founder picks `gentle` or `lively`
   (`src/lib/coins/presets.ts`); raw curve, fee or threshold parameters are
   never taken from a request. Each preset is one config account on chain,
   made by `scripts/coin-presets.mts`, and `curve.test.ts` holds it to
   Meteora's own validation and to the terms the page publishes.
   `launchTransaction` itself checks the founder, `isListed`, the three-pet
   minimum and the founding pet's current guild, so the exported action is
   safe even without the route's earlier checks.
2. **SOL is the only quote asset.**
3. **Server-assisted quotes.** `GET /api/coins/<slug>/quote` quotes with
   Meteora's math (`swapQuote2` partial fill on the curve, `CpAmm.getQuote`
   in the pool); the client never computes a curve. A quote is shown with
   its age; the UI disables signing it after 20 seconds, and the server token
   it carries expires after 30. The signing action rechecks the quote's age
   against the current clock, including after a suspended page resumes. The
   quote route returns an HMAC-SHA-256 token bound to the slug, cluster, mint,
   preset, route, side, amount and minimum output. The trade endpoint requires
   that token and refuses a missing, expired or mismatched one before it
   builds anything; `tradeTransaction` rechecks the token's mint, preset and
   route against the live coin, so a quote cannot cross a graduation or a
   preset. The swap instruction enforces the minimum output against the live
   route. Guild and quote reads share one 15-second server budget; browser
   cancellation reaches both Kit and Meteora HTTP reads. The browser stops
   waiting after 20 seconds and offers a retry. Changing amount, side,
   slippage, coin or route, or leaving the ticket aborts its pending quote;
   late answers cannot enable signing. Quote reads do not share another
   request's pending config read. The SDK's non-cancellable rate-limit retry
   is disabled for quotes, so a refused provider read returns control to the
   player within the same budget.
   Coin API routes send no cross-origin grant; the public metadata route is the
   exception because wallets and indexers fetch it cross-origin.
4. **Preflight on.** Every app coin transaction is sent with preflight. A
   simulation refusal broadcasts nothing. State may still change before an
   accepted transaction lands; an on-chain failure rolls back its state changes
   but still costs the network fee.
5. **Explicit sign per trade.** No auto-trading, no "approve all", the owner approves every spend. A linked device co-signs only as fee payer; it cannot authorize spending.
6. **Verified routing only.** The DAMM v2 route is used only when the pool
   exists at `deriveDammV2PoolAddress(config for the preset's fee option,
   mint, wSOL)` and holds those mints. Anything else is `pending`.
7. **Disclosure before signing.** The terms (supply, fee split, threshold,
   locked liquidity, launch fee) are on the page before anyone signs, and
   what can go wrong (`COIN_RISKS`) must be read once per coin, per device,
   before the first trade or launch in Pawket's UI. Acknowledgement is stored
   in this origin's local storage, keyed by `launch-<slug>` for launching and
   by mint for trading, not enforced by the API or program.
8. **The player pays.** Pawket Wallet funds the transaction, returns unused SOL and receives sale proceeds. The owner's existing SOL stays unchanged. Pawket's sponsor pays for pets, never for coins:
   `checkSponsorable` refuses any instruction that is not Pawket's.
   It also explicitly refuses the Pawket funding/settlement brackets. The
   device needs an existing fee float even for a sell or fee claim; positive
   Pawket Wallet balance alone does not guarantee the transaction can start.
   Funding is capped to the operation's SOL input plus rent (0.005 SOL for
   trade/claim, 0.03 for launch, 0.05 for graduation) and the fixed launch fee
   where applicable. The controls show these ceilings; unused SOL returns.
   Each transaction carries at most one compute-unit limit and one priority
   fee, within per-operation caps (`src/lib/coins/compute.ts`): 400k CU for a
   trade, 600k for launch or graduation, 300k for a claim. The priority fee
   defaults to 10,000 micro-lamports per CU and may not exceed 200,000.
   `src/lib/coins/intent.ts` owns the limits and pure browser instruction policy.
   The controls capture the coin/preset and operation before preparation;
   `sendPrepared` checks that intent before device or owner signing, including
   exact token sell amounts, minimum outputs, recipients and auxiliary layouts.
   The server validates the configured active, frozen graduation lookup table
   before building; the browser independently resolves and decodes that same
   table through its own RPC.
   Unsupported layouts are refused rather than signed through a generic program
   allow-list. `src/server/coins/intent.test.ts` holds the policy to installed
   SDK transactions; `meteora-funding.test.ts` checks server funding bounds.
   Pool fee claims batch at most three positions per transaction, preferring
   positions with fees waiting; the route reports how many remain so the owner
   can claim the rest.
9. **No promise of value.** `copy.test.ts` holds every coin surface to the
   banned-phrase list; a meter toward graduation is "community
   participation", never a price path.

## Presets

| | Gentle | Lively |
| --- | --- | --- |
| Price along the curve | rises 3× | rises 10× |
| Market cap start → graduation (devnet) | 2 → 6 SOL | 1 → 10 SOL |
| Provisional mainnet market cap start → graduation | 10 → 30 SOL | 5 → 50 SOL |
| Supply | 1,000,000,000, immutable | same |
| Allocations / vesting | none | none |
| Trading fee | 1% (0.2% Meteora, 0.4% founder, 0.4% Pawket) | same |
| Launch fee | 0.01 SOL to Pawket (a tenth to Meteora) | same |
| Graduated pool | DAMM v2, 1% base fee, up to 1.2% with Meteora's dynamic fee; 100% of liquidity permanently locked (half founder, half Pawket) | same |

Devnet presets are configured for tests using faucet SOL. The mainnet numbers
in the model are provisional; config addresses, thresholds and keeper behavior
must be approved and verified before mainnet is enabled (Q3, Q6).
Market capitalization is not the SOL raised threshold. The latter comes from
the SDK-built config's `migrationQuoteThreshold`; `raised` is the curve's
`quoteReserve`. Use those account values for the graduation meter, not the
market-cap figures above.

## Stages (`src/lib/coins/stage.ts`)

| Stage | Quotes | Trades | Page |
| --- | --- | --- | --- |
| `none` | — | — | the founder's launch panel, or "no coin" |
| `dbc` | curve | curve | progress toward graduation (bloom segments), the ticket |
| `pending` | refused: "paused" | refused | "Graduating"; on devnet a button anyone may press |
| `damm` | verified pool | verified pool | "Active liquidity · DAMM v2", the ticket |
| `suspended` | refused | refused | Pawket stopped offering trades; nothing changed on chain |

## Failure handling

- **Index lag after graduation.** A migrated curve whose pool is not yet
  readable at the derived address is `pending`: trading pauses rather than
  routing anywhere unverified.
- **Price moved since the quote.** The trade carries the quote's
  `minimumOut`. If simulation catches a worse fill, nothing broadcasts; if it
  fails on chain, its state changes roll back and the network fee is spent.
  The receipt names what did not change.
- **Client timeout after sending.** "Still waiting", never "failed", with
  the signature to look up (the send's toast).
- **A buy larger than the curve has left.** Partial fill: it takes what
  graduation needs and returns the rest in the same transaction.
- **Guild delisted.** `suspended`: trades stop here; holdings are untouched.

## Mainnet requirements

- Legal review of the coin copy, the disclosure and the asset-model row
  (Q6). Until it is signed, `COIN_CONFIGS` has no mainnet entry and the
  coin page says coins are off there. A mainnet `DERIVATION_SECRET` is
  set and backed up before the first launch (`ENVIRONMENT.md`).
- An approved config-deployment and verification plan with reviewed preset
  parameters and treasury authority (`MAINNET.md`). Partner-fee claims run
  from the treasury's operational tool, never the server.
- A paid RPC: the holder count is a token-program scan.

## Graduation keeper

A curve is graduated by Meteora's migration instruction, which anyone may
send. On devnet the coin page offers a button. On mainnet Pawket runs
`scripts/graduate-coins.mts` so a coin does not wait for a player to press it.

- The script reads Pawket's offered configs, lists each config's pools, and
  plans only unmigrated pools whose `quoteReserve` has reached the config's
  `migrationQuoteThreshold`. It orders by pool address so two runs from the
  same snapshot choose the same pools.
- It dry-runs by default: no key is read, nothing is signed, and it prints one
  JSON line per planned pool plus a run summary. `EXECUTE=1` signs.
- `KEEPER_KEYPAIR` is a local file path (default `.keys/keeper.json`). The
  keeper is its own hot wallet with SOL for the migration fee and rent. It is
  never the sponsor, treasury, collection authority, derivation secret or
  program upgrade authority.
- `MAX_GRADUATIONS` defaults to 1 and is clamped to 10. A missing or malformed
  value falls back to 1, so a typo cannot turn one run into an unbounded loop.
- Before signing each pool it re-reads that pool and skips it if it has already
  migrated or has fallen below the threshold. It sends a v0 transaction with
  the frozen graduation lookup table, then confirms it.
- `KEEPER_WEBHOOK_URL` receives the run summary as JSON; a failed graduation or
  a failed webhook delivery exits non-zero. Point it at the operator's alerting
  so a stuck pool is noticed, not just logged.
- The keeper pays the fee and rent, but the migration assigns the two
  permanently locked DAMM v2 positions to the coin's founder and Pawket's
  treasury, not to the keeper. Paying for a graduation earns the payer no
  position and no fee stream.

## Sources and operational tools

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
scripts/claim-coin-fees.mts    Pawket's partner fees, launch fees and locked-LP fees, into the treasury
scripts/graduate-coins.mts     graduates ready curves; dry-run unless EXECUTE=1
scripts/coin-lookup-table.mts  the frozen lookup table graduation needs on a cluster (COIN_LOOKUP_TABLES)
src/server/coins/devnet.test.ts  a coin's whole life on devnet (pnpm e2e:coins)
```

Before an explicitly authorized operational run, check the target RPC's
genesis, signer address, recipients and available SOL. Each coin script checks
the selected cluster's genesis; that is not mainnet release approval.

| Script | Local signer input | Effect and follow-up |
| --- | --- | --- |
| `coin-presets.mts [devnet\|mainnet-beta]` | `PAYER` file path, default `~/.config/solana/id.json` | Creates missing configs and prints a proposed `COIN_CONFIGS` mapping; it does not edit source. Existing addresses are skipped when any account exists there, so separately verify program ownership and config terms. |
| `coin-lookup-table.mts [devnet\|mainnet-beta]` | `PAYER_KEYPAIR` file path, same default | Creates and freezes a new table on every run; requires cluster configs. Record and verify the printed address before an authorized `COIN_LOOKUP_TABLES` change. |
| `claim-coin-fees.mts [devnet\|mainnet-beta]` | `TREASURY_KEYPAIR` file path, default `.keys/treasury.json` | Requires the fixed treasury signer; claims DBC partner/creation fees and that wallet's DAMM position fees. It is not an HTTP route or a service that replenishes the sponsor. |
| `graduate-coins.mts [devnet\|mainnet-beta]` | `KEEPER_KEYPAIR` file path, default `.keys/keeper.json`; `EXECUTE=1`; `MAX_GRADUATIONS`; optional `KEEPER_WEBHOOK_URL` | Dry-runs unless `EXECUTE=1`. Graduates up to the limit of ready pools, re-reading each before signing. Needs SOL for fees and rent; it does not own the resulting locked positions. |

All four default to devnet and accept a server-only `SOLANA_RPC_URL` override.
Keep their key files local and untracked. Review the script before invoking it;
the preset and lookup-table tools can create new rent-bearing accounts. The
keeper's `KEEPER_KEYPAIR`, `EXECUTE`, `MAX_GRADUATIONS` and
`KEEPER_WEBHOOK_URL` are operator inputs to that script, not application
runtime variables; they are not read by `getServerEnv()`.
