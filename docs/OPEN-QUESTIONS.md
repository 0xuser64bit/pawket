# Pawket — Open Questions (human decisions required)

**Status:** LIVING. Agents: never guess these — build the interface subtask and mark blocked with the Q ID. Humans: resolving a question means a `DECISIONS.md` entry (append, never rewrite) + updating the blocked tasks.

## Q1 — NFT standard for pets + cosmetics

**Needed by:** T07–T09 (M2). **Recommendation:** Metaplex Core.
**Context:** pets are PDA records today; vision requires unique NFTs. Core fits 1:1 assets + attributes/plugins with lower rent than Token Metadata stacks; PDA stays stats authority, NFT is identity wrapper.
**Alternatives:** Token Metadata + editions (heavier; keep if marketplace tooling demands); compressed NFTs (cheaper at scale, higher indexer cost — revisit at 100k+ pets); pure-PDA (simplest, fails collectibility vision).
**Decision needed:** standard + collection plan + PDA↔mint link direction. Until then: build off-chain `PetMetadata` shape (mint optional) so migration is mechanical.

## Q2 — Backend DB + hosting

**Needed by:** T10 (M3). **Recommendation:** Postgres (Neon or Supabase) + Prisma, introduced at M3 not earlier.
**Context:** registry/listings/votes/treasury-cache need relations; M1–M2 prove chain-first without DB weight. Guest→wallet linking needs server sessions (SIWS-style, no custody).
**Decision needed:** provider, connection/pooling plan, migration runner, backup/retention, PII policy.

## Q3 — Meteora SDKs + preset values

**Needed by:** T20–T22 (M6). **Recommendation:** DBC SDK + DAMM v2 SDK, 2–3 constrained presets (SOL + USDC quote), full-range compounding DAMM v2.
**Context:** preset numbers (curve segments, fees bps, graduation threshold, limits) need ops + legal review; creators never edit raw params v1.
**Decision needed:** SDK versions pinned, preset values + config hashes, quote-asset list, limit policy.

## Q4 — Indexer + RPC provider

**Needed by:** T21/T23 (M6; status pieces earlier). **Recommendation:** custom server-side RPC poller → Postgres cache first; Helius webhooks later.
**Context:** migration verification + lag signal must be trustworthy; client must never hammer RPC. Needs rate limits, backoff, alert thresholds, named owner.
**Decision needed:** provider (raw RPC vs Helius vs Triton), polling cadences, lag threshold (proposed <50 slots healthy), job runner (cron/worker), local-dev story.

## Q5 — Marketplace settlement (secondary + cosmetics on-chain?)

**Needed by:** T13.x (M3 follow-up). **Recommendation:** fixed-price treasury-signer settlement v1; program escrow only with audit + deploy plan.
**Context:** `register_item`/`record_purchase` are not admin-gated and move no tokens — unwirable as a store. Cosmetic secondary needs either off-chain entitlement transfer or real escrow.
**Decision needed:** v1 settlement model, fee splits, floor/ceiling guardrails, dispute handling.

## Q6 — Legal/compliance sign-off (guild tokens + treasury)

**Needed by:** T22 (M6). **Blocks pilot** until signed.
**Context:** utility statements, risk disclosure copy, allocation/vesting publication, treasury multisig policy, moderation/suspension language, no-yield/no-return positioning, jurisdiction restrictions.
**Decision needed:** approved disclosure + policy texts, review cadence, support coverage, incident comms owner.

## Q7 — Wallet-free auth (guest → wallet)

**Needed by:** T05/T10. **Recommendation:** localStorage guest first; server session + wallet-link at M3 (no custodial key generation, no email-password auth v1).
**Context:** requirement: core loop usable without wallet. Options range from pure-local guest to Privy/Dynamic embedded wallets — the latter adds vendor + custody-surface review.
**Decision needed:** session model + whether to evaluate embedded-wallet vendors (defer unless onboarding data demands it).

## Q8 — Playground netcode scope

**Needed by:** T14. **Recommendation:** async/turn-based only for M4; real-time multiplayer deferred until retention proves.
**Context:** real-time presence/physics is the largest frontend+ops cost with the weakest early-retention evidence.
**Decision needed:** which 1–2 mini-games ship first + scoring formula sign-off (power-free certification).

## Resolution log

| Date | Q | Decision | By |
| --- | --- | --- | --- |
| — | — | _none yet — all open_ | — |
