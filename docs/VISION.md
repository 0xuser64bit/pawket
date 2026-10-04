# Pawket — Vision & Product Requirements (PRD)

**Status:** the product's north star. What ships today is in `PRODUCT.md`, and where each milestone stands is in `ROADMAP.md`. Nothing below is presented in UI as live until it is built and, where it lives on Solana, read from chain.
**Sources:** founder brief (Sep 2026) + `docs/PRODUCT.md` (current truth) + `docs/ARCHITECTURE.md`.
**Companion docs:** `ROADMAP.md` (sequencing) → `EPICS.md` (epic cards) → `TASKS.md` (atomic agent tasks).

---

## 1. One-line pitch

> **A social virtual-pet game where collectible pets become part of each player's on-chain identity.**

Communities may optionally form **guilds** around shared identity, events, cosmetics, and lightweight governance. Guilds enrich social play; they are **never required** for play or pet progression.

## 2. Vision

Playful, social virtual-pet game built around **collecting, caring for, and showing off** digital pets. Every pet begins as a unique NFT — cat, dog, bird, and beyond — and grows into a persistent part of its owner's identity.

Experience is **social and expressive first**. Ownership, customization, and trading add utility without getting in the way of fun.

### Player pillars

| Pillar | Player experience | Pet-first check |
| --- | --- | --- |
| **Collect** | Adopt unique pets with appearance, traits, progression potential | Pet is the primary identity primitive |
| **Customize** | Skins, accessories, upgrades via SOL; earned or purchased | Expression, never power (no pay-to-win) |
| **Care & progress** | Routines, tasks, challenges → XP, levels, unlocks | Progress is visible on pet + Passport |
| **Play together** | Lightweight multiplayer with pet as in-world identity | Token never gates baseline play |
| **Socialize** | Shared spaces, emotes, shareable moments | Wallet-free participation supported |
| **Join communities** | Optional guilds: creators, pet types, events | Social join ≠ token purchase |
| **Trade** | Player-driven marketplace for pets + compatible items | Standard adoption is fixed-price SOL, never a bonding curve |

### Experience loop

```text
Adopt a pet → Make it yours → Care & play → Grow together → Meet others → Join communities → Collect & trade
```

## 3. Platform areas

Four connected areas + one optional layer. Route mapping lives in `ROUTES.md`; IA below is product truth.

### 🏠 Home — personal space, everyday start

- Active pet + player character present, expressive, personal.
- Interact via emotes + simple actions.
- Background music (mood), backgrounds / visual environments.
- **Non-goals v1:** full room editor, multiplayer home visits (defer to Playground).

### 🛍️ Marketplace — discover, adopt, personalize

- Browse pets available for adoption.
- Choose a **base pet** before customizations.
- Discover / acquire cosmetics + accessories.
- Unique pet + player identifiers on-chain.
- **Rule:** standard adoption = understandable fixed SOL price. No bonding curve on adoption. See `MARKETPLACE.md`.

### 🎮 Playground — social + gameplay destination

- Accessible multiplayer games with customized pet as identity.
- Earn progression + rewards through activities.
- Social interaction, collaboration, competition.
- Expandable game modes over time.
- **Non-goals v1:** real-time physics MMO, guild-gated tournaments.

### 🎒 Inventory — collection + customization hub

- View / manage owned pets.
- Organize cosmetics, accessories, collected items.
- Apply / update pet + player customizations.
- Pet NFTs visually and hierarchically **above** guild tokens always.

### 🏰 Guilds — optional community layer

- Discover **approved** creator / community guilds.
- Join shared spaces, events, challenges.
- Vote on cosmetic / social-experience topics only.
- View treasury activity, launch info, public policies.
- Collect / equip guild badges, cosmetics, non-competitive identity items.
- Full spec: `GUILDS.md` + `METEORA-INTEGRATION.md`.

## 4. Design principles (normative)

1. **Play before protocol** — welcoming even with no NFT / SOL knowledge.
2. **Expression creates attachment** — customization makes pets personal + recognizable.
3. **Progress feels visible** — care, play, achievements show growth.
4. **Social moments drive retention** — shared spaces + easy multiplayer = reasons to return.
5. **Ownership has utility** — collecting / trading enriches play, not parallel to it.
6. **Participation is optional** — guilds / guild tokens extend social play, never restrict core access.
7. **No pay-to-win** — economic participation never creates stat, matchmaking, or competitive advantage.
8. **Transparent ownership** — supply, allocations, liquidity, fees, treasury visible + understandable.
9. **Community utility over speculation** — guild systems serve expression / coordination before trading.

## 5. Asset model (normative)

| Asset | Purpose | Required for core play? | Financialized? |
| --- | --- | --- | --- |
| Pet NFT | Persistent identity: ownership, appearance, traits, progression record | No — guest / non-wallet onboarding supported | No |
| Cosmetics / accessories | Expression, personalization, collection | No | Generally no; resale may be supported separately |
| Guild token | Optional coordination, identity, approved utility | No | **Yes** — on-chain liquidity; carries risk disclosures |
| SOL / USDC | Payment + quote assets | No | Yes |
| Guild treasury | Community funds for events / prizes / cosmetics | No | Managed under published controls |

Pet NFTs remain the primary ownership primitive. Guild tokens are optional infrastructure and **must appear separately** from pets / cosmetics / inventory items in UI.

### What a guild token may / must not do

**May:** profile flair, badges, non-competitive cosmetics; optional creator/community event access; votes on cosmetic themes / space decoration / event formats; community funding proposals (where legal/operationally appropriate); discounts / early access for non-essential cosmetic drops (clear terms); transparent treasury contribution.

**Must not:** stat increases, care-speed increases, XP multipliers, gameplay power; matchmaking priority, competitive advantage, essential access gating; requirement to adopt / play / progress / trade; guaranteed yield / returns / price support / appreciation promises; automatic rewards merely for holding.

### Explicit non-goals

- No token per pet (fragments liquidity, financializes ownership prematurely).
- No bonding curve on standard adoption.
- No guild-gated onboarding (new player enjoys Pawket with no wallet/token/Solana knowledge).
- No unmoderated public launchpad in v1 (review + policy + support + accountability required).

## 6. Product requirements

### Core (P0 — every release must satisfy)

1. Usable without wallet, guild token, or token purchase.
2. Pets outrank guild tokens in discovery, home, inventory, social presentation.
3. Every guild token has a documented utility statement (social / cosmetic / coordination uses).
4. Token ownership cannot alter skill, stats, care outcomes, matchmaking, tournament scoring, baseline progression.
5. Launch pages show supply, allocation, fee, curve, liquidity, risk **before** signing.
6. Official guild info is visually distinguished from third-party links / impersonation attempts.
7. Pawket can suspend in-app promotion / benefits for violations **without** claiming to reverse on-chain ownership / transactions.

### Guild lifecycle — player view

1. Discover via Guilds area, creator profile, event, compatible cosmetic collection.
2. View purpose, admins, utility, policy status, treasury rules, supply, launch stage, risk disclosures.
3. Social join without buying where supported.
4. Quote view (if buying): quote asset, estimated output, slippage, fees, price impact, wallet confirmation.
5. DBC phase: progress shown as community info, not value promise.
6. Post-graduation: same profile routes swaps to DAMM v2, marks active liquidity.
7. Benefits usable only in optional social / cosmetic contexts described by guild.
8. Selling may end token-gated benefits; never removes pet or blocks basic play.

### Guild lifecycle — creation / review

1. Application: branding, admins, utility, moderation plan, allocation, treasury policy, requested launch config.
2. Review: product fit, misleading claims, prohibited utility, impersonation, legal/compliance, operational readiness.
3. Approved guild gets a **constrained DBC preset** (not free-form params in v1).
4. Pre-launch publish: supply, allocations, vesting, recipient wallets, fees, quote asset, curve params, graduation threshold, DAMM v2 destination.
5. Validate in controlled env before public launch.
6. Post-launch monitor: anomalies, concentration, abuse, impersonation, violations.

## 7. Acceptance bar (release gates)

- Wallet-free path completes core loop (adopt guest pet → care → progress → social preview) without signing.
- No pay-to-win: automated check that token-balance code paths never touch `src/lib/game/` stat/XP/matchmaking inputs (see `SAFETY-ECONOMY.md`).
- Every token purchase requires: utility statement viewed, risk disclosure acknowledged (first purchase), quote + fees + impact shown, explicit sign, signature + Explorer link after.
- Suspended guild: delisted from discovery, benefits disabled, factual on-chain record retained, copy distinguishes product-surface action from chain reversal.

## 8. What this PRD defers

- Exact NFT standard (see `OPEN-QUESTIONS.md` Q1; recommendation: Metaplex Core).
- Backend DB choice (see Q2; recommendation: Postgres + Prisma, introduced at Marketplace epic, not earlier).
- Indexer provider (see Q4; Helius vs custom RPC polling).
- Legal sign-off on guild-token copy + treasury flows (see `SAFETY-ECONOMY.md`).
- Playground netcode (deferred until care + inventory loops retain).

---

**Next:** `ROADMAP.md` turns this into phased milestones; `DOMAIN-MODEL.md` turns assets into records.
