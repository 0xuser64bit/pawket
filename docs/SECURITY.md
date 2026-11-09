# Security

This document describes enforced trust boundaries and known limits. It is not
an external audit certificate. Program rules live in `programs/pawket/src/lib.rs`;
sponsor rules in `src/lib/solana/sponsor.ts`; signing and message verification
in `src/lib/solana/send.ts`. [AGENTS.md](../AGENTS.md) is the change contract.

For a signing change, read [Keys and authorities](#keys-and-authorities) and
[Program integrity](#program-integrity) before editing. For a suspected
incident, start at [Verification and incident handling](#verification-and-incident-handling).
[MAINNET.md](MAINNET.md) owns release gates; [ENVIRONMENT.md](ENVIRONMENT.md)
owns key configuration and rotation prerequisites.

## Keys and authorities

| Authority | Scope |
| --- | --- |
| Owner wallet | Approves wallet management and spending; owns the pet and Pawket Wallet |
| Linked device | Non-extractable WebCrypto key; program-limited non-money actions until expiry and daily limit; can unlink itself; once unlinked or replaced, the app sends its leftover float only to its owner's Pawket Wallet, though the float (1,000,000 lamports at most) is in the device's own account, which its key alone controls |
| Sponsor | Server-only devnet fee/rent payer; also the keepsake collection's authority and the derivation secret, unless `COLLECTION_AUTHORITY_KEYPAIR` and `DERIVATION_SECRET` are set |
| Program upgrade authority | Separate deploy wallet; never the sponsor |
| Treasury | Receives Market purchases and partner coin fees; its signing key is not on the server |
| Coin graduation keeper | Operator-run hot wallet, separate from the sponsor, treasury and upgrade authority; pays only the migration fee and rent, and owns neither locked position |

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
own keys. The device, which signs without a prompt, appears in no instruction
between the brackets, carries only a capped priority fee, has no signature a
precompile verifies and carries at most four signatures (a graduation's), so
its signature covers its network fee and nothing else (`send.test.ts`). The
browser also requires
an immutable operation intent before either signature: exact trade input and
minimum output, derived pools/vaults, owner token accounts and recognized
auxiliary instructions (`src/lib/coins/intent.ts`). Funding cannot exceed the
operation's SOL input, the published rent ceiling and a launch's fixed fee.
Launch metadata and optional first buy, fee recipients and graduation accounts
are checked independently of the prepared response. Token approvals, unrelated
transfers and unsupported variants are refused. V0 graduation resolves only
the configured active, frozen lookup table, checked by the server before it
builds and again by the browser through its own RPC;
SDK-built transactions and mutations exercise both signers' refusal boundary
(`src/server/coins/intent.test.ts`).

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
limits and an hourly budget measured from its own balance, which every fee
and rent it signs counts against, bound abuse.
`SPONSOR_SLOTS` is held to the IDL. Sponsored claims must use current
availability rather than assume the sponsor is online.

## Server and Android boundaries

Server config and privileged modules import `server-only`. Every response
forbids framing (`frame-ancestors 'none'`, `X-Frame-Options`), because a linked
device signs some actions without a prompt. Its pages frame only Pawket and a
phone wallet's `solana-wallet:` link, which Mobile Wallet Adapter opens from
a hidden frame in Firefox, and post forms only to Pawket. Every response also
sends `nosniff`, a referrer policy and a permissions policy (`next.config.ts`). Public env values
are client-safe; custom provider URLs belong in `SOLANA_RPC_URL`, with browser
RPC set to `/api/rpc`. Direct browser RPC permits only the public Solana hosts
or loopback endpoints without credentials or URL parameters. Coin route logs
omit raw upstream errors, which can contain provider URLs. The RPC proxy
allow-lists methods and validates requests. Program scans require a known
account discriminator at numeric offset zero; malformed filters return a
JSON-RPC rejection without contacting the provider.
Meteora SDKs and web3.js v1 remain in `src/server/coins/` and operational scripts.
Coin reads verify the pool address, mints and creator before using it.
Discovery's batched `readCoinStages` uses a lighter check of the derived DAMM
account's program owner. Quotes and transactions use `liveCoin`, which also
checks the graduated pool's mints; a discovery badge is not trade authorization.
The browser RPC proxy is not a general provider gateway: it accepts a single
allow-listed JSON-RPC call, scans only Pawket account kinds, and caps multi-account
reads at 100 (`src/lib/solana/rpc-proxy.ts`). Server-side coin SDKs use their
own provider connection, not this browser scan allow-list.

The Android bridge accepts only checked requests from the trusted origin's
main frame. Wallet, intent and mail links open another app only from that
origin's page. It carries photos, links, reminders, haptics and colors, never keys
or transactions. A care reminder is a time within three days and capped plain
words; its notification only opens the app. External intents are restricted and rebuilt without supplied
components, extras or permission flags. Release WebView debugging and backups
are off; phone transfers exclude WebView storage. See `ANDROID.md`.

## Known limits and release blockers

- Keepsake and coin addresses derive from `DERIVATION_SECRET`, which falls
  back to the sponsor's seed. Until it is pinned, rotating the sponsor changes
  those addresses and can lose app discovery or permit duplicate creation.
  Anyone holding it can compute every derived key and seal trade quote tokens,
  so it is kept like the sponsor key. Such a holder can take a derived address
  before Pawket does, but cannot make it count: a card is read only as an
  asset of Pawket's collection held by the pet's owner, and a coin only as its
  founder's curve, so a taken address shows no card, or a coin Pawket cannot
  launch. A forged quote token still needs the owner's signature and is bound
  by the swap's on-chain minimum output.
- A founder keeps the coin's fee rights after the founding pet leaves: the
  pool records the founder's wallet, outside the program. Events, polls and
  launches stop while that pet is out of the guild.
- Guestbooks check one wave per UTC day against the last eight visitors. After
  eight other waves a visitor can wave again. Counts are not Sybil-resistant.
- Coin display reads are bounded: config reads cache for five minutes behind a
  15-second deadline, and holder analytics use a 5-second deadline, a
  60-second cache and a 5,000-account cap. A failed or timed-out read is not
  cached; a timed-out or oversized holder scan shows no count and the next
  read tries again. These bounds protect one server instance, not a global RPC
  quota.
- Per-caller limits are in process memory, so multiple instances each allow
  their share. The caller is a valid `X-Real-IP` when the proxy sets it,
  otherwise the last valid `X-Forwarded-For` hop, otherwise `local`; a
  malformed header cannot choose an arbitrary key. IPv4-mapped IPv6 is
  normalized, and an IPv6 caller counts by its /64. An instance remembers the
  10,000 keys it heard from most recently (an Action's posted wallet is a key
  too) and forgets the quietest first, which gains a caller holding that many
  keys nothing it did not have. Coin routes have separate hourly buckets for
  quote, trade, launch, graduate, claim and position reads; a write route
  counts both the caller and the posted account, and a refusal carries
  `Retry-After`. The hourly budget is read from the sponsor's balance, which
  every instance sees, plus the fees and rents an instance signed in the last
  two minutes, so callers spread over many addresses still stop at it. Shared
  enforcement and budget monitoring are mainnet work.
- HTML pages enforce a per-request nonce script policy (`proxy.ts`). The
  request nonce reaches Next's runtime and the theme script; the root layout
  renders per request so a static document cannot reuse it. Production allows
  neither inline scripts without a nonce nor JavaScript string evaluation.
  WebAssembly compilation and blob reads remain allowed for Meshopt and the
  room's GLBs. Inline styles remain allowed for React and room colours; secure and loopback wallet/RPC
  connections remain available. The policy also refuses objects and base tags.
  This mitigates script injection, but does not replace escaping, dependency
  review or the device's program limits. Consumer-wallet and physical WebView
  compatibility still require their release checks.
- A stolen linked device acts until its link ends (30 days at most) or the
  owner unlinks it: up to its daily limit (500 at most) of non-money actions a
  UTC day, as the owner's pets (a wave greets any pet; a pet may join any
  guild). Its own float, 1,000,000 lamports at most, is in the device's own
  account, so a stolen key can send that anywhere. Each action refills at most one
  5,000-lamport fee from the balance, so it can draw at most `daily_actions ×
  5,000` lamports a day (2,500,000 at the maximum limit), and each coin trade
  the owner approves tops its float back up to 1,000,000 lamports. It cannot
  withdraw, buy or send the balance anywhere. Unlinking ends its authorization;
  local deletion alone does not revoke it on chain.
- Pawket's client always sends with preflight, but a caller holding a
  sponsor-signed transaction can broadcast it without. One that fails on chain
  still costs the float its fee, inside the same per-caller limits and hourly
  budget.
- `finish_round` has no daily cap on chain. Only a pet's first round of a UTC
  day earns XP; later rounds still increment play/activity counts and update
  activity timestamps and the streak. Each submission costs fees, bounded by
  the sponsor's per-caller limits and a device's daily limit.
- Coin intent validation protects against a substituted or faulty prepared
  transaction response. It trusts the delivered browser code, the initial coin
  identity/preset, its RPC and the recognized on-chain programs; it does not
  protect a player from compromised app delivery or arbitrary program upgrades.
  Rent ceilings are conservative bounds, not live rent quotes; changing an SDK,
  supported instruction variant or preset requires matching policy/parity tests.
  Consumer-wallet display and the deployed coin lifecycle still need their
  authorized devnet and release checks. The owner's wallet may show its own
  SOL unchanged because Pawket Wallet supplies the bounded funding.
- Quote age and risk acknowledgement are browser controls, but a trade also
  needs the quote route's HMAC-SHA-256 token. The token is bound to the slug,
  cluster, mint, preset, route, side, amount and minimum output, expires after
  30 seconds, and the trade route and `tradeTransaction` recheck it and the
  live coin before building. The ticket disables signing after 20 seconds
  and stores acknowledgement in local storage, keyed by `launch-<slug>` for
  launching and mint for trading (or only this visit if storage fails).
  The launch API checks the founder, three-pet threshold, listing and founding
  pet's membership, and `launchTransaction` repeats those checks so the
  exported action is safe on its own. These are Pawket server launch rules,
  not constraints of the external Meteora program
  (`app/api/coins/[slug]/launch/route.ts`).
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
- Minimatch is pinned by `pnpm-workspace.yaml` to an upstream release fixing
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
  Its local patch restores the callable CommonJS export required by ESLint 9
  and its plugins, without changing upstream matching logic or ESM exports.
  The override crosses those consumers' declared major-version ranges.
  `src/config/dependencies.test.ts` checks the locked version floor, each
  lint consumer's direct and transpiled interfaces and bounded preprocessing.
  Minimatch 11 removes `makeRe`; the disabled `import/no-internal-modules` rule
  still needs it when configured with `allow` or `forbid`. Recheck compatibility
  before enabling that rule. Remove the patch and update its callable-export
  assertions when those consumers no longer need the legacy interface.
- `braces` arrives through ESLint's file-pattern tooling and has a published
  stack-exhaustion advisory recorded in the dependency-audit exceptions. It
  does not handle player requests. Treat lint input as repository code;
  `pnpm-workspace.yaml` owns the accepted CVE exceptions and local patches.
  Re-run the audit and review available fixes when updating them; an exception
  or a previously clean audit is not evidence about today's advisory feed.
- Rust's locked Solana/LiteSVM dependency graph includes maintenance advisories.
  Its legacy `rand` version also appears in [RUSTSEC-2026-0097](https://rustsec.org/advisories/RUSTSEC-2026-0097.html),
  through the test runtime; its required `log` feature is not enabled. Review
  these findings when upgrading the upstream runtime, rather than suppressing
  the advisories or replacing crypto dependencies independently.
- `.cargo/audit.toml` accepts one constant-time advisory,
  [RUSTSEC-2026-0387](https://rustsec.org/advisories/RUSTSEC-2026-0387.html)
  (`crypto-bigint` 0.5.5). It arrives only through LiteSVM's runtime, a
  dev-dependency, and is not in the program's build graph (`cargo tree -i
  crypto-bigint -e normal -p pawket` prints nothing). Test keys hold no
  secrets. Its fix (0.7) needs `k256` 0.14, which no Agave release had
  adopted as of 4.3.2 (checked 25 October 2026). Remove the entry once one
  does. `ctutils` took its fix (0.4.5) for RUSTSEC-2026-0385.

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
operator. Pin `DERIVATION_SECRET` before rotating the sponsor, and never change a set
derivation secret: every derived address would move. Reconcile uncertain sends by signature before retrying.
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
rotation additionally requires `DERIVATION_SECRET` pinned first; deleting a file alone does not revoke a key.
