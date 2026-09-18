# Pawket — Marketplace

**Status:** SPEC (M3). No marketplace exists today; `register_item` / `record_purchase` are explicitly **not** a store (see `program.ts` SAFETY) — no builders, no UI until the program is admin-gated + moves tokens.

## 1. Principles

- **Fixed, understandable SOL prices** for primary adoption + cosmetic drops. No auctions, no offers, no bonding curves in marketplace scope.
- Pet-first: pet listings rank above cosmetics; guild tokens never appear here (separate Guild Launch tab).
- Every purchase: explicit sign → simulate → confirm → **receipt + Explorer link**. Timeout = unknown + lookup, never "failed".
- Fees transparent pre-sign: price, protocol/creator fee (bps), total. Server computes canonical totals (integer lamports).

## 2. Flows

### Primary adoption (base pet + customizations)

```text
browse bases → pick species → name/personality → optional cosmetics → quote (fixed price + fees)
 → sign adopt (+ [FUTURE] mint) → confirm → receipt (/marketplace/receipts/[orderId]) → pet appears in Inventory + Home
```

- Quote is **not** a swap quote: no slippage/impact UI. Show: base price, cosmetic add-ons, feeBps breakdown, total, fee recipient.
- Chain write reuses `getAdoptPetInstruction` (same lifecycle as E01); DB order mirrors signature/slot for receipts/search.

### Cosmetic acquisition

- V1: DB entitlement (purchase → `equippedIds` unlock). Label "off-chain entitlement" until on-chain item movement ships.
- Secondary (later M3.x): fixed-price relist of `tradeable:true` items; seller sets price within floor/ceiling guardrails; escrow design gated by Q5 (treasury-signer vs program escrow).

## 3. Data & API (see API-CONTRACTS.md §3)

- `Listing { kind: pet_adoption|cosmetic, refId, priceLamports, feeBps, seller, status }`; `Order { listingId, buyer, signature?, slot?, status, receiptUrl? }`.
- `GET /api/marketplace/listings` (paginated, filterable); `POST /api/marketplace/orders` (intent, idempotent) → client signs → `POST .../confirm {signature}` → `GET .../:id` receipt.
- Price math server-side, exact lamports, tested (no float SOL math in checkout).

## 4. UI contract

- `listing-card.tsx` (art, name, species/personality or cosmetic slot, price, fee note) → `[listingId]` detail (full breakdown + policy + creator) → `checkout-sheet.tsx` (total, recipient, simulate status, sign CTA, disabled-while-sending) → `receipt-view.tsx` (status, signature, Explorer link, "View in Inventory").
- No-wallet: full browse; checkout gates with connect CTA + install guidance.
- Failure copy reuses `toUserFacingError` + order-state copy (`failed` preserves input + safe retry; `unknown` offers signature lookup + poll).

## 5. Fees & treasury (v1)

- Single `feeBps` per listing (e.g., 500 = 5% — value set at launch config, published). Split: creator share + Pawket treasury share (shares published per drop).
- Fee recipient wallets published on listing detail; treasury inflows indexed (see `INDEXER.md`).
- No hidden spreads; no "gas estimation" markup — network fee is Solana's, shown separately.

## 6. Non-goals / guards

- No `register_item`/`record_purchase` wiring until program fix (admin-gate + token movement) + audit note.
- No Jupiter routing, no USDC checkout v1 (SOL first; USDC adds quote-asset complexity — defer to M6 quote-asset work).
- No rarity-gated power, no lootboxes, no "packs" with hidden odds (would need odds disclosure + legal review).
- Marketplace never lists guild tokens; launch swaps live only under Guild → Launch tab.

## 7. Agent DoD (E05)

- Devnet purchase completes with receipt + working Explorer link (manual check noted in PR).
- Contract tests: fee math exact, idempotent order creation, unavailable-listing rejection.
- E2E: marketplace renders wallet-free; checkout CTA disabled without wallet (no signing in e2e).
- Copy audit: no "NFT" unless NFT wiring exists; no "on-chain item" for DB entitlements.
