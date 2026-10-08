# Solana integration

Stack: `@solana/kit` v8 + `@solana/kit-plugin-wallet` + `@solana/react` +
`@solana-program/system`, and an Anchor 1.2 program. `@solana/web3.js` v1 and
`@solana/wallet-adapter-*` are legacy — do not introduce them. The one
exception is Meteora's SDKs, which are built on web3.js v1 and Anchor: they
run on the server only, in `src/server/coins/` (and the scripts that set
Pawket's presets up), and a lint rule refuses them anywhere else.

## The program

The Android app routes non-money actions through its linked Pawket Wallet.
It reads the link fresh before every action; setup, expiry, limits and a fee
shortfall are actionable refusals, not an automatic wallet-app redirect.
The shell keeps setup visible on every page. Purchases, deposits, withdrawals
and prepared coin/keepsake transactions still need the owner's approval.
One shared send slot covers preparation through confirmation across screens.
Sponsor/preparation requests are bounded; an unanswered wallet signature
times out after 90 seconds and any late answer is never broadcast.
Device-key creation waits for the IndexedDB transaction to commit before
linking it, so an aborted storage write cannot leave an unusable chain link.
Connecting dismisses the chooser and returns to the action the player was
doing; Pawket Wallet setup remains visible in the app's shell.

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
| `PawketWallet` | `[b"wallet", owner]`        | 157  | owner, linked device (or the default key), the link's end, daily actions, the UTC day and today's count, all-time actions, deposited, withdrawn, spent (device fees, Market purchases and net coin spending), rent payer, created, bump. Its lamports above rent are the balance |
| `Closet`      | `[b"closet", owner]`         | 83   | owner, a 256-bit set of the Market items it holds, count, lamports paid in all, bump |
| `GuildEvent`  | `[b"event", guild, id u32]`  | 285  | guild, creator, id, starts, ends, created, going, came, bump, title (48), note (120) |
| `EventRsvp`   | `[b"rsvp", event, pet]`      | 146  | event, pet, owner, payer, when, came, bump |
| `GuildPoll`   | `[b"poll", guild, id u32]`   | 309  | guild, creator, id, created, closes, four counts, bump, question (80), up to four options (24 each) |
| `Ballot`      | `[b"ballot", poll, owner]`   | 146  | poll, owner, pet, payer, option, when, bump — seeded by the wallet, so one vote per person |
| `Guestbook`   | `[b"guestbook", pet]`        | 365  | pet, waves, the last eight visitors and when, bump |

| Instruction           | Signers              | Effect |
| --------------------- | -------------------- | ------ |
| `adopt_pet`           | owner, payer         | name 2–24 UTF-8 bytes; vitals 72; `payer` pays rent (the owner, or the sponsor) |
| `perform_care_action` | owner                | 30-min cooldown per action; decay to now; locked deltas; +10 XP; Passport ring, counts, streak |
| `finish_round`        | owner                | +25 XP for the first round of a UTC day; every round counts and moves the streak; vitals untouched |
| `dress`               | owner                | 0 (nothing) or 1–18, the wardrobe in catalog order |
| `found_guild`         | owner, payer         | slug 3–24 of `a-z0-9` and inner `-`; name 3–32 bytes; motto ≤ 80 bytes; crest < 8, colour < 6; the founding pet is the first member |
| `join_guild`          | owner, payer         | a pet takes its member account (one guild at a time); the count goes up |
| `leave_guild`         | owner                | the member account closes to its recorded `payer`; the count goes down; the guild stays |
| `open_wallet`         | owner, payer         | the owner's `PawketWallet`; `payer` pays its rent (the owner or the sponsor) and gets it back when it closes |
| `deposit`             | owner                | lamports from the owner into the wallet (CPI transfer); counted in `deposited` |
| `withdraw`            | owner                | lamports from the wallet to the owner and nowhere else, never into its rent |
| `link_device`         | owner, device        | the device acts until `expires_at` (≤ 30 days), at most `daily_actions` (1–500) a UTC day; it signs to show it is there, is not the owner, and is handed its 0.001 SOL fee float from the balance — the whole float or, when the balance cannot cover it, none; one device at a time |
| `unlink_device`       | owner or device      | ends the link; when the device signs, everything it holds comes back to the balance (it may pay its own fee and close to zero) |
| `close_wallet`        | owner                | no device linked; the balance to the owner, the rent to the recorded payer |
| `*_by_device` (14: care, round, dress, dress owned, adopt, found, join, leave, event, RSVP, check-in, poll, vote, wave) | device | the owner instruction's own rules, arguments and record, for the wallet owner and their pets only, inside the link's end and today's limit. Accounts: the device and the Pawket Wallet where the owner was, then the owner instruction's in order (`asDeviceInstruction`). A device that paid its own fee is refilled from the balance — by at most one fee (5,000 lamports) and never past its float |
| `buy`                 | owner, payer         | one Market item at its fixed price (`item_price`: pieces 4–22 at 0.05 SOL, rooms 64–71 at 0.1 SOL, frames 80–83 at 0.025 SOL), from the owner to `TREASURY` and nowhere else; the closet records it; `payer` covers the closet's rent the first time |
| `buy_with_wallet` | owner, payer | the app's purchase instruction: price debited from the owner's Pawket Wallet above rent, to the fixed treasury; same Closet receipt |
| `fund_wallet_spend`, `settle_wallet_spend` | owner | atomic first/last brackets around coin transactions; funded from Pawket Wallet, existing owner SOL reserved, unused SOL and proceeds returned; device pays network fees only |
| `dress_owned`, `dress_owned_by_device` | owner, or device | one of the three starters, or a Market piece the owner's closet holds |
| `create_event`        | owner (the guild's founder), payer | an event: a 3–48 byte title, a note to 120, ending after it starts and after now, at most 7 days long, starting within 60 days |
| `rsvp`                | owner, payer         | a pet in the event's guild is going; one RSVP per pet, until the event ends |
| `check_in`            | owner                | from 15 minutes before the start until the end, once |
| `create_poll`         | owner (the founder), payer | a 3–80 byte question, 2–4 options of 1–24 bytes, open 10 minutes to 14 days |
| `vote`                | owner, payer         | a wallet with a pet in the guild answers once, before it closes |
| `wave`                | visitor, payer       | anyone but the pet's owner, once a UTC day; the guestbook is made on the first wave (`payer` covers its rent) |

Errors: 6000 `InvalidPetName`, 6001 `NotPetOwner`, 6002
`CareCooldownActive`, 6003 `UnknownWearable`, 6004 `InvalidGuildSlug`, 6005
`InvalidGuildName`, 6006 `InvalidGuildMotto`, 6007 `UnknownCrest`, 6008
`InvalidAmount`, 6009 `InsufficientBalance`, 6010 `InvalidDeviceLink`, 6011
`NotThisDevice`, 6012 `DeviceExpired`, 6013 `DailyLimitReached`, 6014
`NoDeviceLinked`, 6015 `DeviceStillLinked`, 6016 `UnknownItem`, 6017
`AlreadyOwned`, 6018 `NotInCloset`, 6019 `InvalidEvent`, 6020
`NotGuildFounder`, 6021 `NotInGuild`, 6022 `EventOver`, 6023
`NotCheckInTime`, 6024 `AlreadyCheckedIn`, 6025 `InvalidPoll`, 6026
`PollClosed`, 6027 `UnknownOption`, 6028 `CannotWaveAtOwnPet`, 6029
`AlreadyWavedToday`. Each maps
to one sentence in `pawketErrorMessage` that says what did not change; a
second join (the member account "already in use") has its own sentence.
Events: `PetAdopted`, `CarePerformed`, `RoundFinished`, `PetDressed`,
`GuildFounded`, `GuildJoined`, `GuildLeft`, `WalletOpened`,
`WalletDeposited`, `WalletWithdrew`, `DeviceLinked`, `DeviceUnlinked`,
`WalletClosed`, `ItemBought`, `EventCreated`, `EventRsvped`, `CheckedIn`,
`PollCreated`, `Voted`, `Waved`.

### The Pawket Wallet

A wallet popping up for every care is the price of a key in an extension.
The Pawket Wallet trades it for a scoped key on the device instead, with the
scope enforced by the program, not by Pawket:

- **The device key** (`src/lib/wallet/device.ts`) is made by WebCrypto as a
  non-extractable Ed25519 key and kept in that browser's IndexedDB, one per
  owner. Its secret half cannot be read or exported, by Pawket's code either;
  it can only sign. It is linked by the owner's own signature, and the device
  co-signs the link.
- **What it may sign** is every instruction the owner signs for their pets
  except money: care, rounds, clothes, adoption, guilds, events, check-ins,
  votes and waves — each a `*_by_device` twin (`DEVICE_VARIANTS`), for the
  wallet owner and their pets only, before the link's end and under today's
  limit — and `unlink_device` for itself. A device cannot authorize a balance
  transfer or Market purchase. For coins it co-signs only as fee payer; the
  owner must approve every spend.
- **Who pays.** The sponsor, exactly as for the owner: the fee, and the rent
  where the owner's instruction has a `payer`. So a player with an empty
  wallet opens a Pawket Wallet (the sponsor pays its rent, back to it on
  close), deposits a balance and links the device. App actions require a positive balance even while sponsored.
  With no sponsor, the device is its own fee payer: it is handed a 0.001 SOL
  float when linked (if the balance holds one), and each action it pays for
  refills it from the balance by at most one fee, so a key that leaked could
  spend no faster than the daily limit allows; anything that would need it
  to pay rent waits for sponsorship; no owner-wallet fallback.
- **The money** is the wallet account's own lamports above rent. Deposits
  come from the owner; a withdrawal and a close go only to the owner; the
  rent goes back to whoever paid it (`rent_payer`: the owner, or the sponsor
  when it paid), so opening and closing cannot drain the sponsor, and the
  balance never reaches into the rent.
- **The history** is read from Solana (`src/lib/wallet/history.ts`): every
  transaction that touched the wallet account, decoded into what it was, how
  the balance moved and who paid the fee. Pawket keeps none of it.

`usePawketSend().act` sends anything for the connected wallet's pets that
costs no money: built as the owner would sign it, then turned into its twin
and signed by this device with no prompt while it may act (linked, under
today's limit and with a positive balance). An unavailable link, exhausted limit, empty balance or failed fresh read blocks the action with recovery instructions; the owner wallet is never a fallback.

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
the send's toast (`tx-toast.tsx`, pushed by `usePawketSend`) says who paid
and links the signature on the Explorer. When
the player pays, the wallet is fee payer and signs alone. No optimistic
adopt/care state. The cooldown is checked before the wallet opens, with the
program's own rule.

The progress message stays at preparation through blockhash reads, sponsor
cosigning and server-built transaction fetches. It says signing only when
the signer is called, so a slow network is not described as a wallet prompt.

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

- every instruction is one of Pawket's, on Pawket's program — a linked
  device's twin is sponsored as its owner's instruction would be;
- the sponsor is the fee payer, and appears in no instruction except as the
  `payer` of `adopt_pet`, `found_guild`, `join_guild`, `open_wallet`, `buy`
  (the closet, never the price), `create_event`, `rsvp`, `create_poll`,
  `vote` or `wave` (rent it pays), or `leave_guild`'s `payer` (rent it gets
  back) — one account later in a device's twin;
- there are no lookup tables and no compute-budget instructions (a priority
  fee spends the float faster);
- it carries at most three signatures — the sponsor, the owner and a device
  being linked — since each is a fee the sponsor pays, and Anchor takes extra
  signer accounts without a word.

It signs before the player and does not send. Pawket's client sends with
preflight on, so its own failures land nothing; a caller who skips preflight
can land one that fails, and the float pays its fee, inside the limits below.

Rent — an adoption, a founding, a join, a keepsake, a closet, an event, an RSVP, a poll, a ballot or a guestbook — is limited to 20 an hour per caller (an
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
| `/api/actions/care/<pet>` | the pet's card, read live, with feed, play, brush, rest — and "Adopt your own", for everyone who is not the owner | a care transaction, for the owner only; a care still cooling down is refused with the time left |
| `/api/actions/guild/<slug>` | the guild's card (its crest large), read live, with one Join | a `join_guild` for the wallet's newest pet on Solana that is in no guild; refused, in one sentence, when there is none or a pet of theirs is in already |
| `/api/actions/wave/<pet>` | (linked from the pet's card) | a `wave` for any wallet but the owner's, once a UTC day; the sponsor pays the fee, and the guestbook's rent the first time |

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
`pnpm dlx tsx scripts/keepsake-collection.mts https://pawket.world`;
its own key signs only its creation and is not kept.

## Guild coins (Meteora DBC → DAMM v2)

A guild may launch one optional coin. Pawket is Meteora's *partner*: it made
one Dynamic Bonding Curve config account per preset (`COIN_CONFIGS` in
`src/lib/coins/presets.ts`, made by `scripts/coin-presets.mts` with the
deploy wallet paying), and every coin on a preset is a pool on that config.

| Preset | Price along the curve | Graduates (devnet / mainnet) |
| --- | --- | --- |
| `gentle` | rises 3× | about 2.2 SOL / 11 SOL raised |
| `lively` | rises 10× | about 2.4 SOL / 12 SOL raised |

Both: 1,000,000,000 coins, 6 decimals, SPL token, immutable authority, no
locked vesting, a flat 1% fee (`creatorTradingFeePercentage` 50, so after
Meteora's 20% the founder and Pawket's treasury halve it), a 0.01 SOL
launch fee to the partner, migration to DAMM v2 (`FixedBps100`) with 100% of
the liquidity permanently locked — 50% in the creator's position, 50% in
the partner's. The treasury (`PAWKET_TREASURY`, `.keys/treasury.json`) is
the fee claimer and leftover receiver; its key is never on the server.

**One coin per guild.** The mint's key is
`HMAC-SHA256(sponsor secret, "pawket guild coin <slug>")`, so the coin is
found with one read (the pool is `deriveDbcPoolAddress(wSOL, mint, config)`
for each preset), only Pawket's server can make it, and a second launch
fails at preflight. Coins are off where the sponsor's key is not set.

**The server builds, the player signs** (`src/server/coins/meteora.ts`,
the one module that imports Meteora's SDKs — a lint rule keeps them and
web3.js v1 in `src/server/coins/` and `scripts/`):

| Route | What it builds |
| --- | --- |
| `GET /api/coins/<slug>/quote?side&amount&slippage` | a quote: on the curve (`swapQuote2`, partial fill) or in the verified pool (`CpAmm.getQuote`) |
| `POST /api/coins/<slug>/launch` | `createPoolWithFirstBuy`, founder only, three pets in the guild; the mint signs here |
| `POST /api/coins/<slug>/trade` | `swap2` on the curve (partial fill: a buy that fills it takes only what graduation needs) or `swap` in the DAMM v2 pool, at no worse than the quote's `minimumOut` |
| `POST /api/coins/<slug>/graduate` | `migrateToDammV2` once the curve is full; the two position NFT keys sign here. Devnet only needs it — Meteora's keepers migrate on mainnet |
| `POST /api/coins/<slug>/claim` | `claimCreatorTradingFee` for the wallet that launched it; with `from: "pool"`, `claimPositionFee` for what the wallet's locked positions in the graduated pool earned |
| `GET /api/coins/<slug>/position?account=` | a wallet's positions in the graduated pool and their unclaimed fees (`getUnClaimLpFee`) |
| `GET /api/coins/<slug>/metadata` | the token's metadata JSON (the URI the mint carries), with the crest card as its image |

Every transaction comes back as base64 for `sendPrepared` with
`sponsored: false`: the linked device pays the fee and the owner approves.
`forPlayer` surrounds the SDK instructions with `fund_wallet_spend` and
`settle_wallet_spend`. Funding temporarily makes the available Pawket
Wallet balance usable by the SDK; settlement returns all change and SOL
proceeds. Both brackets bind the same owner/wallet/reserved SOL through the
real instructions sysvar, and the program refuses any transaction that
would consume preexisting owner SOL. Network-fee float refill is capped.
The sponsor refuses both brackets. Every send still uses preflight. **Stages** are decided on the server from chain
(`coinStage` in `src/lib/coins/stage.ts`): a curve below its threshold is
`dbc`; full, or migrated but its pool not found where the preset derives
(`deriveDammV2PoolAddress(DAMM_V2_MIGRATION_FEE_ADDRESS[option], mint,
wSOL)`), is `pending`, and trading pauses; migrated with that pool present
and holding the right mints is `damm`; a delisted guild's coin is
`suspended` — Pawket stops offering trades and changes nothing on chain.
Holders are read from the coin's token accounts (less the pools' vaults) for
the page's counts and the crest pins. `pnpm e2e:coins` walks a coin's whole
life on devnet: launch with a first buy, buys to the threshold, graduation,
a sale in the DAMM v2 pool, the founder's claim. Pawket's own side —
partner trading fees, launch fees and its locked positions' LP fees — is
collected into the treasury by `scripts/claim-coin-fees.mts`, signed by the
treasury's key, which never sits on the server.

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
`.keys/backups/`, named by the date it was replaced); dump the
deployed binary with `solana program dump` before any upgrade, so it can be
put back. The owner-approved 8 October Market change moves former free choices into the Market without renumbering slots or stripping equipped pieces. Otherwise upgrades only ever add: an existing instruction, account layout or
error code does not change. `pnpm dlx tsx scripts/seed-guilds.mts` founds
the starter guilds and does only what is missing. Then
`pnpm e2e:devnet` (the path through the sponsor code, ending with a
keepsake) and `PAWKET_DEVNET=1 pnpm e2e --workers=1 e2e/chain.spec.ts e2e/coins.spec.ts` (the same through
the screens, with `e2e/test-wallet.ts`). Top the sponsor up from the deploy wallet with
`solana transfer <sponsor> 1 --url devnet`.

## Localnet (optional)

Run `solana-test-validator`, set `NEXT_PUBLIC_SOLANA_CLUSTER=localnet` and
`NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899` in `.env.local`, and
deploy with `--url localhost`. One client = one chain: reload after changing.
