---
name: adding-transaction-flow
description: Use when wiring Pawket transaction signing, sending, confirmation, simulation, Solana Mobile Wallet Adapter, or debugging a failed program transaction.
---

# Adding a transaction flow

Read `docs/engineering/TRANSACTIONS.md` and `docs/engineering/SOLANA.md`.

## Inspect

- `packages/pawket-sdk/src/solanaClient.ts` — builders, PDAs
- `apps/mobile/src/wallet/walletAdapter.ts` — adapter surface
- `apps/mobile/src/solana/config.ts` — RPC / program
- `apps/mobile/src/state/PawketSessionContext.tsx` — current API-only mutations
- `apps/mobile/src/integrations/` — reserved for MWA

## Pattern

1. Build with the SDK. Simulate. Sign via the adapter. Send. Confirm `confirmed` / 30s. Refresh session from the source of truth.
2. No optimistic XP or celebrations.
3. Disable the CTA with a session `status` for the whole in-flight window.
4. Map program errors 6000+ onto the existing API codes/messages.
5. Choose chain-first or API-first (TRANSACTIONS.md) and write the choice in the PR. Default is chain-first for ownership, API remains projection + daily goals.

## Debug a failure

| Symptom                                  | Check                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `Invalid program id` / account not found | `PAWKET_PROGRAM_ID` vs deployed program vs `declare_id!`                        |
| Constraint / seeds error                 | Name trimmed? Same owner? SDK account order?                                    |
| `CareCooldownActive`                     | 1800s per action; on-chain has no decay                                         |
| Sim fails, send would fail               | Read program logs; do not send                                                  |
| Timeout after send                       | Status is **unknown**, not failed. Reload before retrying with a new signature. |
| API pet ≠ chain pet                      | Dual-write. Stop. Read TRANSACTIONS.md.                                         |

## Do not

- Sign or send from a screen.
- Use the companion key as a funds wallet.
- Point RPC at mainnet.
- Swap in MWA and keep deriving PDAs from the old companion address.

## Verify

SDK layout tests + a localnet send of the new path (`anchor test` or a scripted sim). `pnpm invariants`.
