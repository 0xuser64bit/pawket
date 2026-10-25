# Security

This document describes enforced trust boundaries and known limits. It is not
an external audit certificate. Program rules live in `programs/pawket/src/lib.rs`;
sponsor rules in `src/lib/solana/sponsor.ts`; signing and message verification
in `src/lib/solana/send.ts`. [AGENTS.md](../AGENTS.md) is the change contract.

## Keys and authorities

| Authority | Scope |
| --- | --- |
| Owner wallet | Approves wallet management and spending; owns the pet and Pawket Wallet |
| Linked device | Non-extractable WebCrypto key; program-limited non-money actions until expiry and daily limit; can unlink itself; once unlinked or replaced, can send its own leftover float to its owner's Pawket Wallet and nowhere else |
| Sponsor | Server-only devnet fee/rent payer; also current keepsake collection authority and source of derived asset keys |
| Program upgrade authority | Separate deploy wallet; never the sponsor |
| Treasury | Receives Market purchases and partner coin fees; its signing key is not on the server |

Never request, log or export a player's seed or private key. Device keys stay
in IndexedDB and are generated non-extractable. A device has no money
authorization instruction twin; co-signing coin transactions as fee payer does
not authorize a spend. The owner can revoke a device from another device.

## Program integrity

Program accounts are created at their PDAs. Account types check owner and
discriminator; seeds, stored owners and account constraints bind writes to
the authorized signer and related records. Passports and joined guilds have
explicit seed checks. Existing closets and guestbooks must name the correct
owner or pet. A pet's owner never changes.

Withdrawals go only to the owner. Closing a wallet returns its balance to the
owner and rent to its recorded payer. Leaving a guild returns membership rent
to the recorded payer. Market purchases use program prices and the fixed
treasury; closet entitlements are checked before purchased clothing is worn.

Coin instructions are atomically bracketed by `fund_wallet_spend` and
`settle_wallet_spend`. The real instructions sysvar binds the first and last
instructions to the same owner, wallet and reserved existing owner SOL.
Missing, reordered or mismatched settlement, or spending reserved owner SOL,
rolls the transaction back. Change and sale proceeds return to Pawket Wallet.
The device's fee refill is capped. The sponsor refuses these coin brackets.
A coin transaction may be v0 with Pawket's frozen lookup table; the browser
still requires the brackets' owner, wallet and device among the transaction's
own keys (`send.test.ts`).

Release builds retain overflow checks. Counters saturate where specified;
caller-controlled amounts and spans are validated. Decay has a bounded horizon
and cannot make a long-abandoned pet impossible to care for.

New account creation, reallocations, ownership changes or device permissions
require review of all dependent records and authorization checks. Program ID,
seeds and discriminators need an explicit human request and deploy plan.

## Sending and sponsorship

Every app send follows `send.ts`: explicit action, preflight, message
verification, broadcast, confirmation and Explorer receipt. A lost response
preserves the known signature and yields `unknown`; no replacement is sent
automatically. A chain care animates only after confirmation and reload.

The sponsor accepts only the approved Pawket instruction/account roles,
bounded signatures, no priority-fee instructions, no lookup tables and at
most one rent-paying instruction a transaction. Its float floor, per-caller
limits and an hourly rent budget measured from its own balance bound abuse.
`SPONSOR_SLOTS` is held to the IDL. Sponsored claims must use current
availability rather than assume the sponsor is online.

## Server and Android boundaries

Server config and privileged modules import `server-only`. Every response
forbids framing (`frame-ancestors 'none'`, `X-Frame-Options`), because a linked
device signs some actions without a prompt; it also sends `nosniff`, a
referrer policy and a permissions policy (`next.config.ts`). Public env values
are client-safe; custom provider URLs belong in `SOLANA_RPC_URL`, with browser
RPC set to `/api/rpc`. Direct browser RPC permits only the public Solana hosts
or loopback endpoints without credentials or URL parameters. Coin route logs
omit raw upstream errors, which can contain provider URLs. The RPC proxy
allow-lists methods and validates requests.
Meteora SDKs and web3.js v1 remain in `src/server/coins/` and operational scripts.
Coin reads verify the pool address, mints and creator before using it.

The Android bridge accepts only checked requests from the trusted origin's
main frame. It carries photos, links, reminders, haptics and colors, never keys
or transactions. A care reminder is a time within three days and capped plain
words; its notification only opens the app. External intents are restricted and rebuilt without supplied
components, extras or permission flags. Release WebView debugging and backups
are off; phone transfers exclude WebView storage. See `ANDROID.md`.

## Known limits and release blockers

- Keepsake and coin derivation uses the sponsor secret. Rotating it changes
  addresses and can lose app discovery or permit duplicate creation. Separate
  derivation-secret storage and collection authority are unresolved (Q10).
- A founder keeps the coin's fee rights after the founding pet leaves: the
  pool records the founder's wallet, outside the program. Events, polls and
  launches stop while that pet is out of the guild.
- Guestbooks check one wave per UTC day against the last eight visitors. After
  eight other waves a visitor can wave again. Counts are not Sybil-resistant.
- Per-caller limits are in process memory, so multiple instances each allow
  their share; an IPv6 caller counts by its /64. The hourly rent budget is read
  from the sponsor's balance, which every instance sees, plus the rents an
  instance signed in the last two minutes. Shared enforcement and budget
  monitoring are mainnet work.
- A stolen linked device acts until its link ends (30 days at most) or the
  owner unlinks it: up to its daily limit (500 at most) of non-money actions a
  UTC day, for the owner's pets only. Each action refills at most one
  5,000-lamport fee from the balance, so it can draw at most `daily_actions ×
  5,000` lamports a day (2,500,000 at the maximum limit), and each coin trade
  the owner approves tops its float back up to 1,000,000 lamports. It cannot
  withdraw, buy or send the balance anywhere. Unlinking ends its authorization;
  local deletion alone does not revoke it on chain.
- Pawket's client always sends with preflight, but a caller holding a
  sponsor-signed transaction can broadcast it without. One that fails on chain
  still costs the float its fee, inside the same per-caller limits.
- `finish_round` has no daily cap on chain. Only a pet's first round of a UTC
  day earns XP, so repeating it changes nothing in the game; its cost is fees,
  bounded by the sponsor's per-caller limits and a device's daily limit.
- Guild slugs are first come, first served and never freed: a guild has no
  close instruction, and the program reserves only `new`, the app's own create
  route (`RESERVED_SLUGS`). Delisting (`src/lib/guilds/delisted.ts`) hides a
  guild from Pawket's surfaces; it cannot return a slug. There is no on-chain
  dispute path for a squatted name (`DECISIONS.md`).
- Pets, Passports, closets, events, RSVPs, polls, ballots and guestbooks have no
  close instruction. Their rent remains locked. Guild membership and Pawket
  Wallet have their own closure rules.
- `bigint-buffer` remains a transitive dependency with a local patch removing
  the native addon. Dependency scanners may still flag its version. MWA session
  behavior also relies on local patches; keep the regression tests when upgrading.
- `braces` arrives through ESLint's file-pattern tooling and has a published
  stack-exhaustion advisory with no patched release in the current dependency
  audit. It does not handle player requests. Treat lint input as repository
  code and review its upstream fix before changing the override graph.
- Rust's locked Solana/LiteSVM dependency graph includes maintenance advisories.
  Its legacy `rand` version also appears in [RUSTSEC-2026-0097](https://rustsec.org/advisories/RUSTSEC-2026-0097.html),
  through the test runtime; its required `log` feature is not enabled. Review
  these findings when upgrading the upstream runtime, rather than suppressing
  the advisories or replacing crypto dependencies independently.
- `.cargo/audit.toml` accepts two constant-time advisories:
  [RUSTSEC-2026-0385](https://rustsec.org/advisories/RUSTSEC-2026-0385.html)
  (`ctutils` 0.4.2) and
  [RUSTSEC-2026-0387](https://rustsec.org/advisories/RUSTSEC-2026-0387.html)
  (`crypto-bigint` 0.5.5). Both arrive only through LiteSVM's runtime, a
  dev-dependency. Neither is in the program's build graph (`cargo tree -i
  <crate> -e normal -p pawket` prints nothing), and test keys hold no secrets.
  `crypto-bigint`'s fix (0.7) is outside `elliptic-curve` 0.13's range. Remove
  both entries at the next LiteSVM/Agave upgrade.

## Verification and incident handling

Internal reviews in October 2026 hardened account constraints, sponsor
signature limits and wallet authorization tests. Their detailed reports and
commit-specific evidence remain in Git history. Those reviews do not replace
an external review of the current program, coin spending and key management
before mainnet. `TESTING.md` maps the suites and their limits.

```sh
pnpm verify
pnpm program:test
pnpm audit
cargo audit
gitleaks git --redact --log-opts=--all .
```

Investigate a suspected compromised authority from its verified address and
recent signatures. Stop affected server signing and product promotion,
preserve public receipts and logs without secrets, and contact the responsible
operator. Resolve Q10 before changing a derivation key; do not assume rotation
preserves asset addresses. Reconcile uncertain sends by signature before retrying.
Record affected authorities, timeline, mitigation and recovery verification.
Mainnet operational ownership and response procedures must be approved under
`MAINNET.md` before release.

## Source publication

[SECURITY.md](../SECURITY.md) is the private reporting policy. The CI secret
scan covers every fetched Git ref, not just the current files. The configured
rules include Solana CLI keypair arrays; exact browser-storage names from
early commits are the only value allow-list. Keys and Android signing files
are ignored, but ignore rules do not remove anything already committed.

Before changing repository visibility, scan all refs that will be published,
check release assets separately and enable the host's secret protection where
available. A scan cannot prove that no secret exists. If a real credential is
found in history, stop publication, identify its authority and exposure, and
coordinate revocation and history remediation with the operator. Sponsor
rotation additionally requires Q10; deleting a file alone does not revoke a key.
