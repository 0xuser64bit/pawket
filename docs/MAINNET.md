# Mainnet readiness

Pawket currently defaults to devnet. This is a release requirements document,
not authorization to deploy, move funds or change program identities.
Mainnet requires a separate human-approved deploy plan.

## Decisions and controls required

| Area | Current behavior | Required before mainnet |
| --- | --- | --- |
| Program | Upgradeable devnet program | External review of the current source; approved program identity and multisig upgrade authority; tested upgrade and rollback procedure |
| Treasury | Fixed devnet recipient in program and client constants | Approved recipient and signer policy; program/client changes verified together |
| Sponsorship | Devnet-only hot key; float floor and per-instance limits | Explicit fee/rent policy, shared rate limiting, total budget enforcement, monitoring and replenishment ownership |
| Pawket Wallet | Linked device and positive balance required for app transactions | Review all money paths, fee float, unlink/close, recovery and mainnet fee policy; no implicit owner-wallet fallback |
| Keepsakes and coins | Keys derived from sponsor secret | Resolve derivation-secret backup/migration and collection authority separation (Q10) |
| Coins | Devnet preset configs only | Legal/policy approval (Q6), approved mainnet parameters and recipients (Q3), verified config accounts and pool routing |
| Market | Prices fixed by the program | Approved real-SOL prices; source parity and treasury validation |
| RPC and discovery | Direct scans with short shared caches | Measured capacity, provider and monitoring ownership (Q4) |
| Persistent rent | Most account types cannot close | Approved retention/rent policy; any recovery instruction needs its own program design and review |
| Android | Same hosted product; device checks separate | Supported consumer-wallet/WebView matrix and physical release validation |

Devnet records do not migrate automatically. Mainnet starts with different
cluster state; player communication must distinguish those records and explain
local pets and device links. Cosmetic prices and coin terms in devnet do not
constitute approval for prices or launches using real SOL.

## The next program upgrade

Main and the devnet program are frozen in review. These changes wait for the
next authorized upgrade, each with its LiteSVM test written first and no seed or
discriminator change; listing them here authorizes none of them.

- Coin-trade float: `fund_wallet_spend` tops a device back up to its whole
  float each trade; refilling only the fee paid would match `act`.
- Rounds: an optional daily cap on `finish_round`, which earns XP once a day.
- Guestbooks: the once-a-day wave check reaches only the last eight visitors.
- Rent: close instructions for the account types that have none, under an
  approved retention policy.
- Room things, if they are ever sold on their own: item ids and prices in
  `item_price`, after the 12 rooms' own things stay free with their rooms.

## Cost and availability planning

Query `getMinimumBalanceForRentExemption` for each current account layout on
the target cluster. Model adoption, wallet setup, membership, closets,
gatherings, guestbooks and keepsakes separately from recurring network fees.
Sizes come from the program and IDL, not a copied rent estimate.

Turning the sponsor off currently prevents rent-bearing app actions; it does
not automatically make the owner wallet pay. A mainnet launch with sponsorship
off needs an approved product and program plan for those actions. Do not
promise that Market revenue or coin fees will fund operations without a budget.

## Release gates

- [ ] Q6 and Q10 resolved; Q3 and Q4 settled for the planned load.
- [ ] Program and server security review complete; findings closed or explicitly accepted.
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
