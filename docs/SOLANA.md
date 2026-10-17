# Solana integration

The application uses Solana Kit, Wallet Standard and the checked-in Anchor
program. Meteora's SDKs and their web3.js v1/Anchor clients stay in
`src/server/coins/` and operational scripts; lint enforces that boundary.
Dependency versions live in package and toolchain files.

## Program identity and source

The current devnet program is `PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74`.
Its upgrade authority is a separate deploy wallet. `programs/pawket/src/lib.rs`
owns rules and layouts; `src/lib/solana/idl/pawket.json` is the committed IDL.
`pnpm program:build` builds SBF v2 and syncs that IDL. `program.test.ts` holds
client constants, discriminators, enum order, account roles and errors to it.

| Concern | Source |
| --- | --- |
| Identities, enums, limits and instruction discriminators | `src/lib/solana/program.ts` |
| PDA derivation and name validation | `src/lib/solana/pda.ts`, `src/lib/solana/names.ts` |
| Instruction construction | `src/lib/solana/instructions.ts` |
| Account decoding and chain-to-companion mapping | `src/lib/solana/accounts.ts` |
| Cluster, RPC and Explorer URLs | `src/lib/solana/cluster.ts` |
| Wallet discovery and browser RPC | `src/lib/solana/browser-client.ts` |
| Message verification, send and confirmation | `src/lib/solana/send.ts`, `src/lib/solana/transactions.ts` |
| Device routing and transaction feedback | `src/lib/solana/use-send.ts` |
| Sponsor allow-list and availability | `src/lib/solana/sponsor.ts`, `src/server/sponsor.ts` |

Never invent instruction bytes in a component. Program IDs, seeds,
discriminators, layouts and permissions cannot change as incidental cleanup.
An authorized program change requires a deploy plan and parity tests.

## Records

| Account | Purpose |
| --- | --- |
| `Pet` | Owner, identity, vitals, XP, cooldowns and wearing |
| `PetPassport` | Streaks, care/round counts and last eight cares |
| `PawketWallet` | Owner-controlled balance, linked device, expiry, action limits and accounting counters |
| `Closet` | Permanent Market entitlements and purchase totals |
| `Guild`, `GuildMember` | Community identity, founder and one membership per pet |
| `GuildEvent`, `EventRsvp` | Gatherings, attendance and check-in |
| `GuildPoll`, `Ballot` | Polls and one ballot per wallet |
| `Guestbook` | Wave count and last eight visitors |

Account seeds, sizes and field offsets belong to the program, IDL and decoder,
not a second specification. Decoders verify account owner and discriminator.
Program constraints bind writes to the signer and the related accounts.

Pet identity is the owner plus exact UTF-8 name bytes. The app trims names
before derivation; it does not case-fold chain identity. Keeping a local pet
creates a new chain record with its identity choices and initial progression;
it does not import local XP or history. The flow explains this before approval.

## Game math and reads

`src/lib/game/` and the program use the same integer care and decay math.
`src/lib/game/lockstep.txt` is replayed by Vitest and LiteSVM. A balance change
must move the browser math, program, fixture and both suites together.
[GAME-DESIGN.md](GAME-DESIGN.md) explains progression and fairness.

Browser reads use the shared Kit RPC and `useRequest`; Server Components use
`src/server/solana.ts`. `toCompanionRecord` produces the record shape screens
use for both local and chain pets. Vitals between confirmed cares are decay
estimates. Large discovery scans use bounded caches described in
[ARCHITECTURE.md](ARCHITECTURE.md); a transaction receipt requires confirmation
and a fresh read, not a cached discovery total.

## The Pawket Wallet

App actions require a linked, funded Pawket Wallet. There is no owner-wallet
fallback. Wallet Standard supplies owner identity and signing; Android
registers Mobile Wallet Adapter only in its shell. Connecting alone sends
nothing. Wallet setup remains available through the shell and `/wallet`.

The owner's signature opens the wallet, deposits or withdraws, links a device,
buys cosmetics and approves coin spending. Withdrawals go only to the owner.
Closing requires no linked device; balance returns to the owner and rent to
its recorded payer.

A device key is generated as non-extractable WebCrypto Ed25519 and committed
to IndexedDB before linking. The owner approves its expiry and daily limit;
the device co-signs. Unsupported browsers receive update guidance. Loss of
local storage requires a new owner-approved link; local deletion does not
revoke an existing chain link.

`DEVICE_VARIANTS` lists the fourteen non-money instruction twins. They cover
care, rounds, dressing, adoption, guild membership, gatherings and waves,
within the link's expiry and daily allowance. The program enforces the scope.
The device may unlink itself but cannot authorize spending. An absent link,
failed fresh read, expired link, exhausted limit or empty balance blocks an
action with recovery instructions.

The device receives a bounded fee float when linked. Without sponsorship,
eligible non-rent actions use that float; each refill is capped at one network
fee and the float's ceiling. Rent-bearing app actions wait for sponsorship.
A positive Pawket Wallet balance is required even while sponsored. History
comes from confirmed Solana transactions (`src/lib/wallet/history.ts`).

## Transaction lifecycle

Every app send goes through `usePawketSend` and `send.ts`:

1. Explicit player action acquires the shared send slot and prepares instructions.
2. The sponsor signs first when eligible; prepared coin transactions use the
   linked device as fee payer and require the owner's approval.
3. The authorized signer signs; the client verifies the message was not rewritten.
4. Broadcast uses preflight. Confirmation completes before record reload and
   care animation. The toast supplies the signature, fee payer and Explorer link.

Preparation and signing have bounded waits. A late signature is discarded,
never broadcast. A lost broadcast/confirmation answer keeps the known
signature and reports `unknown`; no replacement is sent automatically.
Declining sends nothing. There is no optimistic chain adoption, care or purchase.

Sponsor-first signing prevents wallet-added priority or guard instructions
from silently widening what the sponsor pays. A wallet that changes an already
signed message causes a refusal before broadcast.

## Sponsorship

`SPONSOR_KEYPAIR` is server-only and separate from upgrade and treasury
signers. `/api/sponsor` reports availability and co-signs approved transactions.
The sponsor pays eligible devnet fees and approved account rent; it never
pays Market prices or coin spending. Mainnet sponsorship is disabled.

`checkSponsorable` verifies the program, every instruction and sponsor role,
bounded signatures, no lookup tables and no compute-budget instructions.
`SPONSOR_SLOTS` is held to the IDL. Rent returned when leaving a guild or
closing a wallet goes to the recorded payer.

The sponsor stops below its float floor. It pays at most one new account's
rent a transaction. Per-instance limits cap each caller's actions and rents
(Actions count the posted wallet as well as the address); the hourly rent
budget is what the sponsor's balance has lost, plus rents signed in the last
two minutes, so requests that never land cannot use it up. Shared budget and
rate enforcement are mainnet requirements. UI copy must read current
availability before saying Pawket pays. [SECURITY.md](SECURITY.md) records limits.

## Solana Actions

Actions are an owner-approved flow independent of app device routing.
`/api/actions/adopt`, `/api/actions/care/[pet]`, `/api/actions/guild/[slug]`
and `/api/actions/wave/[pet]` return live cards or sponsored transactions.
They enforce the same game, membership and sponsor rules. A guild join uses
an eligible pet belonging to the signing wallet; care is owner-only, waves
exclude the owner and use the retained guestbook's daily check.

`/actions.json` maps shared page URLs to Actions. Responses include the
protocol's CORS, version and cluster headers; icons come from
`/api/actions/icon`. The app shares canonical page URLs. [ROUTES.md](ROUTES.md)
indexes endpoints; `src/server/actions.ts` owns the response helpers.

## Keepsakes (Metaplex Core)

A keepsake is a permanently frozen card pointing to the pet account. It
cannot transfer or burn; the Pet PDA remains authoritative. Core instructions
live in `src/lib/solana/core.ts` with byte-level tests. The collection address
is a checked source constant; its current authority is the sponsor.

`src/server/keepsake.ts` derives an asset signer from the sponsor secret and
pet address with HMAC. `readKeepsake` verifies the account exists under Core
before showing a card. Creation requires the owner, current sponsorship and
no existing card. The sponsor covers rent and authority; the owner signs the
prepared transaction through `sendPrepared`. Metadata is built from live pet
reads under `/api/keepsake/[pet]`.

Rotating the sponsor changes discovery addresses and authority requirements.
Q10 in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) must be resolved before rotation.
`scripts/keepsake-collection.mts` is the one-time collection setup tool; it is
not routine app startup and needs a separately approved authority plan.

## Guild coins (Meteora DBC → DAMM v2)

The server verifies the guild, creator, derived pool and mints, builds SDK
transactions and returns them for explicit owner approval. A guild's founding
pet must still be a member to launch. Coin identity is derived from the sponsor
secret and guild slug; no key means no coin discovery or launch.

Coin sends use atomic `fund_wallet_spend` / `settle_wallet_spend` brackets.
Both bind the same owner, wallet and reserved existing owner SOL through the
real instructions sysvar. SDK spending uses Pawket Wallet; settlement returns
change and sale proceeds. Missing, reordered or mismatched brackets, or
consuming reserved SOL, roll back. The linked device pays only network fees;
the sponsor refuses the brackets.

[METEORA-INTEGRATION.md](METEORA-INTEGRATION.md) owns presets, stages, quotes,
routing and operational scripts. [GUILDS.md](GUILDS.md) owns membership and
founder limits; [MARKETPLACE.md](MARKETPLACE.md) owns cosmetic spending.

## Devnet deployment

Program upgrades need an explicit deploy plan even on devnet. Build and run
`pnpm program:test`; inspect the IDL diff and preserve existing account layouts,
instruction identities, item slots and errors unless a migration is approved.
Record the current deployed binary before upgrading, check new size and extend
the program account if required. Store keys and recovery artifacts outside
tracked source. An approved deploy uses:

```sh
solana program deploy target/deploy/pawket.so \
  --program-id .keys/pawket-program.json --url devnet \
  --keypair ~/.config/solana/id.json --with-compute-unit-price 10000
```

The program keypair is needed for initial deployment; upgrades use the deploy
wallet's authority. Verify the source identity against the intended account.
After an authorized upgrade, run `pnpm e2e:devnet` and the opt-in browser signing
suites from [TESTING.md](TESTING.md). These create accounts and spend test SOL:
a separate test funder pays the test wallets, and the sponsor pays what it
sponsors ([ENVIRONMENT.md](ENVIRONMENT.md), "Devnet test keys").
[MAINNET.md](MAINNET.md) requires a separate release plan; do not repoint tests.

For localnet, run a validator, set the cluster to `localnet` and public RPC to
`http://127.0.0.1:8899`, then deploy under the approved identity with
`--url localhost`. Reload after changing cluster; a client uses one chain.
