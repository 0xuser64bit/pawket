# Pawket — Roadmap (phased, agent-sequenced)

**Status (2026-10):** M0 and M1 are done: the program is on devnet, and adopt, care, the daily round and the wardrobe are signed, sponsored transactions with receipts, in lockstep with the browser math. M2 is done in the shape the product took: many pets per player with one at home, the Profile (the player's look, outfits, the wardrobe for any pet, stickers read from each record), eight rooms, an 18-piece wardrobe with five earned pieces, and a frozen Metaplex Core keepsake per pet on Solana (Q1, decided for this version); tradeable assets wait on Q5. From M4: the Park, the public Passport, four games with a daily round everyone shares, and photos ship; real-time play does not. From M5: social guilds ship on Solana with no token and no database (found, join, leave, discovery, a page per guild); events, votes and moderation queues do not. From M6: guild coins ship on devnet — a guild of three pets launches one on Meteora's Dynamic Bonding Curve from Pawket's presets, it graduates into DAMM v2 with its liquidity locked, and its stages, holders and pool are read from chain with no database or indexer; mainnet waits on Q6. From M3: the Market ships on devnet as primary sales of looks settled by the program (no database, no resale). From M5's rest: events and one-vote-per-wallet polls ship on chain. Moderation queues, badges as items, secondary sales and M7 stay spec until their open questions close. Do not rebuild the removed market and guild-swap screens as fixtures.
**Order is normative.** Do not skip ahead to Guild Launches before the pet loop retains.

```text
M0 foundation (DONE) → M1 care loop → M2 identity+inventory → M3 marketplace → M4 playground/social → M5 guilds read-only → M6 guild launches (DBC→DAMMv2) → M7 hardening/scale
```

## M0 — Foundation ✅ (built, verify only)

- App shell, providers, wallet connection, Kit v8 client, SOL send proof, health endpoint, env strategy, Vitest + Playwright.
- **Exit:** `pnpm verify` green on clean clone with `.env.local` from example.
- **Do not rebuild.** Extend from it.

## M1 — Care loop (first playable)

**Goal:** wallet user adopts a PDA pet, performs feed/play/groom/rest on-chain, sees stats/XP/level/cooldown/mood honestly.
**Entry:** M0 green. Program deployed on devnet (`PawkHv…eM74`, done 2026-10) or localnet validator.
**Build:**
- `app/(game)/adopt` + `app/(game)/pet/[address]` routes (Server shell + client leaves).
- Adopt form: name (2–24 UTF-8 bytes, trim before PDA), species, personality → `getAdoptPetInstruction` → lifecycle in `transactions.ts` → reload from chain.
- Care panel: 4 actions, 30-min cooldown display, XP/level, mood, decay projection (off-chain only, labeled as estimate).
- Guest preview: same UI against `src/lib/game` pure math with "guest — not saved" banner; upgrade CTA connects wallet.
- Tests: adopt/care component tests + existing math/PDA/instruction locks extended.
**Exit:** devnet manual check (adopt + 1 care, Explorer link works); e2e asserts shell + adopt form presence (no signing in e2e).
**Non-goals:** NFT artwork, marketplace, backend DB, Passport timeline polish.

## M2 — Identity + Inventory (make it yours)

**Goal:** pets feel owned + expressive; inventory manages everything in one place.
**Entry:** M1 exit (adopt/care confirmed on devnet).
**Build:**
- Pet metadata model (name, species, personality, appearance seed, cosmetics equipped) — see `DOMAIN-MODEL.md` + `NFT-CUSTOMIZATION.md`.
- Inventory pages: `app/(game)/inventory`, `app/(game)/pet/[address]/customize`.
- Cosmetic catalog (static JSON first, no purchases yet) + equip/unequip (off-chain until program supports it; label honestly).
- Avatar rendering v1 (SVG/emoji-composed from traits — no 3D yet).
- Home v1: `app/(game)/home` — active pet, emotes, background/music pickers (local-only first).
**Exit:** user can adopt → equip cosmetic → see it on home + inventory; guest path still works.
**Requires decision:** Q1 NFT standard (Core recommended) — M2 uses off-chain metadata shape that maps 1:1 to Core attributes so migration is mechanical.

## M3 — Marketplace (adopt + personalize for real)

**Goal:** fixed-price SOL adoption + cosmetic acquisition with honest receipts.
**Entry:** M2 exit + DB decision (Q2) made.
**Build:**
- Postgres (Neon/Supabase) + Prisma: listings, orders, cosmetic definitions, receipts. Introduced **here**, not earlier.
- `app/(game)/marketplace` (browse, base-pet pick, cosmetic upsell), `app/api/marketplace/*` (see `API-CONTRACTS.md`).
- Primary adoption: fixed SOL price, explicit sign, simulate → confirm → reload, receipt + Explorer link.
- Secondary / cosmetics: constrained to treasury-signed fixed-price first; auction/AMM deferred.
- The pre-reset `register_item` / `record_purchase` are deleted from the program; settlement is a new design behind Q5.
**Exit:** devnet purchase completes with receipt; marketplace never mentions bonding curves.
**Non-goals:** bonding curves, guild tokens, Jupiter routing.

## M4 — Playground + Social (reasons to return)

**Goal:** lightweight multiplayer + shared spaces using pet as identity.
**Entry:** M3 exit (inventory + marketplace stable).
**Build:**
- `app/(game)/playground`: 1–2 turn-based / async mini-games (no real-time MMO), pet-identity header, rewards feed into XP (via existing care-XP path, never token-gated).
- Daily goals, streaks, shareable moments (screenshot card + copy link).
- Friends / visits read-only first (visit home, react with emote).
- Anti-bot: rate limits, cooldown reuse, anomaly flags (see `GAME-DESIGN.md` §8).
**Exit:** retention instrumentation live (see `SAFETY-ECONOMY.md` metrics); core loop completable wallet-free.

## M5 — Guilds read-only (community without tokens)

**Goal:** approved guilds discoverable, joinable socially, zero token mechanics.
**Entry:** M4 exit.
**Build:**
- Guild registry (DB): `app/(game)/guilds`, `app/(game)/guilds/[slug]` — purpose, admins, utility, policy status, events, badges (non-token).
- Social join/leave, event RSVP, cosmetic-theme votes (one-member-one-vote, no token weight).
- Moderation queue + report flow (see `SAFETY-ECONOMY.md`).
**Exit:** 1–2 seed guilds live with events + votes; no mint, no DBC, no swap UI anywhere.
**Why separate:** proves community value before financialization; required by product requirement 1–2.

## M6 — Guild Launches (DBC → DAMM v2, controlled)

**Goal:** 1 pilot guild token launches on constrained DBC preset, graduates to DAMM v2, benefits stay cosmetic/social.
**Entry:** M5 exit + legal review + Q3/Q4 (Meteora SDK, indexer) resolved + multisig treasury ready.
**Build:** full `METEORA-INTEGRATION.md` + `INDEXER.md`:
- Launch registry (mint, DBC config, DAMM v2 pool, lifecycle status).
- Quote/swap UI with disclosures, slippage, fees, impact, three-state routing (DBC active / migration pending / DAMM v2 active).
- Indexing + tx-status reconciliation; eligibility service (token-gated cosmetics only).
- Treasury dashboard (inflows/outflows, signers, policies).
**Exit:** pilot completes DBC→DAMM v2 with verified routing; metrics + safety dashboards live; broader availability explicitly **not** opened (see VISION §8 + release stages).
**Non-goals:** DLMM, self-service launchpad, per-pet tokens.

## M7 — Hardening / Scale (broader availability gate)

**Goal:** earn the right to more guilds / self-service applications.
**Entry:** M6 pilot metrics meet launch criteria (participation up, accessibility intact, zero critical safety incidents).
**Build:** alerting SLOs, load tests, support runbooks,ouverts audit, DLMM evaluation (only with named operator), self-service application flow behind review.
**Exit:** checklist in `SAFETY-ECONOMY.md` §6 all green + human sign-off.

## Dependency map

```text
M1 (chain reads/writes, no DB)
 └─ M2 (metadata shape, no DB writes required; static catalog)
     └─ M3 (DB + marketplace APIs) ─┐
         └─ M4 (social, uses M2+M3 identity) ─┐
                 └─ M5 (guild registry on same DB) ─┐
                         └─ M6 (Meteora + indexer + treasury) ─┐
                                                                 └─ M7
```

Parallelizable after M1: avatar art + Home UI (M2) can proceed alongside marketplace schema design (M3) as long as `DOMAIN-MODEL.md` types are frozen first.

## What agents should do now

1. M0–M2 are done; M4 and M5 are done in part (see the status line). Read `PRODUCT.md` for what ships before building on it.
2. When picking up an M3+ task, read its epic and `OPEN-QUESTIONS.md`. If its blocking question is unresolved, do the **schema/interface** task only, not the integration.
3. Keep `docs/DECISIONS.md` history intact; new choices go in `OPEN-QUESTIONS.md` until a human approves.
