export type WearablePlace = "head" | "eyes" | "neck" | "back";

export interface Wearable {
  id: string;
  name: string;
  kind: string;
  place: WearablePlace;
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
  price?: bigint;
}

export const WEARABLES: readonly Wearable[] = [
  { id: "wool-scarf", name: "Wool scarf", place: "neck", kind: "Scarf", icon: "scarf" },
  { id: "paper-crown", name: "Paper crown", place: "head", kind: "Crown", icon: "crown" },
  { id: "red-collar", name: "Red collar", place: "neck", kind: "Collar", icon: "collar" },
  { id: "star-pin", name: "Star pin", place: "neck", kind: "Pin", icon: "star", price: 20_000_000n },
  { id: "rain-cape", name: "Rain cape", place: "back", kind: "Cape", icon: "cape", price: 20_000_000n },
  { id: "nap-ribbon", name: "Nap ribbon", place: "head", kind: "Ribbon", icon: "ribbon", price: 20_000_000n },
  { id: "bow-tie", name: "Bow tie", place: "neck", kind: "Bow tie", icon: "bowtie", price: 20_000_000n },
  { id: "round-glasses", name: "Round glasses", place: "eyes", kind: "Glasses", icon: "glasses", price: 20_000_000n },
  { id: "party-hat", name: "Party hat", place: "head", kind: "Hat", icon: "partyhat", price: 20_000_000n },
  { id: "bandana", name: "Bandana", place: "neck", kind: "Kerchief", icon: "bandana", price: 20_000_000n },
  { id: "knit-beanie", name: "Knit beanie", place: "head", kind: "Hat", icon: "beanie", price: 20_000_000n },
  { id: "heart-glasses", name: "Heart glasses", place: "eyes", kind: "Glasses", icon: "hearts", price: 20_000_000n },
  { id: "bee-wings", name: "Bee wings", place: "back", kind: "Wings", icon: "wings", price: 20_000_000n },
  { id: "little-backpack", name: "Little backpack", place: "back", kind: "Pack", icon: "backpack", price: 20_000_000n },
  { id: "strawberry-hat", name: "Strawberry hat", place: "head", kind: "Hat", icon: "strawberry", price: 20_000_000n },
  { id: "bell-collar", name: "Bell collar", place: "neck", kind: "Collar", icon: "bell", price: 20_000_000n },
  { id: "flower-crown", name: "Flower crown", place: "head", kind: "Crown", icon: "flower", price: 20_000_000n },
  { id: "leaf-sprout", name: "Leaf sprout", place: "head", kind: "Sprout", icon: "sprout", price: 20_000_000n },
  { id: "halo", name: "Halo", place: "head", kind: "Halo", icon: "halo", price: 50_000_000n },
  { id: "wizard-hat", name: "Wizard hat", place: "head", kind: "Hat", icon: "wizard", price: 50_000_000n },
  { id: "sun-hat", name: "Sun hat", place: "head", kind: "Hat", icon: "sunhat", price: 50_000_000n },
  { id: "gold-crown", name: "Gold crown", place: "head", kind: "Crown", icon: "goldcrown", price: 50_000_000n },
  { id: "cowboy-hat", name: "Cowboy hat", place: "head", kind: "Hat", icon: "cowboy", price: 50_000_000n },
  { id: "chef-hat", name: "Chef hat", place: "head", kind: "Hat", icon: "chef", price: 50_000_000n },
  { id: "sunglasses", name: "Sunglasses", place: "eyes", kind: "Glasses", icon: "shades", price: 50_000_000n },
  { id: "headphones", name: "Headphones", place: "head", kind: "Headphones", icon: "headphones", price: 50_000_000n },
  { id: "beret", name: "Beret", place: "head", kind: "Hat", icon: "beret", price: 50_000_000n },
  { id: "necktie", name: "Necktie", place: "neck", kind: "Tie", icon: "tie", price: 50_000_000n },
];

const WEARABLE_IDS = new Set(WEARABLES.map((item) => item.id));

export function isWearableId(value: string): boolean {
  return WEARABLE_IDS.has(value);
}

export function findWearable(id: string | null | undefined): Wearable | undefined {
  if (!id) return undefined;
  return WEARABLES.find((item) => item.id === id);
}

export const MARKET_WEARABLES = WEARABLES.filter((item) => item.price !== undefined);

export function wearableItem(id: string): number {
  return WEARABLES.findIndex((item) => item.id === id) + 1;
}
