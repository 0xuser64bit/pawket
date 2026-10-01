# Solana integration

Stack: `@solana/kit` v8 + `@solana/kit-plugin-wallet` + `@solana/react` +
`@solana-program/system`, and an Anchor 1.2 program. `@solana/web3.js` v1 and
`@solana/wallet-adapter-*` are legacy — do not introduce them.

## The program

`programs/pawket/src/lib.rs`, devnet
`PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`, upgradeable by the deploy
wallet. The IDL `pnpm program:build` writes is committed at
`src/lib/solana/idl/pawket.json`; `program.test.ts` holds every constant in
`program.ts` to it — discriminators, each builder's account order and roles,
enum variant order, error codes.

| Account       | Seeds                        | Size | Holds |
| ------------- | ---------------------------- | ---- | ----- |
| `Pet`         | `[b"pet", owner, name]`      | 130  | owner, species, personality, birth, level, XP, four vitals, `stats_updated_at`, last feed/play/groom/rest, wearing, bump, name (last, so every other offset is fixed) |
| `PetPassport` | `[b"passport", pet]`         | 169  | pet, owner, event/care/play counts, streak, best streak, last active UTC day, last bonus UTC day, the last eight cares, bump |

| Instruction           | Signers              | Effect |
| --------------------- | -------------------- | ------ |
| `adopt_pet`           | owner, payer         | name 2–24 UTF-8 bytes; vitals 72; `payer` pays rent (the owner, or the sponsor) |
| `perform_care_action` | owner                | 30-min cooldown per action; decay to now; locked deltas; +10 XP; Passport ring, counts, streak |
| `finish_round`        | owner                | +25 XP for the first round of a UTC day; every round counts and moves the streak; vitals untouched |
| `dress`               | owner                | 0 (nothing) or 1–6, the wardrobe in catalog order |

Errors: 6000 `InvalidPetName`, 6001 `NotPetOwner`, 6002
`CareCooldownActive`, 6003 `UnknownWearable`. Each maps to one sentence in
`pawketErrorMessage` that says what did not change. Events: `PetAdopted`,
`CarePerformed`, `RoundFinished`, `PetDressed`.

Pet identity is `(owner, exact UTF-8 name bytes)`. Names are trimmed
client-side before derivation and never case-folded.

`register_item`, `record_purchase` and `GameConfig` from the pre-reset
program are gone: neither instruction was admin-gated and neither moved
value, so neither could ever be a store.

## Game math lockstep

`src/lib/game/` mirrors the program: initial stat 72; Feed +23 hunger / +2
happiness, Play −6 hunger / +23 happiness / −12 energy, Groom +3 happiness /
+25 hygiene, Rest +28 energy; +10 XP per care; level `xp/100 + 1`; 30-minute
per-action cooldown; the daily round +25 XP; decay per hour hunger 2.5,
happiness 1.8, energy 1.5, hygiene 1.2.

Decay is computed exactly, in integers, on both sides: `round(v − rate·h)` is
`floor((36000·v − 10·rate·s + 18000) / 36000)` clamped to 0–100 (`s` whole
seconds). The program keeps it in i64 — the same arithmetic in i128 came out
wrong on SBF v2. `src/lib/game/lockstep.txt` is one scripted life the
LiteSVM suite replays against the program and Vitest replays against the
browser record; both must land on every number. A change to the math moves
`constants.ts`, `lib.rs`, the script and both suites together.

## Reading

`accounts.ts` decodes `Pet` and `PetPassport` by hand (fixed offsets locked
on both sides) and maps them to the companion record every screen draws
(`toCompanionRecord`), so projection, cooldowns and the streak run through
the same functions as a browser pet. `fetchPetsOnChain` filters
`getProgramAccounts` by discriminator and, optionally, owner at offset 8.
Server Components read through `src/server/solana.ts`; the browser through
`rpc` in `browser-client.ts`.

## Wallet

`walletWithoutSigner` from `@solana/kit-plugin-wallet`: Wallet Standard
discovery and connection, no fee payer installed. `send.ts` takes the
connected account's signer as the owner. Connect is offered only where it
does something (keeping a pet on Solana, finding the pets a wallet keeps),
in a Paper sheet that lists discovered wallets, links installs when there
are none, and says Pawket is on devnet.

## Transaction lifecycle

`send.ts` is the one path: build with the builders → the wallet signs as
owner (`partiallySignTransactionMessageWithSigners`) → the sponsor (or the
RPC, when the player pays) sends with preflight on → confirm (`confirmed`,
30s timeout, then "unknown", never "failed") → reload from chain →
`TxReceipt` shows the signature, a copy control and an Explorer link. No
optimistic adopt/care state. The cooldown is checked before the wallet
opens, with the program's own rule.

## The sponsor

`/api/sponsor` pays fees, and a new pet's rent, so a wallet with no SOL can
play. Its key (`SPONSOR_KEYPAIR`, server-only) is a devnet hot wallet with a
small float — not the upgrade authority. `checkSponsorable` signs only when:

- every instruction is one of Pawket's four, on Pawket's program;
- the sponsor is the fee payer, and appears in no instruction except as
  `adopt_pet`'s `payer`;
- there are no lookup tables and no compute-budget instructions (a priority
  fee is the one way to spend the float faster);
- every other signer has already signed.

Adoptions are limited per caller (3 an hour), everything else to 240 an hour;
below 0.05 SOL, and on mainnet, the sponsor is off and players pay. GET says
whether it is up; pages that say "Pawket pays" read the same state
(`src/server/sponsor.ts`).

## Devnet workflow

Build and test: `pnpm program:test`. Deploy or upgrade:

```sh
solana program deploy target/deploy/pawket.so \
  --program-id .keys/pawket-program.json --url devnet \
  --keypair ~/.config/solana/id.json --with-compute-unit-price 10000
```

The program keypair lives in `.keys/` (ignored) and is only needed for the
first deploy; upgrades are signed by the deploy wallet. Then
`pnpm e2e:devnet` (the path through the sponsor code) and
`PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts` (the same through the screens,
with `e2e/test-wallet.ts`). Top the sponsor up from the deploy wallet with
`solana transfer <sponsor> 1 --url devnet`.

## Localnet (optional)

Run `solana-test-validator`, set `NEXT_PUBLIC_SOLANA_CLUSTER=localnet` and
`NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899` in `.env.local`, and
deploy with `--url localhost`. One client = one chain: reload after changing.
