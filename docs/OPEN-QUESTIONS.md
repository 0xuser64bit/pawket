# Pending decisions

These choices are unresolved. Work that depends on them needs a product or
operational decision before implementation. Record an accepted choice in
`DECISIONS.md` and update the owning system document. The IDs remain stable.

## Q3 — Mainnet coin configuration

Devnet SDKs, SOL quote asset, gentle/lively presets and locked-liquidity terms
are implemented. Mainnet numbers in the preset model are provisional; no
mainnet config addresses are enabled. Mainnet parameters, treasury recipients,
config verification and operational ownership need approval after Q6.

## Q4 — RPC and indexing at scale

Direct RPC reads with short shared caches support the current app. A paid
provider, indexing strategy, monitoring thresholds and job ownership must be
chosen from measured request volume and latency before expanding the load.
No indexer or background poller is implemented.

## Q6 — Mainnet coin policy and operations

Mainnet coins remain blocked pending legal review of disclosure and utility,
launch terms, jurisdiction policy, moderation, support and incident ownership.
Devnet behavior is not evidence of mainnet readiness. See `MAINNET.md`.

## Q9 — Founder powers after the founding pet leaves

The coin launch route checks the founding pet is still in the guild.
The program still lets the founder create events and polls after that pet
leaves, and the founder retains coin fee rights. Decide whether departure ends
the role, whether rejoining restores it, and whether succession exists before
an additive program upgrade. Existing RSVPs can still check in after leaving.

## Q10 — Address derivation and key rotation

Keepsake and coin keys are currently derived from `SPONSOR_KEYPAIR` by HMAC.
Changing the sponsor secret changes those derived addresses and can hide
existing assets from the app or allow duplicate creation. The creator check
protects coin attribution, but does not solve rotation. Decide how a separate
derivation secret and collection authority are stored, backed up and migrated
before rotation or mainnet. Do not treat routine sponsor rotation as safe.

## Scope decisions

Pets and cosmetics are not transferable, there is no secondary settlement,
and the product has no server database or account session. Those are accepted
scope decisions in [DECISIONS.md](DECISIONS.md), not unfinished features.
Future proposals must establish a player need before reopening them. Retired
question IDs remain in Git history; the remaining IDs above are stable.
