# Pawket — Marketplace

**Status:** BUILT on devnet (2026-10) as the **Market**: primary sales of
looks at fixed prices, settled by the program itself. No database, no order
book, no resale. A secondary market and any sale of a pet stay SPEC, behind
Q1 and Q5 (`OPEN-QUESTIONS.md`).

## 1. Principles (normative)

- **Looks only.** Everything sold is expression: a piece a pet wears, a room
  the player lives in, or a frame for their photos. Nothing sold changes a vital, XP, a cooldown, a score
  or a place in a guild.
- **Fixed, published prices.** Prices live in the program (`item_price` in
  `programs/pawket/src/lib.rs`), the same for everyone; only a program
  upgrade changes them. `MARKET` in `src/lib/solana/program.ts` mirrors them,
  and `program.test.ts` holds the two together.
- **Settled on chain, in one signature.** `buy_with_wallet` moves the price from the
  buyer's Pawket Wallet straight to Pawket's treasury and records the item in the buyer's
  `Closet` in the same instruction. There is no order, no escrow and no
  receipt to reconcile: the transaction is the receipt.
- **Nothing is resold, and nothing is bought back.** A closet is for good.
- **Adoption stays free.** No pet is sold. A pet asset anyone can sell or
  send is a separate decision (Q1, Q5).

## 2. What it sells

| Item ids | What | Price | Used with |
| --- | --- | --- | --- |
| 4–22 | Nineteen pet pieces | 0.05 SOL each | `dress_owned`, on the buyer's pets on Solana |
| 64–71 | Eight rooms | 0.1 SOL each | the room picker |
| 80–83 | Postcard, Film strip, Garden, Sunshine photo frames | 0.025 SOL each | Home → Photo → Photo frame |

The wool scarf, paper crown and red collar are free starters. Light and
Dark (plus following the device) are free. All other choices appear in the
Market; Profile shows starters and confirmed purchases only. Stickers
remain achievements and no longer unlock wardrobe pieces.

Catalog slot numbers stay unchanged. Blossom and Aurora remain 64 and 65;
Strawberry through Starlight use 66–71. The existing 256-bit Closet holds
all entitlements without a layout migration. A previously worn piece is
not stripped from a pet when its availability changes.

## 3. The flow

```text
/market → tap an item → a Paper sheet over the shelves: your own pet wearing it (or sitting
  in the room), its price, where the SOL goes, who pays the fee
  → "Buy for 0.05 SOL" → the wallet signs → Solana confirms → the closet is read again
  → every screen refreshes its closet read → the piece, room or photo frame becomes available
```

- The sponsor pays the network fee and the closet's rent the first time; the
  buyer's Pawket Wallet pays the price (`checkSponsorable` lets the sponsor be `buy_with_wallet`'s
  `payer`, never its `owner`).
- A pet in this browser cannot wear a bought piece: the closet belongs to a
  wallet, so the wardrobe says to keep the pet on Solana first.
- Purchases require a linked, funded Pawket Wallet. The owner still approves money; the app never falls back to paying from their external balance. Legacy `buy` stays on chain for compatibility; the app does not use it.
- A linked device can put a bought piece on (`dress_owned_by_device`); it can
  never buy.

## 4. Money and transparency

- Every sale lands in `PAWKET_TREASURY` (`SEpAw5i…vWfw` on devnet). The
  treasury's balance and what has been paid in are on `/pulse`, read live.
- The treasury's key is not on the server; on mainnet it is a multisig
  (`docs/MAINNET.md`).
- The treasury also receives Pawket's share of guild-coin fees, and pays the
  network fees Pawket covers for everyone's pets.

## 5. Not built (and why)

- **Secondary sales** of bought pieces: no escrow design yet (Q5), and
  nothing should invite speculation on looks.
- **Selling pets**: the Passport is proof of care; selling it would sell
  someone else's care.
- **USDC prices, bundles, packs with hidden odds, auctions**: never planned.

## 6. Tests

`programs/pawket/tests/program/market.rs` (purchase into the treasury and
nowhere else, nothing bought twice, only what is sold, wearing from the
closet, a device dressing from it, the closet's layout), `program.test.ts`
(prices and item ids against the program), `sponsor.test.ts` (the sponsor
pays the closet, never the price), and `devnet.test.ts` (a purchase and a
wear against the deployed program).
