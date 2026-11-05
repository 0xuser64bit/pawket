# Mainnet readiness

Pawket currently defaults to devnet. This is a release requirements document,
not authorization to deploy, move funds or change program identities.
Mainnet requires a separate human-approved deploy plan.

Start with the stable Q3/Q4/Q6 decisions in
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), then the controls and release checklist
below. [SOLANA.md](SOLANA.md#devnet-deployment) is the devnet deploy procedure,
not a mainnet runbook; [ENVIRONMENT.md](ENVIRONMENT.md) owns key setup and
[SECURITY.md](SECURITY.md#known-limits-and-release-blockers) records current
trust and abuse limits.

## Decisions and controls required

| Area | Current behavior | Required before mainnet |
| --- | --- | --- |
| Program | Upgradeable devnet program | External review of the current source; approved program identity and multisig upgrade authority; tested upgrade and rollback procedure |
| Treasury | Fixed devnet recipient in program and client constants | Approved recipient and signer policy; program/client changes verified together |
| Sponsorship | Devnet-only hot key; float floor and per-instance limits | Explicit fee/rent policy, shared rate limiting, total budget enforcement, monitoring and replenishment ownership |
| Pawket Wallet | Linked device required for app actions; sponsored non-money actions may use an empty wallet, while purchases, coins and unsponsored actions need funds | Review all money paths, fee float, unlink/close, recovery and mainnet fee policy; no implicit owner-wallet fallback |
| Keepsakes and coins | Keys derived from `DERIVATION_SECRET` (the sponsor's seed unless set); the sponsor signs as collection authority unless `COLLECTION_AUTHORITY_KEYPAIR` is set | A mainnet derivation secret and collection authority of their own, recorded and backed up before the first card or coin |
| Coins | Devnet preset configs only | Legal/policy approval (Q6), approved mainnet parameters and recipients (Q3), verified config accounts and pool routing |
| Market | Prices fixed by the program | Approved real-SOL prices; source parity and treasury validation |
| RPC and discovery | Direct scans with short shared caches | Measured capacity, provider and monitoring ownership (Q4) |
| Persistent rent | Records are permanent by decision (`DECISIONS.md`) | A budget that treats that rent as spent for good, or players paying their own rent |
| Android | Same hosted product; device checks separate | Supported consumer-wallet/WebView matrix and physical release validation |

Devnet records do not migrate automatically. Mainnet starts with different
cluster state; player communication must distinguish those records and explain
local pets and device links. Cosmetic prices and coin terms in devnet do not
constitute approval for prices or launches using real SOL.

## The next program upgrade

These changes wait for an authorized program upgrade, each with its LiteSVM
test written first and no seed or discriminator change; listing them here
authorizes none of them.

- Room things, if they are ever sold on their own: item ids and prices in
  `item_price`, after the 12 rooms' own things stay free with their rooms.

The coin-trade float, a daily round cap, the guestbook's window and close
instructions were weighed on 25 October 2026 and left as they are
(`DECISIONS.md`).

## Cost and availability planning

Query `getMinimumBalanceForRentExemption` for each current account layout on
the target cluster. Model adoption, wallet setup, membership, closets,
gatherings, guestbooks and keepsakes separately from recurring network fees.
Sizes come from the program and IDL, not a copied rent estimate.

Turning the sponsor off blocks device-routed rent-bearing actions; it does
not automatically make the owner wallet pay. Market purchases have an
owner-approved path whose device payer must cover fees and any new closet's
rent ([MARKETPLACE.md](MARKETPLACE.md)); the spendable wallet balance is not
an automatic rent refill. A mainnet launch with sponsorship off needs an
approved product and program plan for those actions. Do not
promise that Market revenue or coin fees will fund operations without a budget.

Changing the cluster env value is not a mainnet enablement mechanism. The
sponsor explicitly refuses `mainnet-beta`; `COIN_CONFIGS` and
`COIN_LOOKUP_TABLES` have devnet entries only. The program, treasury and Core
collection identities remain checked-in constants, not cluster-selected env
values. Verify separately approved identities and actual deployed accounts;
passing local parity tests does not prove a deployment matches them.

## Release gates

- [ ] Q6 resolved; Q3 and Q4 settled for the planned load.
- [ ] Program and server security review complete; findings closed or explicitly accepted.
- [ ] Coin spend authorization reviewed: operation funding ceilings, immutable
      browser intent, exact instruction layouts and frozen lookup-table reads
      in `src/lib/coins/intent.ts` and `send.ts` pass SDK parity and malformed
      transaction tests; deployed devnet lifecycle and consumer-wallet checks
      confirm every supported operation before mainnet use.
- [ ] Upgrade, treasury, collection and derivation authorities recorded and recoverable.
- [ ] Fee/rent policy, shared limits, budgets and alert ownership approved.
- [ ] Market prices, coin configs, disclosures and recipients verified against source and chain.
- [ ] `pnpm verify`, browser checks and `pnpm program:test` pass on the release source.
- [ ] Devnet integration tests complete on the corresponding release candidate.
- [ ] Physical Android release checks complete if the app is included.
- [ ] An authorized mainnet validation procedure defines funded test accounts,
      spend limits, receipts, monitoring and rollback criteria.
- [ ] Cluster configuration and player-facing copy agree; sponsorship and coins
      stay disabled unless explicitly enabled by reviewed changes.

The devnet test suites are not a mainnet smoke-test runbook. They create
accounts and trade test SOL; do not repoint them at mainnet. Mainnet validation
must be designed and authorized separately.
