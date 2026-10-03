/**
 * Expression only. A wearable changes how a pet is described. It has no
 * stat, XP, cooldown, or scoring field, and the type is not allowed to grow
 * one — see the catalog test.
 *
 * The order is the program's: a piece is stored on chain as its place here,
 * from 1 (`WEARABLE_COUNT` in `programs/pawket/src/lib.rs`). Append only.
 *
 * Most pieces are free. A few are earned: the wardrobe offers one once the
 * pet's record has the sticker it names. That is the wardrobe's rule, not
 * the program's — a sticker is read from the record, and a piece is still
 * only looks.
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
    | "sprout";
  /** The sticker (`src/lib/game/badges.ts`) that earns it, for a piece that is earned. */
  earnedBy?: string;
}

export const WEARABLES: readonly Wearable[] = [
  { id: "wool-scarf", name: "Wool scarf", kind: "Scarf", icon: "scarf" },
  { id: "paper-crown", name: "Paper crown", kind: "Crown", icon: "crown" },
  { id: "red-collar", name: "Red collar", kind: "Collar", icon: "collar" },
  { id: "star-pin", name: "Star pin", kind: "Pin", icon: "star" },
  { id: "rain-cape", name: "Rain cape", kind: "Cape", icon: "cape" },
  { id: "nap-ribbon", name: "Nap ribbon", kind: "Ribbon", icon: "ribbon" },
  { id: "bow-tie", name: "Bow tie", kind: "Bow tie", icon: "bowtie" },
  { id: "round-glasses", name: "Round glasses", kind: "Glasses", icon: "glasses" },
  { id: "party-hat", name: "Party hat", kind: "Hat", icon: "partyhat", earnedBy: "growing-up" },
  { id: "bandana", name: "Bandana", kind: "Kerchief", icon: "bandana" },
  { id: "knit-beanie", name: "Knit beanie", kind: "Hat", icon: "beanie" },
  { id: "heart-glasses", name: "Heart glasses", kind: "Glasses", icon: "hearts" },
  { id: "bee-wings", name: "Bee wings", kind: "Wings", icon: "wings", earnedBy: "ten-rounds" },
  { id: "little-backpack", name: "Little backpack", kind: "Pack", icon: "backpack" },
  { id: "strawberry-hat", name: "Strawberry hat", kind: "Hat", icon: "strawberry" },
  { id: "bell-collar", name: "Bell collar", kind: "Collar", icon: "bell", earnedBy: "three-days" },
  { id: "flower-crown", name: "Flower crown", kind: "Crown", icon: "flower", earnedBy: "best-friends" },
  { id: "leaf-sprout", name: "Leaf sprout", kind: "Sprout", icon: "sprout", earnedBy: "all-four" },
];

const WEARABLE_IDS = new Set(WEARABLES.map((item) => item.id));

export function isWearableId(value: string): boolean {
  return WEARABLE_IDS.has(value);
}

export function findWearable(id: string | null | undefined): Wearable | undefined {
  if (!id) return undefined;
  return WEARABLES.find((item) => item.id === id);
}

/** Whether a piece is open to a pet whose record has earned `stickers` (ids from `badgesFor`). */
export function isUnlocked(item: Wearable, stickers: readonly string[]): boolean {
  return !item.earnedBy || stickers.includes(item.earnedBy);
}
