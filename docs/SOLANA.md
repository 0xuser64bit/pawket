# Solana integration

Stack: `@solana/kit` v8 + `@solana/kit-plugin-rpc` + `@solana/kit-plugin-wallet`
+ `@solana/react` + `@solana-program/system`. This is the maintained path per
the official Solana frontend docs. `@solana/web3.js` v1 and
`@solana/wallet-adapter-*` are legacy — do not introduce them.

## Program contract

Program ID `FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef` (devnet).

| Account          | Seeds                              |
| ---------------- | ---------------------------------- |
| `GameConfig`     | `[b"game_config"]`                 |
| `Pet`            | `[b"pet", owner, name]`            |
| `PetPassport`    | `[b"passport", pet]`               |
| `ItemDefinition` | `[b"item", sku]`                   |
| `ItemOwnership`  | `[b"ownership", owner, item]`      |

Pet identity is `(owner, exact UTF-8 name bytes)`. Names are 2–24 bytes,
trimmed client-side before derivation. Discriminators and Borsh layouts live
in `src/lib/solana/program.ts` + `instructions.ts` — components must never
re-encode them.

Builders exist only for `initialize_game_config`, `adopt_pet`, and
`perform_care_action`. `register_item` is not admin-gated and
`record_purchase` moves no tokens: no builders, no UI, until the program
changes.

## Game math lockstep

`src/lib/game/` mirrors the program: initial stat 72, Feed +23 hunger / +2
happiness, Play −6 hunger / +23 happiness / −12 energy, Groom +3 happiness /
+25 hygiene, Rest +28 energy, XP +10 per care, level `xp/100 + 1`, 30-minute
per-action cooldown. Decay (hunger 2.5, happiness 1.8, energy 1.5, hygiene
1.2 per hour) is off-chain only. If the program changes, math + tests move
together.

## Wallet

Wallet Standard discovery via the `walletSigner` plugin: the connected wallet
is fee payer + identity. Hooks (`useWallets`, `useConnect`, `useDisconnect`,
`useConnectedWallet`, `useWalletStatus`) take the client as first argument —
pull it from `useClient<AppClient>()`. Handle `pending` status with a neutral
placeholder, and empty discovery with install guidance.

## Transaction lifecycle

See `src/lib/solana/transactions.ts` and follow it exactly: explicit user
action → client-side validation → PDA derivation → instruction builder →
simulate (preflight on) → wallet sign → send → confirm (`confirmed`, 30s
timeout, then unknown-not-failed) → reload from source of truth → signature +
Explorer link. Map program errors 6000–6005 to the one-sentence copy in
`pawketErrorMessage`. No optimistic adopt/care state, no silent dual-writes.

## Devnet workflow

1. `pnpm dev`, connect a devnet-funded wallet.
2. Use the SOL transfer card to prove the path (small amount, e.g. 0.001).
3. Confirm the signature link opens the Explorer on the active cluster.
4. Airdrop via `https://faucet.solana.com` when funds run low.

## Localnet (optional)

Run `solana-test-validator`, set `NEXT_PUBLIC_SOLANA_CLUSTER=localnet` and
`NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899` in `.env.local`. One
client = one chain: the provider picks it up on reload.
