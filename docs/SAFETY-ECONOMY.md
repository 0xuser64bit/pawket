# Player protection and economy

These are the product's financial and fairness boundaries. Implementation
lives in `src/lib/guilds/boundary.ts`, `src/lib/coins/copy.ts`, the program and
`src/server/coins/`. Mainnet requirements are separate in `MAINNET.md`.

## Fairness

Local adoption and care work without a wallet or token purchase. Cosmetics,
guild membership and coin balances never change stats, XP, cooldowns, scores
or the daily round bonus. Membership and coin ownership are independent.
Holding a coin only adds a crest pin on the holder's pets on the guild page.

The program enforces cooldowns and daily limits. Scores are produced by local
solo games; recording a round grants a flat bonus and is not a competitive
score certification. There is no money prize or implemented anti-bot review
service. Do not promise fraud detection or Sybil-resistant counts.

## Before a financial action

The Market shows the program price, destination treasury and fee payer.
Coin pages show supply, preset, fees, graduation terms, locked liquidity and
risks before signing. The coin ticket shows the quote, slippage and minimum
output; quotes expire after 20 seconds. Risk acknowledgement is remembered per
coin per device and is required before its first launch or trade.

Every spend needs the owner's approval, preflight and a visible transaction
receipt. A device may pay a coin transaction's network fee but cannot approve
its spending. Confirmed balances are read again; no optimistic patch invents
a purchase, fill or entitlement. `copy.test.ts` checks the prohibited promises
of value in coin copy. Do not describe a coin as savings, income or a guaranteed
return.

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
