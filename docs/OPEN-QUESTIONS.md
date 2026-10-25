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


## Scope decisions

Pets and cosmetics are not transferable, there is no secondary settlement,
and the product has no server database or account session. Those are accepted
scope decisions in [DECISIONS.md](DECISIONS.md), not unfinished features.
Future proposals must establish a player need before reopening them. Retired
question IDs remain in Git history; the remaining IDs above are stable.
