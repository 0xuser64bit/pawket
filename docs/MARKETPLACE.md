# Pawket — Marketplace

**Status:** BUILT on devnet (2026-10) as the **Market**: primary sales of
looks at fixed prices, settled by the program itself. No database, no order
book, no resale. A secondary market and any sale of a pet stay SPEC, behind
Q1 and Q5 (`OPEN-QUESTIONS.md`).

## 1. Principles (normative)

- **Looks only.** Everything sold is expression: a piece a pet wears, a room
  the player lives in. Nothing sold changes a vital, XP, a cooldown, a score
  or a place in a guild.
- **Fixed, published prices.** Prices live in the program (`item_price` in
  `programs/pawket/src/lib.rs`), the same for everyone; only a program
  upgrade changes them. `MARKET` in `src/lib/solana/program.ts` mirrors them,
  and `program.test.ts` holds the two together.
- **Settled on chain, in one signature.** `buy` moves the price from the
  buyer straight to Pawket's treasury and records the item in the buyer's
  `Closet` in the same instruction. There is no order, no escrow and no
  receipt to reconcile: the transaction is the receipt.
- **Nothing is resold, and nothing is bought back.** A closet is for good.
- **Adoption stays free.** No pet is sold. A pet asset anyone can sell or
  send is a separate decision (Q1, Q5).

## 2. What it sells

| Item id | What | Price | Worn or used with |
| --- | --- | --- | --- |
| 19 | Halo | 0.05 SOL | `dress_owned` (any of the buyer's pets on Solana) |
| 20 | Wizard hat | 0.05 SOL | `dress_owned` |
| 21 | Sun hat | 0.05 SOL | `dress_owned` |
| 22 | Gold crown | 0.05 SOL | `dress_owned` |
| 64 | Blossom (a room) | 0.1 SOL | the room picker, on any device of the buyer's wallet |
| 65 | Aurora (a room) | 0.1 SOL | the room picker |

Pieces are wardrobe slots after the free eighteen, so the catalog
(`src/lib/closet/catalog.ts`) and the program agree on their numbers. Rooms
are token blocks in `app/globals.css` with an `item` in `src/config/themes.ts`.

## 3. The flow

```text
/market → tap an item → a Paper sheet over the shelves: your own pet wearing it (or sitting
  in the room), its price, where the SOL goes, who pays the fee
  → "Buy for 0.05 SOL" → the wallet signs → Solana confirms → the closet is read again
  → the wardrobe offers the piece / the room picker offers the room
```

- The sponsor pays the network fee and the closet's rent the first time; the
  buyer pays only the price (`checkSponsorable` lets the sponsor be `buy`'s
  `payer`, never its `owner`).
- A pet in this browser cannot wear a bought piece: the closet belongs to a
  wallet, so the wardrobe says to keep the pet on Solana first.
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
