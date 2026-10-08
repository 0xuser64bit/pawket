# Security

Why Pawket's rules hold, what the audits of 7 and 8 October 2026 came to,
and what is known to be left. The rules live where they are enforced: the
program in `programs/pawket/src/lib.rs`, what the sponsor signs in
`src/lib/solana/sponsor.ts` (described in `docs/SOLANA.md`), the hard rules
in `AGENTS.md`.

## Why the program's accounts can be trusted

- Only `init` makes an account of the program's, and every `init` is at the
  account's PDA. `Account<T>` checks owner and discriminator, so an account
  of a type is one the program made, where it belongs.
- Every account an instruction changes is derived from its seeds, or bound
  by a stored key (`has_one`, a `constraint`) to a signer or to an account
  that is. A pet's passport and a guild being joined are held to their seeds
  outright.
- The two `init_if_needed` accounts, a closet and a guestbook, are held to
  whose they are when they exist already, as `init` makes them so when new.
- Lamports move from the owner or their Pawket Wallet to the treasury (`buy`, `buy_with_wallet`, at a price fixed
  in the program); from an owner into their own Pawket Wallet and back
  (`deposit`, `withdraw`, `close_wallet`); from the balance to a linked
  device (its float, then at most one fee per action inside the owner's
  daily limit) and back when it unlinks itself; and as rent, which
  `leave_guild` and `close_wallet` hand back to whoever paid it.
- Release builds have `overflow-checks` on, so arithmetic the program leaves
  unchecked aborts its transaction instead of wrapping. Counters saturate,
  and a caller's numbers are checked or bounded before arithmetic touches
  them (an event's span with `checked_sub`; its start, by that span).
- Nothing stored can make care fail: decay stops counting past
  `DECAY_HORIZON_SECONDS`, so a pet left for any length of time is cared
  for like any other.

`pnpm program:test` forges what a cluster cannot hold — a passport, a guild
or a Pawket Wallet copied to another address, a closet or guestbook that
names someone else — and shows each refused. Every check that keeps one
player's state from another is tried by the wrong hands there too.

### What a change must not break

- **The first rule above.** Care takes a pet, planning takes a guild, an
  RSVP takes an event and a vote a poll by type alone, trusting that only
  `init` at a PDA made them. So no `zero` or keypair-made accounts and no
  `realloc`; and a field that says whose an account is or what it belongs
  to (an owner, a founder, a guild, a device) is written only with that
  party's signature. Otherwise every one of those becomes forgeable.
- **A pet's owner never changes.** The passport, a guild place, an RSVP and
  a ballot each copy it, and one ballot per wallet rests on it. A transfer
  would have to move or retire each.
- **A device has no twin for money.** `DEVICE_VARIANTS` and the program's
  `*_by_device` list are held to each other (`program.test.ts`).
- **The sponsor stands only where the program says `payer` or
  `rent_payer`.** `SPONSOR_SLOTS` is held to the IDL by index
  (`sponsor.test.ts`), so reordering an instruction's accounts fails there
  before the sponsor can sign as anything else.

## The audit of 7 October 2026

An automated review of commit `aff66a4`: pattern checks over 416 files,
known advisories in the npm and Rust packages, secrets, configuration. It
confirmed no defect in Pawket's code, and listed 68 patterns "worth a look"
and 12 package notes. Each was read against the code.

### Pawket's code

| # | Finding | What it came to |
| --- | --- | --- |
| 1 | `passport` not validated (`care_by_device`) | Bound only by `has_one = pet`: a copy at another address would have passed. Held to `[b"passport", pet]` in care, rounds and their device twins (a2ebe34). |
| 3 | `guild` not validated (`join_guild_by_device`) | Bound by nothing, so a copy would have passed. Held to `[b"guild", slug]` in both joins (a2ebe34). Leaving was already bound by the member account. |
| 2, 4, 5 | `init_if_needed` on `closet`, `guestbook` | Their PDAs name whose they are and only these handlers write them. An existing one that names someone else is now refused (945ee47). |
| 12 | `closet` read before a CPI, written after | The transfer touches only the owner and the treasury, pinned by address. `buy` now writes the closet first all the same (945ee47). |
| 6 | Possible leaked key, `src/lib/guest/storage.ts:12` | A localStorage key name. gitleaks over all history and the tree finds no credential ever committed. Marked `gitleaks:allow`, with `src/lib/play/best.ts` (37f90c8). |
| 7 | `android:allowBackup="true"` | Backups already left WebView storage, and so the device key, out. Backup is now off; phone-to-phone transfer still leaves it out (8384821). |
| 8 | Exported activity, no permission | It is the launcher and the App Links target, so it must be exported. It loads a link only when the link's origin is exactly Pawket's; the bridge is registered for that origin and answers its main frame only. Unchanged. |
| 9 | `dangerouslySetInnerHTML`, `app/layout.tsx` | `THEME_SCRIPT` is a build-time constant: the storage key and the room ids, JSON-encoded, setting only an id from that list (`src/config/themes.test.ts`). No request data reaches it. Unchanged. |
| 10, 11, 13–17 | Unchecked arithmetic, program | Overflow aborts, and most sums are bounded. One took a caller's numbers into a subtraction: `create_event`'s span, which now returns `InvalidEvent` where it panicked. `act`'s sums saturate (7b19fcb). |
| 18–59 | Unchecked arithmetic, tests | Tests run with overflow checks; an overflow fails the test. Unchanged. |
| 60–62 | `http://` endpoint, `src/server/card.tsx` | `http://www.w3.org/2000/svg` is the SVG namespace, which must be exactly that. Nothing is fetched. Unchanged. |
| 63–65 | Writable `UncheckedAccount`: `payer`, `rent_payer` | Held by `has_one` on the account they come from (`member.payer`, `wallet.rent_payer`); the tests send that rent elsewhere and are refused. Unchanged. |
| 66–68 | `@solana/web3.js` v1 imports | Only in `src/server/coins/`, where Meteora's SDKs need it; a lint rule refuses it elsewhere. Unchanged. |

### Packages

| Package | What it came to |
| --- | --- |
| bigint-buffer 1.1.5 (high, no fixed release) | Under spl-token through Meteora's SDKs, on the server. Its native addon was never built; `patches/bigint-buffer@1.1.5.patch` removes it, so only the pure-JS path runs (4831406). |
| toml 3.0.0 (high) | 4.3.0 (22c26ec). Anchor's client parses only a local `Anchor.toml`, through `anchor.workspace`, which Pawket never reads. |
| bn.js 5.2.2 | 5.2.5 (22c26ec). |
| stream-json 1.9.1 | Gone: jayson 5.0.0 keeps the browser client web3.js loads and drops it (22c26ec). |
| uuid 8.3.2 | 11.1.1, the last patched line with a CommonJS build (22c26ec). |
| rand 0.7.3, derivative, libsecp256k1, paste, ansi_term | Only in the LiteSVM test harness; none is in the program. |
| bincode 1.3.3 (unmaintained) | In the program through anchor-lang and Solana's instruction crates, which encode system instructions with it. No known vulnerability; it moves when they do. |
| 12 crates at two versions | Solana's and LiteSVM's trees. Nothing to do. |

### Found beyond the report

- **Next.js 16.3.5, critical:** remote code execution in `next/og`'s
  `ImageResponse` (GHSA-vcvr-r3jv-pc5j), which draws every pet and guild
  card from names anyone can write on chain. 16.3.8 fixes it, and an SSRF
  in image optimisation (eb022de).
- **The sponsor** paid one fee per signature with no cap, so a transaction
  padded with signers cost it several. It signs at most three now (8bd88ee).
- **source-map-js** 1.2.1 in the CSS build: 1.2.2 (3ed9dfb).

The devnet upgrade of 2026-10-07 (slot 508518503) carries the program's
changes; every live passport, guild, closet and guestbook was checked
against the new rules before it.

## The audit of 8 October 2026

A second pass, by hand, over the program at `479da07` and the server keys
that sign beside it (the sponsor, keepsakes, coins). Each instruction was
read for every account's owner, address, seeds, signer and tie to the
others; each record (a pet, a guild place, a Pawket Wallet and its link, an
event, a poll, a guestbook) for the moves it allows; every lamport for
where it can go; every sum, index and cast clippy flags
(`arithmetic_side_effects`, `indexing_slicing`, `cast_possible_truncation`)
for its bound; and the code Anchor 1.2 generates — no legacy IDL
instructions (`legacy_idl` is off), duplicate mutable accounts refused,
`init` safe on a pre-funded address, `close` zeroing an account and handing
it to the system program.

It found no defect in the program: nothing that moves a lamport, writes
another player's state or reaches a rule it should not. What it changed:

| What | Commit |
| --- | --- |
| Tests for each bypass the suite had not tried: a wallet's rent sent to a thief; a wallet closed, or a device linked, by a stranger; a replaced device acting or unlinking its replacement; a device acting through a forged wallet; a leaked device drawing more than one fee an action | 9976586 |
| A pet going, voting or checking in on another pet's place or RSVP; leaving a guild it is not in; buying into another's closet; nothing but the Market's six items ever priced | 7532f5f |
| A stranger checking in, voting or dressing with someone else's pet; a device doing a round, dressing, an RSVP, a vote or a check-in for a pet its owner does not keep; a wallet made or paid into in someone else's name | 7bd45a7 |
| Decay over every value, rate and `i64` time: it never rises or fails, and a pet left fifty years is cared for on the SBF build | 3489204 |
| The sponsor's slots held to the IDL's `payer` and `rent_payer` | e02ad03 |
| SOLANA.md and MAINNET.md said the sponsor never pays a wallet's rent, `program.ts` that a device signs care, rounds and dressing only: both stale since the device twins | 5643fcf |

Every guard the new tests aim at that can be deleted (21 of them; a
closet's seeds cannot, `init_if_needed` needs them) was deleted from
`lib.rs` one at a time and rebuilt, and its test failed each time. Row
63–65 above said the tests send a wallet's rent elsewhere; until 9976586
only a guild place's were. The program on devnet (slot 508518503) is byte
for byte the build of this source, and its upgrade authority is the deploy
wallet, not the sponsor.

Raised for a decision: a founder keeps the role after their pet leaves the
guild (`OPEN-QUESTIONS.md` Q9; since 9 October the coin launch route
refuses then); the sponsor's secret is also the keepsake and coin secret,
so it cannot rotate without losing them (Q10; since 9 October a coin is
read as the guild's only when its founder made it). A pet that RSVPs and
then leaves can still check in.

## Known and accepted

- bigint-buffer 1.1.5 stays in the lockfile, patched; scanners that read
  versions will keep listing it. braces 3.0.3 has no fixed release and
  expands only eslint's own globs.
- A guestbook remembers the last eight waves, so "once a UTC day" holds
  within those eight: after eight others, a visitor can wave again. Waves
  move nothing, and keys are free, so no rule on chain makes a count
  Sybil-proof.
- A stolen linked device acts until its end date, inside the owner's daily
  limit, and draws its float plus at most one fee per action from the
  balance. Unlinking stops it.
- The sponsor's limits live in each server instance's memory
  (`createLimiter`), so several instances each allow their share; it stops
  below its float's floor (`MIN_FLOAT_LAMPORTS`).
- Pets, passports, closets, events, RSVPs, polls, ballots and guestbooks are
  never closed, so their rent stays locked.

## Checking again

```sh
pnpm audit
cargo audit
gitleaks git --redact .
pnpm program:test
cargo clippy -p pawket --lib -- -W clippy::arithmetic_side_effects -W clippy::indexing_slicing -W clippy::cast_possible_truncation
```

The clippy line lists 21 sites at `479da07`, each bounded: operands from the
clock, ring indexes modulo eight, `item / 8` into 32 bytes, a slug indexed
after its length check, decay clamped to its horizon, and an event's start:
an event ends after it is made and lasts at most seven days, so it starts
no earlier than seven days before it is made.

## Hackathon wallet extension — 8 October 2026

The owner approved program changes and devnet redeployment with version
numbers unchanged. `buy_with_wallet` spends only the signed owner's PDA
balance above rent, into the fixed treasury. There is no device twin.
`fund_wallet_spend` and `settle_wallet_spend` bind the first and last
instructions of the same atomic transaction through the real instructions
sysvar, to the same owner, wallet and reserved existing owner SOL. Missing,
reordered or mismatched settlement fails; spending reserved owner SOL
rolls the transaction back. The linked device pays network fees but cannot
approve spending. The sponsor refuses these coin brackets.

LiteSVM checks purchases, insufficient balance, foreign PDAs, missing and
mismatched brackets, change, proceeds and rollback. These extensions are
new review scope for the pre-mainnet external audit; the earlier audit
entries describe the earlier commits.
