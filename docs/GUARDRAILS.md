# Guardrails

Things that break the product, the chain, or player identity if an agent "just edits" them.

## Never modify casually

| Path                                                                 | Why                                                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `programs/pawket/programs/pawket/src/lib.rs` `declare_id!`           | Program ID. Must stay in lockstep with `Anchor.toml`, SDK, IDL.                                |
| `packages/pawket-sdk/src/solanaClient.ts` `PAWKET_PROGRAM_ID`        | Client-side twin of `declare_id!`.                                                             |
| `packages/pawket-sdk/src/solanaClient.ts` discriminators + PDA seeds | A mismatch produces txs the program cannot execute.                                            |
| `programs/pawket/idl/pawket.json`                                    | Copy of the built IDL. Regenerate, do not invent.                                              |
| `programs/pawket/target/deploy/pawket-keypair.json`                  | Deploy keypair. Defines the program ID. Never commit. Never rotate without a planned redeploy. |
| `.env`, secrets, `MERCURYO_SECRET_KEY`                               | Not in git. Do not print.                                                                      |
| Companion secret in AsyncStorage (`pawket.companion.secret`)         | Device identity. Never log, never upload.                                                      |
| Production / mainnet RPC URLs                                        | Default is devnet. Do not point mobile at mainnet.                                             |

## Regenerate, don't edit

1. Change `lib.rs`.
2. `cd programs/pawket && anchor build`
3. `pnpm idl:sync`
4. Update `solanaClient.ts` (discriminators, accounts, seeds, builders).
5. `pnpm invariants`
6. Extend `packages/pawket-sdk/src/solanaClient.test.ts` and `programs/pawket/tests/pawket.ts`.

If `pnpm invariants` fails, the program and client have drifted. Fix the drift; do not skip the check.

## Verify before changing

- **PDA seeds** — pet identity is `(owner, exact name bytes)`. Changing seed order or prefixes orphans every account.
- **Name / SKU length** — names 2–24 UTF-8 bytes; SKUs 2–32 (PDA seed cap). Shared schema, SDK, and Rust must match.
- **Care math** — deltas, cooldown (1800s), XP (10), level (`xp/100+1`) exist in both `packages/shared` and `lib.rs`.
- **Network** — `Anchor.toml` provider is Localnet; mobile/SDK default to devnet. That split is intentional until deploy.
- **API auth** — there is none. Wallet address is whatever the client sends. Do not add purchases, inventory grants, or irreversible rewards on this.

## Test on localnet / devnet first

- Never target mainnet.
- `record_purchase` does **not** move tokens. Do not expose it as a paid action.
- `register_item` is permissionless. Do not treat it as an admin instruction.

## Companion key rules

- Generated on device, stored via `apps/mobile/src/wallet/storage.ts` (AsyncStorage today).
- `disconnect` ends the in-memory session and keeps the key.
- `startOver` / `reset` erases the key. That pet becomes unreachable from this device.
- This key is a **devnet game identity**, not a funds wallet. Do not send SOL/USDC from it.

## Copy rules

Do not write "on-chain", "signed", "confirmed", or "purchased" unless the corresponding path is implemented and verified.
