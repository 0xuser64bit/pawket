# Pawket — Domain Model

**Status:** SPEC — TypeScript sketches are interface contracts for M1–M6. Field names are normative once an epic starts; renames after M3 require a migration note. On-chain shapes must match the Anchor program/IDL; off-chain tables live in Prisma (E04).

**Rule:** one home per fact (extends `AGENTS.md` sources-of-truth). Chain owns ownership/progression; DB caches + social graph; client never invents IDs.

## 1. Ownership map

| Fact | Owner | Cache |
| --- | --- | --- |
| Pet existence, owner, stats, XP, cooldown | Chain: `Pet` + `PetPassport` PDAs | DB `PetMeta` mirrors for search (reconciled, shows `indexedAt`) |
| Pet art/traits | Off-chain metadata (→ Metaplex Core attributes, Q1) | `data/cosmetics.json` → `CosmeticDef` table |
| Listings, orders, receipts | DB (chain receipt = signature + slot) | — |
| Guild identity, policy, membership, events, votes | DB registry | — |
| Guild token mint, DBC config, DAMM v2 pool, lifecycle | Chain (Meteora) + `LaunchConfig` row | Indexer-verified `lifecycleStatus` |
| Treasury flows | Chain (multisig wallets) | Indexer `TreasuryEvent` cache |
| Eligibility (cosmetic/social) | Computed: chain balance + DB rules | Cached 30–60s, never authoritative for power (there is no power) |

## 2. On-chain (existing program — do not change without deploy plan)

```ts
// PDA seeds (LOCKED — src/lib/solana/program.ts, held to src/lib/solana/idl/pawket.json)
type Seed = "pet" | "passport";
// Pet identity = (owner Address, exact UTF-8 name bytes, 2–24 bytes, trimmed before derivation)
// Instructions: adopt_pet, perform_care_action, finish_round, dress (see docs/SOLANA.md)
// Accounts: Pet (130 bytes, name last), PetPassport (169 bytes, ring of the last 8 cares)
```

The pre-reset `register_item` / `record_purchase` / `GameConfig` are deleted from the program; a store, if one is ever built, is a new design (Q5).

**Needed program work (future, human-gated):** NFT linkage (`petMint` on `Pet` or Core collection with PDA attribute), on-chain equip (or explicit off-chain-equip decision), marketplace escrow (or explicit fixed-price treasury-signer decision). See `OPEN-QUESTIONS.md` Q1/Q5. Agents: spec against the current PDAs; gate new instructions behind deploy-plan tasks.

## 3. Core TypeScript (normative sketches)

```ts
// src/lib/game/enums.ts (EXISTS — extend, don't rename)
enum PetSpecies { LunaCat="luna_cat", MossPup="moss_pup", CloudBun="cloud_bun" } // future: Bird, Fox — additive only
enum PetPersonality { Curious="curious", Cozy="cozy", Brave="brave", Mischief="mischief" }
enum CareActionType { Feed="feed", Play="play", Groom="groom", Rest="rest" }
enum PetMood { Radiant="radiant", Happy="happy", Okay="okay", Hungry="hungry", Lonely="lonely", Tired="tired", Scruffy="scruffy" }
interface PetStats { hunger:number; happiness:number; energy:number; hygiene:number } // 0–100

// Pet view-model (chain + metadata joined at read time)
interface Pet {
  address: Address; owner: Address; name: string;
  species: PetSpecies; personality: PetPersonality;
  stats: PetStats; xp: number; level: number; mood: PetMood;
  lastCareAt: string | null; createdAt: string;
  metadata: PetMetadata; // off-chain
}
interface PetMetadata {
  petAddress: Address; mint?: Address; // [FUTURE] Core NFT mint
  appearanceSeed: string; avatarSvgHash?: string;
  equippedCosmeticIds: string[]; backgroundId: string; musicId: string;
  indexedAt?: string; lagSlots?: number;
}

// Cosmetics (expression only — type system bans power)
interface CosmeticDef {
  id: string; kind: "skin"|"accessory"|"background"|"music"|"badge";
  name: string; slot: "body"|"head"|"eyes"|"scene"|"audio"|"flair";
  compatibleSpecies: PetSpecies[] | "all";
  tradeable: boolean; priceLamports?: bigint; // fixed-price only in M3
  // NOTE: no statModifier, no xpBoost, no power field may ever be added. See SAFETY-ECONOMY.
}
```

## 4. State machines

**Pet lifecycle:** `guest-preview → adopting(signing/sending/confirming) → active → (caring ↔ cooling) → customized`. Adopt/care never optimistically advance; confirmation + reload moves state.

**Care cooldown:** per-action 30 min (`CARE_COOLDOWN_SECONDS`), validated client-side (`validateCareCooldown`) + enforced on-chain (6002). Clock injected (`now`), never global-mocked.

**Marketplace order (M3):** `draft → quoting(fixed price + fees) → signing → sending → confirming → confirmed(receipt + Explorer) | failed(preserve input, safe retry) | unknown(timeout → lookup by signature)`.

**Guild launch (M6):** `applied → in-review → approved(preset assigned) → published(config public) → dbc-active → migration-pending(sends blocked) → dammv2-active | ended(no graduation → per published config, no implied refund) → suspended(product-surface only)`. See `METEORA-INTEGRATION.md`.

**Guild membership vs token holding (separate axes):** `member: joined|left|banned` is social (DB); `holder: 0|>0` is chain balance. Benefits read both but only grant cosmetic/social (see `GUILDS.md`).

## 5. Prisma sketch (E04 — proposed, Q2 confirms provider)

```prisma
model User { id String @id @default(cuid()); walletAddress String? @unique; guestId String? @unique; createdAt DateTime @default(now()); pets PetMeta[]; memberships GuildMembership[]; }
model PetMeta { petAddress String @id; ownerWallet String; name String; species String; personality String; appearanceSeed String; equippedIds String[]; backgroundId String; musicId String; mint String?; indexedAt DateTime; }
model CosmeticDef { id String @id; kind String; slot String; name String; compatible String[]; tradeable Boolean; priceLamports BigInt?; }
model Listing { id String @id @default(cuid()); kind String; // "pet_adoption" | "cosmetic"
  refId String; priceLamports BigInt; feeBps Int; seller String; status String; createdAt DateTime @default(now()); }
model Order { id String @id @default(cuid()); listingId String; buyer String; signature String?; slot BigInt?; status String; receiptUrl String?; createdAt DateTime @default(now()); }
model Guild { slug String @id; name String; status String; // "applied"|"approved"|"live"|"suspended"
  purpose String; admins String[]; utilityStatement String; policyUrl String; treasuryWallets String[]; createdAt DateTime @default(now()); }
model GuildMembership { id String @id @default(cuid()); guildSlug String; userId String; role String; joinedAt DateTime @default(now()); @@unique([guildSlug, userId]) }
model LaunchConfig { guildSlug String @id; presetId String; mint String?; dbcPool String?; dammv2Pool String?; lifecycleStatus String; quoteAsset String; graduationThreshold String; feeSchedule Json; allocations Json; vesting Json; publishedAt DateTime?; }
model TreasuryEvent { id String @id @default(cuid()); guildSlug String; wallet String; direction String; amountLamports BigInt; signature String; slot BigInt; memo String?; indexedAt DateTime @default(now()); }
```

## 6. Invariants agents must preserve

1. Pet identity `(owner, name bytes)` — trim before PDA; never case-fold or Unicode-normalize beyond trim (would fork PDAs).
2. Game math ↔ program lockstep (`INITIAL 72`, deltas, `XP+10`, `level=xp/100+1`, cooldown 30m, decay/hr 2.5/1.8/1.5/1.2) — change both sides + tests or neither.
3. No power fields on cosmetics/guild benefits — PRs adding `stat*`, `xp*`, `boost*`, `priority*` outside `src/lib/game/` fail review.
4. Guild token data never renders inside pet/inventory components (hierarchy rule — pet first).
5. Every chain-derived UI shows freshness (`indexedAt`/slot) once the indexer exists; before that, label "live RPC read".
