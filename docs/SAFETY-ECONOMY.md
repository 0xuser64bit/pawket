# Player protection and economy

These are the product's financial and fairness boundaries. Implementation
lives in `src/lib/guilds/boundary.ts`, `src/lib/coins/copy.ts`, the program and
`src/server/coins/`. Mainnet requirements are separate in `MAINNET.md`.

For a purchase refusal, use [MARKETPLACE.md](MARKETPLACE.md#purchase-flow);
for quote, graduation or fee behavior, use
[METEORA-INTEGRATION.md](METEORA-INTEGRATION.md#failure-handling). Lost receipts
and authority incidents belong to [SECURITY.md](SECURITY.md#verification-and-incident-handling),
not a new refund or custody service.

## Fairness

Local adoption and care work without a wallet or token purchase. Cosmetics,
guild membership and coin balances never change stats, XP, cooldowns, scores
or the daily round bonus. Membership and coin ownership are independent.
Holding a coin only adds a crest pin on the holder's pets on the guild page.

The program enforces care cooldowns, the first-round-of-the-UTC-day XP rule and
linked-device action limits. It does not cap owner-signed `finish_round`
submissions per day; further rounds do not earn more XP. Scores are produced by local
solo games; recording a round grants a flat bonus and is not a competitive
score certification. There is no money prize or implemented anti-bot review
service. Do not promise fraud detection or Sybil-resistant counts.

## Before a financial action

The Market shows the program price, destination treasury and fee payer.
Coin pages show supply, preset, fees, graduation terms, locked liquidity and
risks before signing. The coin ticket shows the quote, slippage and minimum
output; its sign button expires a quote after 20 seconds. Risk acknowledgement
is remembered in this browser origin's local storage, keyed by `launch-<slug>`
for launching and mint for trading, and required by the UI before its first
launch or trade. Neither is server/program
authorization: the trade API accepts `amount` and `minimumOut` without quote
age or acknowledgement, and the swap enforces that submitted minimum.

Every spend needs the owner's approval, preflight and a visible transaction
receipt. A device may pay a coin transaction's network fee but cannot approve
its spending. Confirmed balances are read again; no optimistic patch invents
a purchase, fill or entitlement. `copy.test.ts` checks the prohibited promises
of value in coin copy. Do not describe a coin as savings, income or a guaranteed
return.

Preflight is not a guarantee of execution: a simulation refusal sends nothing,
while a later on-chain refusal still spends a network fee. Coin funding
temporarily exposes the wallet's spendable balance minus the device refill to
the owner-approved SDK instructions. The atomic brackets protect existing
external-owner SOL and return change, but do not cap spending to the ticket's
input; see [SECURITY.md](SECURITY.md#known-limits-and-release-blockers).

## Supply, liquidity and fees

Presets govern immutable supply, no allocations or vesting, the fee split and
permanently locked graduated liquidity. Founders and Pawket can claim their
fees; they cannot withdraw that liquidity. The server verifies the derived
DAMM v2 pool and its mints before routing trades. `METEORA-INTEGRATION.md`
documents the terms; `SECURITY.md` documents authority and derivation limits.

The Market's treasury and coin fee recipients are not a guild treasury.
There is no guild treasury dashboard, funds proposal system or published
multisig administration service in this version. Pulse displays chain-read
counts and treasury information, not an accounting or investment guarantee.

## Failures and moderation

| State | Required product behavior |
| --- | --- |
| Curve not full | Continue the verified curve route; promise no graduation date or refund |
| Curve full, migrated pool not verifiable | Show `pending`; pause quotes and trades; offer only supported graduation actions |
| Fill worse than minimum output | Refuse through simulation or chain rules; no phantom balance update |
| Broadcast or confirmation reply lost | Preserve the existing signature and show `unknown`; check it before retrying |
| Wallet rejects | Report no success and preserve the player's input |
| Guild delisted | Stop promotion and coin trades through Pawket; chain holdings and membership remain |

Reports go to the support contact in `src/config/site.ts`. Delisting is
maintained in `src/lib/guilds/delisted.ts`; it cannot reverse transactions or
confiscate assets. There is no creator account suspension system. New financial
utility or public mainnet launches require the unresolved policy and support
decisions in Q6, along with tested recovery and incident procedures.
