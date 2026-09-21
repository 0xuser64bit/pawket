import type { IconName, Rarity, Sky } from "@/components/pk";
import { PetSpecies } from "@/lib/game/enums";

/** Demo fixtures — see the note in `./pets.ts`. */

export interface DemoListing {
  id: string;
  name: string;
  species: PetSpecies;
  rarity: Rarity;
  sky: Sky;
  /** Already formatted in SOL. Adoption is a fixed price, never a curve. */
  price: string;
  networkFee: string;
  total: string;
  traits: string[];
  summary: string;
  mood: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "marmalade",
    name: "Marmalade",
    species: PetSpecies.LunaCat,
    rarity: "cloth",
    sky: "warm",
    price: "0.80",
    networkFee: "~0.00016 SOL",
    total: "0.80016 SOL",
    traits: ["Curious", "Short coat"],
    summary: "Luna cat · Cloth · level 1 · never played",
    mood: "New",
  },
  {
    id: "sesame",
    name: "Sesame",
    species: PetSpecies.CloudBun,
    rarity: "glass",
    sky: "cool",
    price: "2.40",
    networkFee: "~0.00016 SOL",
    total: "2.40016 SOL",
    traits: ["Singer", "Tuft", "Blue coat"],
    summary: "Cloud bun · Glass · level 1 · never played",
    mood: "New",
  },
  {
    id: "biscuit",
    name: "Biscuit",
    species: PetSpecies.MossPup,
    rarity: "cloth",
    sky: "plain",
    price: "0.75",
    networkFee: "~0.00016 SOL",
    total: "0.75016 SOL",
    traits: ["Loyal", "Floppy ears"],
    summary: "Moss pup · Cloth · level 1 · never played",
    mood: "New",
  },
  {
    id: "mochi",
    name: "Mochi",
    species: PetSpecies.CloudBun,
    rarity: "copper",
    sky: "warm",
    price: "1.60",
    networkFee: "~0.00016 SOL",
    total: "1.60016 SOL",
    traits: ["Quiet", "Long ears"],
    summary: "Cloud bun · Copper · level 1 · never played",
    mood: "New",
  },
];

export function findDemoListing(id: string): DemoListing | undefined {
  return DEMO_LISTINGS.find((listing) => listing.id === id);
}

export interface DemoItem {
  id: string;
  name: string;
  /** A slot — "Head", "Neck", "Backdrop" — or the guild an item depends on. */
  kind: string;
  rarity: Rarity;
  icon: IconName;
  price?: string;
  equipped?: boolean;
  /** Set when wearing this depends on staying in a guild. */
  guild?: string;
}

export const OWNED_ITEMS: DemoItem[] = [
  { id: "paper-crown", name: "Paper crown", kind: "Head", rarity: "foil", icon: "spark", equipped: true },
  { id: "wool-scarf", name: "Wool scarf", kind: "Neck", rarity: "cloth", icon: "heart", equipped: true },
  { id: "window-seat", name: "Window seat", kind: "Backdrop", rarity: "glass", icon: "image" },
  { id: "porch-tape", name: "Porch tape", kind: "Sound", rarity: "cloth", icon: "music" },
];

export const GUILD_ITEMS: DemoItem[] = [
  {
    id: "clover-badge",
    name: "Clover badge",
    kind: "Clover Guild",
    rarity: "copper",
    icon: "guild",
    guild: "Clover Guild",
    equipped: true,
  },
  {
    id: "meadow-bunting",
    name: "Meadow bunting",
    kind: "Clover Guild",
    rarity: "cloth",
    icon: "guild",
    guild: "Clover Guild",
  },
];

export const SHOP_ITEMS: DemoItem[] = [
  { id: "straw-hat", name: "Straw hat", kind: "Head", rarity: "cloth", icon: "spark", price: "0.20" },
  { id: "porch-lantern", name: "Porch lantern", kind: "Backdrop", rarity: "copper", icon: "image", price: "0.45" },
  { id: "glass-bell", name: "Glass bell", kind: "Neck", rarity: "glass", icon: "star", price: "0.90" },
  { id: "meadow-mat", name: "Meadow mat", kind: "Backdrop", rarity: "cloth", icon: "image", price: "0.15" },
];

export interface DemoGame {
  key: string;
  name: string;
  blurb: string;
  lobbies: string;
  icon: IconName;
}

export const DEMO_GAMES: DemoGame[] = [
  {
    key: "meadow-dash",
    name: "Meadow Dash",
    blurb: "Run the hedgerow. Four pets, ninety seconds.",
    lobbies: "12 lobbies open",
    icon: "ball",
  },
  {
    key: "fetch-relay",
    name: "Fetch Relay",
    blurb: "Pass the stick. Two pets, one bad throw.",
    lobbies: "5 lobbies open",
    icon: "spark",
  },
  {
    key: "nap-contest",
    name: "Nap Contest",
    blurb: "Stay still. Harder than it sounds.",
    lobbies: "2 lobbies open",
    icon: "heart",
  },
];

export function findDemoGame(key: string): DemoGame | undefined {
  return DEMO_GAMES.find((game) => game.key === key);
}
