# Pawket — Safety, Fairness & Economy

**Status:** SPEC — normative. Violations block release at any milestone. Legal review (Q6) must sign the disclosure copy + treasury policy before M6.

## 1. Player protection (product behavior)

- Plain-language **risk disclosure before first token purchase per guild**, accessible afterward (`risk-disclosure.tsx`). Covers: volatility, loss of principal, no yield/returns promised, liquidity risk, smart-contract + migration risk, possibility of failed/delayed confirmation, suspension semantics (benefits can end; chain assets unaffected).
- Every swap ticket shows: quote asset, estimated output, slippage tolerance, fees, price impact, min-received, quote expiry — **before** the wallet opens.
- Never market tokens as investments/savings/yield/guaranteed appreciation. Banned phrases (grep-gated): `guaranteed`, `moon`, `100x`, `risk-free`, `passive income`, `yield`, `APY`, `profit share`, `price support`, `can't lose`, `to the moon`.
- Token CTAs kept out of adoption/care loops; wallet-free path completes core play.
- Balances refresh from source of truth; no optimistic balance patches; rejections/failures preserve input + offer safe retry only.

## 2. Launch protection

- Publish before open: curve, supply, fee schedule, allocation, vesting, graduation conditions, DAMM v2 destination, position ownership/locks/fee recipients/withdrawal terms.
- Constrained presets + simulation + reviewed launch flow (see `METEORA-INTEGRATION.md`).
- Wallet/tx limits in early stages where DBC supports them; bot/sybil/wash/concentration/impersonation detection with **pre-published consequences** (review → limits → suspension; never price intervention).
- No undisclosed mint/liquidity/price-control powers. Authorities documented; unexpected authority change → flag + suspend promotion + verify + publish status.

## 3. Allocation & liquidity protection

- Public recipients for team/creator/partner/treasury/community with amounts + unlock dates; vesting/lockups published; multisig treasury (signers, threshold, replacement + decision rules published).
- Liquidity: who owns positions, locked/vested?, who receives fees, when changeable/withdrawable — all pre-published, then indexed (see `INDEXER.md`).
- Treasury dashboard (`treasury-table.tsx` + `GET /api/treasury/:slug`): wallets, signers, inflows/outflows with signatures/slots, allowed uses, decision log.

## 4. Moderation & policy boundaries

Pawket may: delist from discovery, remove in-app benefits, hide misleading metadata, suspend creator accounts — under published policy. These are **product-surface actions**; they do not reverse chain txs or confiscate assets. Terms + launch page + support macro all carry this distinction verbatim.

## 5. Failure modes (required handling — implement exactly)

| Scenario | Required behavior |
| --- | --- |
| No graduation | Mark active/ended per published config; no implied refund/migration |
| Threshold hit but indexing lags | `migration-pending`: pause route UI, reconcile on verified slot, then activate DAMM v2 |
| Confirmed but client timed out | `unknown` + signature lookup + poll; never "failed" from timeout alone |
| Reject / fail | Clear error, no phantom balance change, retry only when safe |
| DAMM v2 init fails | Visible incident, stop route attempts, audit trail, prepublished recovery |
| Bot/concentration spike | Review + configured protections; no price intervention |
| Guild suspended | Delist + benefits off; retain factual non-misleading record |
| Treasury/admin key compromised | Incident plan: verified comms, multisig recovery where pre-arranged |
| Metadata/authority surprise | Flag, suspend promotion + eligibility, publish verified status |

## 6. Metrics & launch criteria

**Game/community health:** discovery→join, event + repeat participation, cosmetic/badge/space/vote use, retention (guild vs non-token), wallet-free completion rate.
**Market/integration health:** participants, holders, concentration, volume, liquidity, slippage; migration completion + time-to-verified; quote accuracy, failures, timeouts, lag; fee/treasury accuracy.
**Safety health:** bot/sybil/wash/impersonation signals, support contacts + disputes per launch, moderation incidents + time-to-resolve, unauthorized authority/liquidity changes.
**Token price is not a primary metric.** Success = participation + retained social play without harming access/fairness.

**Release stages:** spec + threat model → internal prototype (devnet/simulated lifecycle + failure paths) → controlled pilot (1 Pawket-controlled/trusted guild, restricted, monitored) → limited beta (small N, presets + review + support, safety/retention evaluated) → broader availability (self-service applications only after proven migration reliability + policies + monitoring + moderation capacity).

**Ready-to-launch checklist (all must be true):** utility specific/documented/optional/non-pay-to-win; params/fees/allocations/vesting/threshold/destination public; lifecycle + failure paths tested in dev; authorities/treasury/wallets verified; liquidity terms published; wallet/quote/swap/index/migration/recovery tested; monitoring + thresholds live with named owner; moderation/suspension/dispute/support ready; core pet/social/progression fully usable without the token.

## 7. Incident records (minimum fields)

`{ id, guildSlug?, detectedAt, severity, summary, affectedState, operatorActions[], userComms[], status, resolvedAt?, postmortemUrl? }` — created for migration failures, authority surprises, compromises, suspensions. Retained + queryable; postmortems linked from guild profile where user-facing.
