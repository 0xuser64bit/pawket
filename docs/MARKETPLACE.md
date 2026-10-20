# Market

The Market sells cosmetic looks at fixed prices, settled by the program.
There is no order book or resale. A secondary market or pet transfer needs
a separately approved product and protocol design; see `DECISIONS.md`.

## Purchase rules

- **Looks only.** Everything sold is expression: a piece a pet wears, a room
  the player lives in, or a frame for their photos. Nothing sold changes a vital, XP, a cooldown, a score
  or a place in a guild.
- **Fixed, published prices.** Prices live in the program (`item_price` in
  `programs/pawket/src/lib.rs`), the same for everyone; only a program
  upgrade changes them. `MARKET` in `src/lib/solana/program.ts` mirrors them,
  and `program.test.ts` holds the two together.
- **Settled in one atomic transaction.** `buy_with_wallet` moves the price from the
  buyer's Pawket Wallet straight to Pawket's treasury and records the item in the buyer's
  `Closet` in the same instruction. There is no order, no escrow and no
  receipt to reconcile: the transaction is the receipt.
- **Nothing is resold, and nothing is bought back.** A closet is for good.
- **Adoption has no purchase price.** No pet is sold. A pet asset anyone can sell or
  send requires a separate product and protocol design.

## Catalog

| Item ids | What | Material | Price | Used with |
| --- | --- | --- | --- | --- |
| 4–18 | Fifteen classic pet pieces | Cloth | 0.02 SOL each | `dress_owned`, on the buyer's pets on Solana |
| 19–28 | Ten pet pieces: halo, wizard hat, sun hat, gold crown, cowboy hat, chef hat, sunglasses, headphones, beret, necktie | Foil | 0.05 SOL each | `dress_owned` |
| 64–75 | Twelve rooms: Blossom, Aurora, Strawberry, Honey, Matcha, Seaside, Lavender, Starlight, Terracotta, Newsprint, Cocoa, Arcade | Glass | 0.1 SOL each | the room picker |
| 80–87 | Eight photo frames: Postcard, Film strip, Garden, Sunshine, Instant, Hearts, Starry night, Confetti | Copper | 0.025 SOL each | Home → Photo → Photo frame |

Each shelf's material is its tile's trim, and the word is written beside the
price ("Cloth piece", "Glass room"). The material says what kind of thing it
is; it is never a rarity anyone can chase, and nothing is scarce.

The wool scarf, paper crown and red collar are free starters. Light and
Dark (plus following the device) are free. All other choices appear in the
Market; Profile shows starters and confirmed purchases only. Stickers
remain achievements and no longer unlock wardrobe pieces.

Catalog slot numbers stay unchanged. Blossom and Aurora remain 64 and 65;
Strawberry through Starlight use 66–71, and the second shelf's rooms 72–75.
The existing 256-bit Closet holds all entitlements without a layout
migration. A previously worn piece is not stripped from a pet when its
availability or price changes. Every new piece is drawn three ways: on the
pet (`pet-art.tsx`), as a tile (`WearableArt`) and in the 3D room
(`room3d/wearables.ts`, held complete by `wearables.test.ts`); a frame is
drawn on the print (`printPhoto`) and on the shelf (`FrameArt`).

## Purchase flow

The shelves can be searched by any word a thing is known by (its name, its
line, where it is worn, its material, a room's colours) and narrowed to hats,
glasses, neck, back, rooms, frames or what the closet holds. The address keeps
the shelf, so `/market#room` opens on the rooms (`src/lib/market/shelf.ts`).

```text
/market → tap an item → a Paper sheet over the shelves: your own pet wearing it (or sitting
  in the room), its price, where the SOL goes, who pays the fee
  → approve the displayed purchase price → the wallet signs → Solana confirms → the closet is read again
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

## Treasury and fees

- Every sale lands in `PAWKET_TREASURY` (`SEpAw5i…vWfw` on devnet). The
  treasury's balance and what has been paid in are on `/pulse`, read live.
- The treasury's key is not on the server; a mainnet multisig is a release requirement
  (`docs/MAINNET.md`).
- The treasury receives Pawket's claimed share of guild-coin fees. The
  separate sponsor pays eligible fees from its own float; there is no automatic
  treasury-to-sponsor funding service.

## Product scope

- **Secondary sales** of bought pieces: outside the supported product scope, and
  nothing should invite speculation on looks.
- **Selling pets**: the Passport is proof of care; selling it would sell
  someone else's care.
- **USDC prices, bundles, packs with hidden odds, auctions**: never planned.

## Verification

`programs/pawket/tests/program/market.rs` (purchase into the treasury and
nowhere else, nothing bought twice, only what is sold, wearing from the
closet, a device dressing from it, the closet's layout), `program.test.ts`
(prices and item ids against the program), `sponsor.test.ts` (the sponsor
pays the closet, never the price), and `devnet.test.ts` (a purchase and a
wear against the deployed program).
