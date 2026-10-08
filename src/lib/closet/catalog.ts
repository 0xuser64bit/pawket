/**
 * Expression only. A wearable changes how a pet is described. It has no
 * stat, XP, cooldown, or scoring field, and the type is not allowed to grow
 * one — see the catalog test.
 *
 * The order is the program's: a piece is stored on chain as its place here,
 * from 1 (`WEARABLE_COUNT` in `programs/pawket/src/lib.rs`). Append only.
 *
 * The first three are free starter pieces. Slots 4–28 are bought once for
 * SOL — the fifteen classics (4–18) at the classic price, the rest at the
 * wearable price (`item_price`) — recorded in the owner's closet and worn
 * with `dress_owned`. Existing slot numbers stay unchanged. Every piece is
 * expression only.
 */
export interface Wearable {
  id: string;
  name: string;
  kind: string;
  /** The piece's own glyph, for a chip beside the pet's name. */
  icon:
    | "scarf"
    | "crown"
    | "collar"
    | "star"
    | "cape"
    | "ribbon"
    | "bowtie"
    | "glasses"
    | "partyhat"
    | "bandana"
    | "beanie"
    | "hearts"
    | "wings"
    | "backpack"
    | "strawberry"
    | "bell"
    | "flower"
    | "sprout"
    | "halo"
    | "wizard"
    | "sunhat"
    | "goldcrown"
    | "cowboy"
    | "chef"
    | "shades"
    | "headphones"
    | "beret"
    | "tie";
  /** Its fixed price in the Market, in lamports, for a piece that is bought. */
  price?: bigint;
}

export const WEARABLES: readonly Wearable[] = [
  { id: "wool-scarf", name: "Wool scarf", kind: "Scarf", icon: "scarf" },
  { id: "paper-crown", name: "Paper crown", kind: "Crown", icon: "crown" },
  { id: "red-collar", name: "Red collar", kind: "Collar", icon: "collar" },
  { id: "star-pin", name: "Star pin", kind: "Pin", icon: "star", price: 20_000_000n },
  { id: "rain-cape", name: "Rain cape", kind: "Cape", icon: "cape", price: 20_000_000n },
  { id: "nap-ribbon", name: "Nap ribbon", kind: "Ribbon", icon: "ribbon", price: 20_000_000n },
  { id: "bow-tie", name: "Bow tie", kind: "Bow tie", icon: "bowtie", price: 20_000_000n },
  { id: "round-glasses", name: "Round glasses", kind: "Glasses", icon: "glasses", price: 20_000_000n },
  { id: "party-hat", name: "Party hat", kind: "Hat", icon: "partyhat", price: 20_000_000n },
  { id: "bandana", name: "Bandana", kind: "Kerchief", icon: "bandana", price: 20_000_000n },
  { id: "knit-beanie", name: "Knit beanie", kind: "Hat", icon: "beanie", price: 20_000_000n },
  { id: "heart-glasses", name: "Heart glasses", kind: "Glasses", icon: "hearts", price: 20_000_000n },
  { id: "bee-wings", name: "Bee wings", kind: "Wings", icon: "wings", price: 20_000_000n },
  { id: "little-backpack", name: "Little backpack", kind: "Pack", icon: "backpack", price: 20_000_000n },
  { id: "strawberry-hat", name: "Strawberry hat", kind: "Hat", icon: "strawberry", price: 20_000_000n },
  { id: "bell-collar", name: "Bell collar", kind: "Collar", icon: "bell", price: 20_000_000n },
  { id: "flower-crown", name: "Flower crown", kind: "Crown", icon: "flower", price: 20_000_000n },
  { id: "leaf-sprout", name: "Leaf sprout", kind: "Sprout", icon: "sprout", price: 20_000_000n },
  // The Market's, from slot 19: their price is the program's (`WEARABLE_PRICE_LAMPORTS`).
  { id: "halo", name: "Halo", kind: "Halo", icon: "halo", price: 50_000_000n },
  { id: "wizard-hat", name: "Wizard hat", kind: "Hat", icon: "wizard", price: 50_000_000n },
  { id: "sun-hat", name: "Sun hat", kind: "Hat", icon: "sunhat", price: 50_000_000n },
  { id: "gold-crown", name: "Gold crown", kind: "Crown", icon: "goldcrown", price: 50_000_000n },
  // Added with the Market's second shelf, from slot 23.
  { id: "cowboy-hat", name: "Cowboy hat", kind: "Hat", icon: "cowboy", price: 50_000_000n },
  { id: "chef-hat", name: "Chef hat", kind: "Hat", icon: "chef", price: 50_000_000n },
  { id: "sunglasses", name: "Sunglasses", kind: "Glasses", icon: "shades", price: 50_000_000n },
  { id: "headphones", name: "Headphones", kind: "Headphones", icon: "headphones", price: 50_000_000n },
  { id: "beret", name: "Beret", kind: "Hat", icon: "beret", price: 50_000_000n },
  { id: "necktie", name: "Necktie", kind: "Tie", icon: "tie", price: 50_000_000n },
];

const WEARABLE_IDS = new Set(WEARABLES.map((item) => item.id));

export function isWearableId(value: string): boolean {
  return WEARABLE_IDS.has(value);
}

export function findWearable(id: string | null | undefined): Wearable | undefined {
  if (!id) return undefined;
  return WEARABLES.find((item) => item.id === id);
}

/** The Market's pieces: bought once, worn by any of the buyer's pets on Solana. */
export const MARKET_WEARABLES = WEARABLES.filter((item) => item.price !== undefined);

/** A piece's place on chain, from 1 in catalog order: also its item id in the Market. */
export function wearableItem(id: string): number {
  return WEARABLES.findIndex((item) => item.id === id) + 1;
}
