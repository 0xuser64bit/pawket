# Pawket — Epics (agent work packets)

Each epic is sized for 3–8 agent turns. Epic = goal + scope + non-goals + files + tests + Definition of Done. Atomic steps live in `TASKS.md`. Read `AGENT-GUIDE.md` before starting any epic.

**Epic index**

| Epic | Title | Milestone | Depends on |
| --- | --- | --- | --- |
| E01 | Adopt + Care loop (chain-first) | M1 | M0 |
| E02 | Guest mode + Home v1 | M1–M2 | E01 (types) |
| E03 | Pet identity, avatars, Inventory | M2 | E01 |
| E04 | Backend + env expansion (DB, sessions) | M3 | human: Q2 |
| E05 | Marketplace (fixed-price adoption + cosmetics) | M3 | E03, E04 |
| E06 | Playground + social (retention) | M4 | E03 |
| E07 | Guild registry + social guilds (no tokens) | M5 | E04 |
| E08 | Meteora DBC launch integration | M6 | E07 + legal |
| E09 | DAMM v2 migration + active liquidity | M6 | E08 |
| E10 | Indexer + tx-status + eligibility services | M6 | E04, E08 |
| E11 | Safety, moderation, treasury UI | M5–M6 | E07 |
| E12 | Metrics, analytics, launch gates | M4–M7 | E06+ |

---

## E01 — Adopt + Care loop (chain-first)

**Goal:** real on-chain adopt + 4 care actions with honest states.
**Scope:**
- `app/(game)/adopt/page.tsx` (Server) + `components/pet/adopt-form.tsx` (client leaf): name/species/personality, validation via `normalizePetName`, PDA derivation, `getAdoptPetInstruction`, lifecycle per `transactions.ts`.
- `app/(game)/pet/[address]/page.tsx` + `components/pet/care-panel.tsx`: stats, XP/level (`math.ts`), mood, cooldown countdown, decay estimate labeled "estimate".
- Chain reads via RPC (no DB): fetch `Pet` + `PetPassport` accounts, decode per IDL; loading/error/empty states.
- Reuse `TransactionStatus` for every send; Explorer link via `cluster.ts`.
**Non-goals:** NFT art, DB, Passport timeline, guest persistence.
**Tests:** extend `math.test.ts` if touched (exact values); component tests for form validation + cooldown rendering; Playwright asserts adopt route renders + wallet CTA present (no signing).
**DoD:** devnet adopt + care confirmed manually, signatures link correctly, `pnpm verify` green, copy never says "owned NFT" unless NFT wiring exists (say "on-chain pet record").

## E02 — Guest mode + Home v1

**Goal:** full loop explorable with no wallet; Home feels personal.
**Scope:**
- `lib/guest/` — guest pet in memory + localStorage: `createGuestPet`, `applyGuestCare` (delegates to `math.ts`), `GUEST_BANNER_COPY`.
- `app/(game)/home/page.tsx`: active pet card, emote row (local-only animation), background + music pickers (localStorage first).
- Upgrade CTA: "Connect wallet to save on-chain" → wallet section.
- Middleware/route guard: guest allowed everywhere except sends (sends require connected signer; show install guidance on empty discovery).
**Non-goals:** server sessions, multiplayer home visits.
**Tests:** guest reducer tests (pure, deterministic); component test that guest banner renders and send CTA is disabled without wallet.
**DoD:** fresh incognito user completes adopt→care→home without wallet; no `NEXT_PUBLIC_` secrets added.

## E03 — Pet identity, avatars, Inventory

**Goal:** recognizable pets; one hub for everything owned.
**Scope:**
- Freeze `DOMAIN-MODEL.md` Pet + Cosmetic + Equipped types first.
- `components/pet/pet-avatar.tsx`: deterministic SVG from species + personality + equipped cosmetic IDs (no external art dependency; art pack swaps later without type changes).
- `app/(game)/inventory/page.tsx`: owned pets (chain query by owner + guest pet), cosmetics grid (static `data/cosmetics.json` v1), equip/unequip (local state v1, labeled "preview — not saved on-chain").
- `app/(game)/pet/[address]/customize/page.tsx`: try-on + save-preview.
**Non-goals:** purchases, rarity logic, on-chain equip.
**Tests:** avatar determinism test (same input → same SVG hash); inventory empty/loaded/error states.
**DoD:** equip change reflects on Home + Inventory + Playground header consistently.

## E04 — Backend + env expansion (DB, sessions)

**Goal:** introduce persistence exactly once, correctly guarded.
**Scope (requires human: Q2 DB choice):**
- Prisma schema: `User`, `PetMeta`, `CosmeticDef`, `Listing`, `Order`, `Guild`, `GuildMembership`, `LaunchConfig`, `TreasuryEvent` (see `DOMAIN-MODEL.md` §5 for fields).
- `app/api/*` route handlers per `API-CONTRACTS.md` (health-style shape, Zod validation, pagination envelope).
- `server-env.ts` additions: `DATABASE_URL` (no prefix), future `RPC_API_KEY`, `INDEXER_TOKEN`; `.env.example` updated first.
- Guest→wallet link: server session binds guest ID to wallet address on first sign (SIWS-style message, no custody).
**Non-goals:** marketplace UI, guild token logic.
**Tests:** API contract tests (Zod rejects bad input; pagination envelope exact); server-env import guard test (client import fails build — assert via lint rule / manual note).
**DoD:** migrations run on fresh DB; no secret in client bundle (`grep NEXT_PUBLIC_` review in PR).

## E05 — Marketplace (fixed-price)

**Goal:** understandable SOL adoption + cosmetic acquisition.
**Scope:** see `MARKETPLACE.md`.
- Browse + detail + checkout leaves; quote = fixed price + fee breakdown (no slippage/impact UI here — that's Meteora-only).
- Primary adoption writes chain (adopt ix) + DB receipt; cosmetic purchase is DB entitlement v1 (chain move deferred until program supports token movement).
- Receipts page + Explorer links; failure states per `transactions.ts` (timeout = unknown, lookup by signature).
**Non-goals:** auctions, offers, bonding curves, Jupiter routing.
**Tests:** price-math tests (exact lamports, fee split); checkout validation tests; e2e asserts marketplace renders with no-wallet fallback.
**DoD:** devnet purchase → receipt + Explorer link; `register_item`/`record_purchase` still unwired (no builder added).

## E06 — Playground + social

**Goal:** reasons to return; pet as identity.
**Scope:** see `GAME-DESIGN.md` §7 + `ROUTES.md`.
- 1 async mini-game (e.g., trick contest: commit care-streak + cosmetic loadout → deterministic score from `math.ts` + cosmetic flair bonus = 0 power, flair only).
- Daily goals + streaks (DB), share card (`/api/share/[petId]` OG image), friend visits (read-only home render).
- Rate limits + anomaly flags; no token-gated access anywhere.
**Non-goals:** real-time multiplayer, tournaments with prizes, guild-gated modes.
**Tests:** scoring determinism tests; streak edge tests (timezone-safe, inject `now`); abuse-limit tests.
**DoD:** wallet-free user can play + earn XP-equivalent progress; token-balance code never imported by scoring path (assert via dependency lint note in PR).

## E07 — Guild registry + social guilds (no tokens)

**Goal:** approved communities with events/votes/badges, zero financialization.
**Scope:** see `GUILDS.md` §§1–4.
- Guild + membership + event + vote + badge tables; `app/(game)/guilds` + `[slug]` pages; join/leave, RSVP, one-member-one-vote polls (cosmetic topics only).
- Admin: application intake (`/api/guilds/apply`), review queue (server-only), approval publishes public policy page.
- Report/flag flow; delist = hide from discovery, retain factual record.
**Non-goals:** mints, DBC, swaps, treasury on-chain writes.
**Tests:** membership + vote tests (double-vote rejected, non-member cannot vote); moderation state-machine tests.
**DoD:** 2 seed guilds operable end-to-end with no token UI present anywhere in guild routes.

## E08 — Meteora DBC launch integration

**Goal:** constrained, reviewed guild-token launches with full disclosure.
**Scope:** see `METEORA-INTEGRATION.md` §§1–3.
- Preset registry (`lib/meteora/presets.ts`): 2–3 reviewed DBC configs (quote asset SOL/USDC, curve, fees, graduation) — creators pick a preset, never raw params.
- Quote/buy UI: estimated output, slippage tolerance, fees, price impact, risk acknowledgment (first buy), explicit sign → `sendTransaction` → confirm → reload.
- Launch progress as community info; failed/over-threshold states without value promises.
**Non-goals:** custom curves, DAMM v2 routing (E09), DLMM.
**Tests:** preset validation tests (unknown preset rejected; fee math exact); quote-render tests with mocked SDK (no network in unit tests); failure-copy tests.
**DoD:** devnet pilot launch completes buys with disclosures + Explorer links; simulation failures block send.

## E09 — DAMM v2 migration + active liquidity

**Goal:** one continuous guild experience across DBC→DAMM v2.
**Scope:** see `METEORA-INTEGRATION.md` §4.
- Three-state router: `dbc-active` → `migration-pending` (controls paused with explanation, no stale-route sends) → `dammv2-active` (verified pool only).
- Prefer full-range compounding config v1; publish position ownership, locks, fee recipients, withdrawal terms pre-launch.
- Migration verification job (see E10) gates the `dammv2-active` flag.
**Non-goals:** concentrated-range management, DLMM, auto-rebalancing.
**Tests:** state-machine tests (all 3 states + stale-index lag case); pool-verification tests (unverified pool never routes).
**DoD:** simulated migration lag shows pending UI, blocks swaps, then activates on verified pool without user needing to understand pools.

## E10 — Indexer + tx-status + eligibility services

**Goal:** client never lies about chain state.
**Scope:** see `INDEXER.md` + `API-CONTRACTS.md` §§4–5.
- Indexer: balances, launch state, migration, liquidity, fees, vesting, treasury flows; backoff + lag metric exposed (`/api/indexer/status` with `lagSlots`, `lastVerifiedSlot`).
- Tx-status: `GET /api/tx/:signature` reconciles client signature → confirmed state; client timeout shows "unknown — look up" (never "failed").
- Eligibility: `GET /api/guilds/:slug/eligibility?wallet=` returns cosmetic/social benefits only; never stats/XP/matchmaking.
**Non-goals:** real-time websockets v1 (polling + SWR acceptable), Jupiter routing.
**Tests:** reconciliation tests (confirmed-but-timed-out → unknown→confirmed on retry); eligibility tests (zero power fields present — assert shape has no `xpMultiplier` etc.).
**DoD:** kill-indexer drill: UI degrades to pending states, blocks route-dependent sends, recovers without phantom balance changes.

## E11 — Safety, moderation, treasury UI

**Goal:** protections are visible product, not docs-only.
**Scope:** see `SAFETY-ECONOMY.md`.
- Risk disclosure component (first-buy gate, accessible after), fee/impact explainer, official-vs-third-party link badge.
- Moderation console (server-only): review queue, suspend (delist + disable benefits), incident record create/update.
- Treasury dashboard: wallets, signers (multisig), inflows/outflows, allowed uses, decision rules.
**Non-goals:** on-chain reversals, confiscation (explicitly disclaimed in copy).
**Tests:** disclosure-gate tests (buy blocked until acknowledged); suspension tests (benefits off, factual record retained).
**DoD:** copy review passes honesty checklist (`AGENT-GUIDE.md`); legal sign-off recorded in `OPEN-QUESTIONS.md` Q6.

## E12 — Metrics, analytics, launch gates

**Goal:** know if community health is improving without harming access.
**Scope:** see `SAFETY-ECONOMY.md` §5.
- Event pipeline (game-health vs market-health vs safety, separated): discovery→join, event participation, cosmetic use, retention (guild vs non-token), wallet-free completion rate; participants/holders/concentration/volume/liquidity/slippage; migration completion + time-to-verified; quote accuracy, failures, timeouts, lag; fee/treasury accuracy; bot/sybil/wash/impersonation signals.
- Dashboards + release-gate checklist (M5→M6→M7).
- Token price explicitly **not** a primary metric.
**Non-goals:** ads attribution, PII-heavy tracking.
**Tests:** event-schema tests (PII fields rejected); gate-checklist tests (missing safety signal blocks "ready to launch" flag).
**DoD:** pilot launch evaluated on participation + retention + safety, not price.
