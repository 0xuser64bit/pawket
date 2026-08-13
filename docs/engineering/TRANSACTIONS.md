# Transaction standard

One lifecycle for every on-chain action. Do not invent a second one in a feature branch.

**Today:** the SDK builds unsigned init / adopt / care transactions. Nothing in mobile signs or sends them. Adopt and care go through the API.

**Do not** send a program transaction as a silent extra write beside an API call.

## Lifecycle

1. **Gather state** — wallet address, pet name, action, from `PawketSession`.
2. **Validate client-side** — `@pawket/shared` schemas + SDK `normalizePetName`. Trim names before PDA derivation.
3. **Derive PDAs** — `derivePetPda` / `derivePassportPda` / … in `solanaClient.ts`. Never `findProgramAddressSync` in a screen.
4. **Build instruction** — `buildAdoptPetTransaction` / `buildCareTransaction` / `buildInitializeGameConfigTransaction`.
5. **Simulate** — `connection.simulateTransaction` against the configured RPC. Surface program logs; do not send a failing sim.
6. **Sign** — the active `PawketWalletAdapter`. Today that is `DeviceWalletAdapter.signMessage` only (messages, not txs). A future MWA adapter must implement tx signing without changing callers.
7. **Send** — `sendRawTransaction` with `skipPreflight: false`.
8. **Confirm** — `confirmed` commitment (matches `PawketProgramClient`'s connection). Timeout 30s, then treat as unknown — not failed, not succeeded.
9. **Parse** — decode program errors (`PawketError` 6000+) into the same strings the API uses (`CARE_COOLDOWN_ACTIVE`, `NOT_PET_OWNER`, …).
10. **Refresh app state** — `refreshPet` / `loadPassport`. The session remains the UI source of truth.
11. **Failure** — set `session.error`, do not increment local XP, do not play the care celebration.

## Rules

| Topic            | Standard                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Builder home     | `@pawket/sdk` only                                                                                                  |
| Fee payer        | Owner, unless a later relayer is explicitly designed                                                                |
| Blockhash        | Fetch immediately before sign; builders accept `recentBlockhash`                                                    |
| Simulation       | Required before first send of a new instruction                                                                     |
| Confirmation     | `confirmed`, 30s timeout                                                                                            |
| Retry            | Retry send only on network drop, with the **same** signed tx. New blockhash ⇒ new signature ⇒ user must sign again. |
| Duplicate submit | Disable the CTA while `status` is `caring` / `adopting` / a new `sending` status.                                   |
| Optimistic UI    | **Forbidden** for adopt/care. Wait for confirm (or API success, on the current path).                               |
| Stale state      | After confirm, reload pet from the source of truth. Do not patch stats by guessing deltas.                          |
| User errors      | Map to one sentence. Cooldown uses the shared `validateCareCooldown` copy.                                          |

## Dual-write policy

When on-chain adopt/care is wired, pick **one** and write it in the PR:

- **Chain-first (default):** sign/send/confirm the program tx, then upsert the API as a projection (indexer-style). Daily goals / decay stay API until they have on-chain twins.
- **API-first:** keep the current loop; chain write is a later attestation. Only acceptable if the API remains authoritative and the UI does not say "on-chain."

Never: API success + ignored failing chain tx, or chain success + skipped API with the UI showing API stats.

Decay exists only off-chain. If care becomes chain-first, either port decay on-chain or stop applying it on that path. Do not apply it on one side only.

## Identity

The companion key address **is** the intended `owner` pubkey. If MWA replaces it, PDAs must be derived from the **signing** wallet, and existing API rows will not follow automatically. That migration needs an explicit plan — do not swap adapters and keep sending the old address.
