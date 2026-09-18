# Pawket — Pets as NFTs & Customization

**Status:** SPEC. Today pets are PDA records (`Pet`/`PetPassport`), not NFTs. This file defines the migration to "every pet begins as a unique NFT" without breaking the current program or forcing agents to guess. Human decision Q1 (NFT standard) gates on-chain work; off-chain shapes below are buildable now.

## 1. Recommendation (founding-engineer take)

**Adopt Metaplex Core** for pet + cosmetic NFTs (see Q1 for alternatives considered).

- Single-asset model fits 1:1 pets + accessory items; lower rent than Token Metadata + master-edition stacks; first-class attributes/plugins for traits.
- Link pattern: `Pet` PDA gains optional `petMint: Address` (program upgrade, human-gated) OR Core asset carries `pda` attribute pointing at the existing PDA. Either way the PDA stays the stats/XP authority; the NFT is the identity/collectibility wrapper.
- Cosmetics as Core assets in per-drop collections (tradeable flag per item); guild badges as soulbound-ish (non-transferable plugin or off-chain badge v1, on-chain later).

**Until Q1 is approved:** build M2 against the off-chain `PetMetadata` shape in `DOMAIN-MODEL.md` (appearanceSeed, equippedIds) so the Core migration is a field-fill (`mint`), not a redesign.

## 2. Pet creation (target)

```text
pick base (species) → name (2–24 UTF-8 bytes, trim→PDA) → personality → appearance roll (seeded RNG, deterministic preview)
 → [M1] sign adopt_pet (PDA) → [M3+] mint Core asset (collection: Pawket Pets) with attributes:
   { species, personality, appearanceSeed, generation, dropId } → link PDA↔mint → inventory/home render
```

- Base pets: LunaCat / MossPup / CloudBun at launch (additive species later — enum extension + art pack, no PDA change since species is ix arg, not seed).
- Rarity: appearance variation is cosmetic-bucketed (common/uncommon/rare looks), never stat-weighted. No lootbox copy; show the full look before signing.
- Fixed SOL mint price (see `MARKETPLACE.md`); no bonding curve on pets, ever.

## 3. Customization system

**Slots:** body(skin) / head / eyes / scene(background) / audio(music) / flair(badge). One equipped per slot; `equippedCosmeticIds: string[]` validated against slot uniqueness + `compatibleSpecies`.

**Sources:** starter set (free, off-chain v1) → earned (goals/streaks/events) → purchased (fixed SOL) → guild drops (cosmetic-only, M6). Trading of `tradeable:true` items via marketplace secondary (M3+); soulbound badges never listable.

**Equip semantics v1 (honest):** local/DB preview ("preview — not saved on-chain") until on-chain equip ships or the team explicitly blesses off-chain equip as canonical for v1 (record in DECISIONS). Avatar (`pet-avatar.tsx`) renders deterministically from `species + appearanceSeed + equippedIds` — same input → same SVG hash (tested).

## 4. Rendering

- **V1:** deterministic SVG composer (layered shapes per trait + cosmetic overlays). No external art service; art pack = versioned asset directory (`public/pets/v1/`) with a manifest; hash-pinned in tests.
- **Later:** optional 3D/expressive Home (emote animations) — gated behind retention proof; SVG trait IDs map forward so equipped looks survive the upgrade.
- Music/backgrounds are scene IDs, not audio files on-chain; client maps ID → asset + license note.

## 5. Copy rules (honest UI)

- Pre-NFT: say **"on-chain pet record"**, never "NFT" / "owned NFT".
- Post-NFT: say "Pet NFT · Core asset · [collection]" with Explorer link to mint **and** PDA.
- Preview equips: banner "Preview — appearance not saved on-chain yet."
- No "rare = stronger" language anywhere; rarity is look-only.

## 6. Agent tasks (when Q1 approved)

1. `lib/nfts/pet-metadata.ts` — builders for Core attribute JSON from `PetMetadata` (pure, tested exact).
2. PDA↔mint link read helper (`usePetNft`) with loading/mismatch states (mint points elsewhere → warning, chain PDA wins).
3. `data/cosmetics.json` → seed script → `CosmeticDef` table (E04/E05); each entry carries `tradeable`, `compatibleSpecies`, art manifest ref.
4. Avatar determinism test + equip-validation test (slot conflict, incompatible species rejected with one-sentence copy).

## 7. Alternatives rejected (for DECISIONS log when approved)

- Token Metadata + Master Edition: heavier, overkill for game items; keep only if marketplace tooling demands it.
- Compressed NFTs: cheaper at scale but indexer/composability cost now; revisit at 100k+ pets.
- Pure-PDA (no NFT): simplest today but fails the "collectible NFT identity" vision; keep PDA authority regardless.
