---
name: adding-solana-instruction
description: Use when adding or changing a Pawket Anchor instruction, account, PDA, event, error, or SDK instruction builder.
---

# Adding a Solana instruction

Read `docs/engineering/SOLANA.md` and `docs/GUARDRAILS.md`.

## Inspect

- `programs/pawket/programs/pawket/src/lib.rs`
- `programs/pawket/idl/pawket.json`
- `packages/pawket-sdk/src/solanaClient.ts`
- `packages/pawket-sdk/src/solanaClient.test.ts`

## Pattern

1. Accounts + constraints first (`seeds`, `bump`, signers, `has_one`).
2. Handler: saturating math, `Clock` for time, emit an event.
3. `anchor build` then `pnpm idl:sync`.
4. SDK: discriminator, account metas (order/signer/writable), arg encoding, PDA helper.
5. Lock the layout in `solanaClient.test.ts`.
6. Real case in `programs/pawket/tests/pawket.ts` — the stub does not count.

## Assumptions to verify

- Seed strings are the existing ones unless the task is a new account kind.
- Name 2–24 bytes, SKU 2–32 bytes (PDA cap).
- Shared string enums ≠ Borsh indexes. Encode in the SDK only.
- `register_item` is not admin. `record_purchase` does not take payment. Do not "finish" those by exposing them in UI.

## Do not

- Hand-edit discriminators or the committed IDL.
- Change `declare_id!` without updating `Anchor.toml`, SDK, and IDL together.
- Build instruction bytes in `apps/mobile`.

## Verify

```sh
cd programs/pawket && anchor build
pnpm idl:sync
pnpm invariants
pnpm --filter @pawket/sdk test
cd programs/pawket && anchor test
```
