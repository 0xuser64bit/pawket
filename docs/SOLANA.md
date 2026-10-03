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
| `Guild`       | `[b"guild", slug]`           | 235  | founder (wallet), founder pet, created, member count, crest glyph, crest colour, bump, slug, name, motto (strings last) |
| `GuildMember` | `[b"member", pet]`           | 145  | pet, guild, owner, payer (who gets the rent back), joined, bump — seeded by the pet, so one guild per pet |
| `PawketWallet` | `[b"wallet", owner]`        | 157  | owner, linked device (or the default key), the link's end, daily actions, the UTC day and today's count, all-time actions, deposited, withdrawn, spent (moved onto devices for fees, less what came back), rent payer, created, bump. Its lamports above rent are the balance |

| Instruction           | Signers              | Effect |
| --------------------- | -------------------- | ------ |
| `adopt_pet`           | owner, payer         | name 2–24 UTF-8 bytes; vitals 72; `payer` pays rent (the owner, or the sponsor) |
| `perform_care_action` | owner                | 30-min cooldown per action; decay to now; locked deltas; +10 XP; Passport ring, counts, streak |
| `finish_round`        | owner                | +25 XP for the first round of a UTC day; every round counts and moves the streak; vitals untouched |
| `dress`               | owner                | 0 (nothing) or 1–18, the wardrobe in catalog order |
| `found_guild`         | owner, payer         | slug 3–24 of `a-z0-9` and inner `-`; name 3–32 bytes; motto ≤ 80 bytes; crest < 8, colour < 6; the founding pet is the first member |
| `join_guild`          | owner, payer         | a pet takes its member account (one guild at a time); the count goes up |
| `leave_guild`         | owner                | the member account closes to its recorded `payer`; the count goes down; the guild stays |
| `open_wallet`         | owner, payer         | the owner's `PawketWallet`; `payer` pays its rent (the owner — the sponsor never pays a wallet's rent) |
| `deposit`             | owner                | lamports from the owner into the wallet (CPI transfer); counted in `deposited` |
| `withdraw`            | owner                | lamports from the wallet to the owner and nowhere else, never into its rent |
| `link_device`         | owner, device        | the device acts until `expires_at` (≤ 30 days), at most `daily_actions` (1–500) a UTC day; it signs to show it is there, is not the owner, and is handed its 0.001 SOL fee float from the balance; one device at a time |
| `unlink_device`       | owner or device      | ends the link; when the device signs, everything it holds comes back to the balance (it may pay its own fee and close to zero) |
| `close_wallet`        | owner                | no device linked; the balance to the owner, the rent to the recorded payer |
| `care_by_device`, `finish_round_by_device`, `dress_by_device` | device | the same rules and record as the owner's own, for the wallet owner's pets only, inside the link's end and today's limit; then the device's fee is refilled from the balance — by at most one fee (5,000 lamports) and never past its float |

Errors: 6000 `InvalidPetName`, 6001 `NotPetOwner`, 6002
`CareCooldownActive`, 6003 `UnknownWearable`, 6004 `InvalidGuildSlug`, 6005
`InvalidGuildName`, 6006 `InvalidGuildMotto`, 6007 `UnknownCrest`, 6008
`InvalidAmount`, 6009 `InsufficientBalance`, 6010 `InvalidDeviceLink`, 6011
`NotThisDevice`, 6012 `DeviceExpired`, 6013 `DailyLimitReached`, 6014
`NoDeviceLinked`, 6015 `DeviceStillLinked`. Each maps
to one sentence in `pawketErrorMessage` that says what did not change; a
second join (the member account "already in use") has its own sentence.
Events: `PetAdopted`, `CarePerformed`, `RoundFinished`, `PetDressed`,
`GuildFounded`, `GuildJoined`, `GuildLeft`, `WalletOpened`,
`WalletDeposited`, `WalletWithdrew`, `DeviceLinked`, `DeviceUnlinked`,
`WalletClosed`.

### The Pawket Wallet

A wallet popping up for every care is the price of a key in an extension.
The Pawket Wallet trades it for a scoped key on the device instead, with the
scope enforced by the program, not by Pawket:

- **The device key** (`src/lib/wallet/device.ts`) is made by WebCrypto as a
  non-extractable Ed25519 key and kept in that browser's IndexedDB, one per
  owner. Its secret half cannot be read or exported, by Pawket's code either;
  it can only sign. It is linked by the owner's own signature, and the device
  co-signs the link.
- **What it may sign** is `care_by_device`, `finish_round_by_device` and
  `dress_by_device` for the wallet owner's pets, before the link's end and
  under today's limit — and `unlink_device` for itself. Nothing that moves
  the balance takes a device's signature.
- **Who pays.** The device is its own fee payer (`sendAsDevice`). It is
  handed a 0.001 SOL float when linked, and each of its actions refills it
  from the balance by at most one fee, so the balance pays for those actions
  and nothing else; a key that leaked could spend no faster than the daily
  limit allows. The sponsor never signs a device's action
  (`checkSponsorable` refuses it in words): Pawket's float pays for prompts a
  person approves, not for a key that acts alone. It does pay the fee to
  open, fill, link, unlink, withdraw and close — and appears in none of
  those instructions.
- **The money** is the wallet account's own lamports above rent. Deposits
  come from the owner; a withdrawal and a close go only to the owner; the
  rent goes back to whoever paid it (always the owner — the sponsor never
  pays a wallet's rent, so opening and closing cannot drain it).
- **The history** is read from Solana (`src/lib/wallet/history.ts`): every
  transaction that touched the wallet account, decoded into what it was, how
  the balance moved and who paid the fee. Pawket keeps none of it.

`usePawketSend().act` sends an action for a pet the connected wallet keeps:
by this device, with no prompt, while it may act (linked, under today's
limit, holding a fee above its rent); otherwise by the wallet, as before.

A guild is people and their pets and nothing else: no token, no treasury,
no vote weight, and nothing in it touches a vital, XP or a score. The
program does not check that a slug is `slugFor(name)`; the app always
derives it, and `/guilds/new` is reserved. Pawket's delisting list
(`src/lib/guilds/delisted.ts`) only stops promotion — it cannot remove a
guild, take a pet out of one or undo anything.

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

`send.ts` is the one path: build with the builders → the sponsor signs
first, as fee payer → the wallet signs as owner → the message is checked to
be the one that was built → send with preflight on → confirm (`confirmed`,
30s timeout, then "unknown", never "failed") → reload from chain →
`TxReceipt` shows the signature, a copy control and an Explorer link. When
the player pays, the wallet is fee payer and signs alone. No optimistic
adopt/care state. The cooldown is checked before the wallet opens, with the
program's own rule.

Why the sponsor signs first: a wallet rewrites a transaction that carries no
signature yet — Phantom adds priority-fee and guard instructions — and the
sponsor refuses instructions that are not Pawket's. A transaction that
already carries a signature, a wallet signs as it is. If one rewrites it
anyway, the sponsor's signature no longer fits, and `send.ts` says so and
sends nothing.

## The sponsor

`/api/sponsor` pays fees, and the rent of a new pet, a new guild or a pet's
place in one, so a wallet with no SOL can play. Its key (`SPONSOR_KEYPAIR`, server-only) is a devnet hot wallet with a
small float — not the upgrade authority. `checkSponsorable` signs only when:

- every instruction is one of Pawket's, on Pawket's program, and not one a
  linked device takes (a device pays its own way);
- the sponsor is the fee payer, and appears in no instruction except as the
  `payer` of `adopt_pet`, `found_guild` or `join_guild` (rent it pays), or
  `leave_guild`'s `payer` (rent it gets back);
- there are no lookup tables and no compute-budget instructions (a priority
  fee is the one way to spend the float faster).

It signs before the player and does not send: the client sends, with
preflight on, so a transaction that would fail lands nothing and costs the
float nothing.

Rent — an adoption, a founding, a join or a keepsake — is limited to 20 an hour per caller (an
IP for the web app, a wallet for a Blink) and 120 an hour in all, which
bounds the worst case to under 0.5 SOL an hour; everything else to 240 an
hour per caller.
The limits live in one process's memory. Below 0.05 SOL, and on mainnet,
the sponsor is off and players pay. Pawket Wallet management (open,
deposit, withdraw, link, unlink, close) is sponsored like any other
instruction, and the sponsor takes no part in any of it. GET says
whether it is up; pages that say "Pawket pays" read the same state
(`src/server/sponsor.ts`).

## Blinks (Solana Actions)

Three Actions, so a pet can be adopted, cared for and join a guild from
wherever a Blink-aware client renders them (Phantom on X, wallets' own
browsers):

| Action | GET | POST `{ account }` |
| --- | --- | --- |
| `/api/actions/adopt` | the adoption card: species, temperament and name as parameters | an `adopt_pet` transaction the sponsor built and signed as fee and rent payer; chains to "Pepper is yours" |
| `/api/actions/care/<pet>` | the pet's card, read live, with feed, play, brush, rest | a care transaction, for the owner only; a care still cooling down is refused with the time left |
| `/api/actions/guild/<slug>` | the guild's card (its crest large), read live, with one Join | a `join_guild` for the wallet's newest pet on Solana that is in no guild; refused, in one sentence, when there is none or a pet of theirs is in already |

`/actions.json` maps the links people already share: `/adopt` →
`/api/actions/adopt`, `/pet/*` → `/api/actions/care/*`, `/guilds/*` →
`/api/actions/guild/*`. Every response has
the spec's CORS headers, `X-Action-Version: 2.4` and `X-Blockchain-Ids`
(the cluster's genesis). Icons are square cards from
`/api/actions/icon[?pet=|?guild=]`. A transaction the sponsor builds passes the
same `checkSponsorable` as one the player built; Blink adoptions are limited
per wallet, because a Blink client may proxy everyone through one address.
dial.to, Dialect's interstitial, was paused when this was built, so the app
links no renderer: the share link is the Blink.

## Keepsakes (Metaplex Core)

A pet on Solana can have one card in its owner's wallet: a Metaplex Core
asset (`CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`) in Pawket's
collection, devnet `5t7dqAEwdcG6C38XtHsMXbtwWyWZQFDqkjPy7JWPfEC9`, whose
update authority is the sponsor. `src/lib/solana/core.ts` encodes
`CreateV2` and `CreateCollectionV2` from mpl-core's IDL (`core.test.ts`
locks the bytes). Each card carries:

- `PermanentFreezeDelegate { frozen: true }`, held by the collection: it
  cannot be transferred or burned. There is no market, so it has no price.
- `Attributes`: `pet` (the `Pet` account), `species`, `personality`.
- URI `/api/keepsake/<pet>`: metadata built live from the pet's record —
  level, cares, longest run — with the pet's square card as the image.

`POST /api/keepsake/<pet> { account }` (owner only, sponsor up, card not
made yet) returns the creation signed by the sponsor (fee, rent, the
collection's say-so) and by the card's key; the owner's slot is open, and
`sendPrepared` in `send.ts` has the wallet sign it, checks the message is
unchanged, and sends with preflight on. The answer is shaped as a Solana
Action's. The card's key is `HMAC-SHA256(sponsor secret, "pawket keepsake
<pet>")`, so each pet has one card at one address, a second creation fails
at preflight, and the Passport finds it with one read (`readKeepsake`).
Rotating the sponsor key moves where new cards are looked for; the
collection's authority would have to move with it.

The collection was made once with
`pnpm dlx tsx scripts/keepsake-collection.mts https://pawket-pets.vercel.app`;
its own key signs only its creation and is not kept.

## Devnet workflow

Build and test: `pnpm program:test`. Deploy or upgrade:

```sh
solana program deploy target/deploy/pawket.so \
  --program-id .keys/pawket-program.json --url devnet \
  --keypair ~/.config/solana/id.json --with-compute-unit-price 10000
```

The program keypair lives in `.keys/` (ignored) and is only needed for the
first deploy; upgrades are signed by the deploy wallet. An upgrade larger
than the program account needs `solana program extend <id> <bytes>` first
(the guild upgrade of 2026-10-03 extended it by 120,000 bytes, the Pawket
Wallet upgrade of 2026-10-04 by 60,000 — the binary before it is
`target/backups/pawket-v3-devnet-2026-10-04.so`); dump the
deployed binary with `solana program dump` before any upgrade, so it can be
put back. Upgrades only ever add: an existing instruction, account layout or
error code does not change. `pnpm dlx tsx scripts/seed-guilds.mts` founds
the starter guilds and does only what is missing. Then
`pnpm e2e:devnet` (the path through the sponsor code, ending with a
keepsake) and `PAWKET_DEVNET=1 pnpm e2e e2e/chain.spec.ts` (the same through
the screens, with `e2e/test-wallet.ts`). Top the sponsor up from the deploy wallet with
`solana transfer <sponsor> 1 --url devnet`.

## Localnet (optional)

Run `solana-test-validator`, set `NEXT_PUBLIC_SOLANA_CLUSTER=localnet` and
`NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899` in `.env.local`, and
deploy with `--url localhost`. One client = one chain: reload after changing.
