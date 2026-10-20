import * as z from "@/lib/zod";

/**
 * How the player looks in the 3D room. Expression only: nothing here is
 * read by care, the playground or the record, and it is saved on this
 * device the same way the pet is.
 *
 * Every option maps to something the supplied assets actually contain —
 * two base bodies, their painted skin (recoloured to each tone), four
 * hairstyles and a beard fitted to both heads — or to the clothes the asset
 * pipeline cuts from the body, because the pack has none.
 * Colours for clothes are design-system hue names, so they follow a token;
 * hair colours are natural shades, kept here as data.
 */

export const BODIES = ["a", "b"] as const;
export const HAIRSTYLES = ["none", "buzzed", "parted", "long", "buns"] as const;
export const TOPS = ["tee", "long", "tank"] as const;
export const BOTTOMS = ["trousers", "shorts"] as const;
export const SHOES = ["sneakers", "boots", "none"] as const;
/** What sits on the head, and on the nose: built in the room (`room3d/accessories.ts`), drawn on the peg doll too. */
export const HEADWEAR = ["none", "beanie", "cap", "party", "flower", "bunny", "bow", "cat", "headphones", "witch"] as const;
export const EYEWEAR = ["none", "round", "hearts", "shades", "stars"] as const;

/**
 * Skin tones, as the average colour the skin should land on. The pack
 * paints one skin per body (its "light" and "dark" textures differ only in
 * the underwear), so the room recolours that painting to each tone and
 * keeps its detail.
 */
export const SKIN_TONES = ["#f3d2b8", "#e3b48e", "#c8926d", "#a06a48", "#744630", "#4b2c1e"] as const;

/**
 * Clothes wear a design-system hue — the fills, and their soft tints for the
 * pastels. Bloom is the guild layer and alarm is risk, so neither is here.
 */
export const CLOTH_COLOURS = [
  "pool",
  "sun",
  "sprout",
  "copper",
  "cloth",
  "glass",
  "foil",
  "ink",
  "cream",
  "peach",
  "sky",
  "mint",
  "blush",
] as const;

/** Natural hair shades, plus two from the palette. */
export const HAIR_COLOURS = {
  black: "#2b2320",
  espresso: "#4a3122",
  chestnut: "#7a4a2a",
  auburn: "#a4502a",
  honey: "#c89a4e",
  platinum: "#e6dccb",
  silver: "#a7a39c",
  pool: "#5f86cf",
  sprout: "#4f9a44",
} as const;

export type ClothColour = (typeof CLOTH_COLOURS)[number];
export type HairColour = keyof typeof HAIR_COLOURS;

export const lookSchema = z.object({
  version: z.literal(1),
  body: z.enum(BODIES),
  skin: z.number().int().min(0).max(SKIN_TONES.length - 1),
  hair: z.enum(HAIRSTYLES),
  hairColour: z.enum(Object.keys(HAIR_COLOURS) as [HairColour, ...HairColour[]]),
  beard: z.boolean(),
  top: z.enum(TOPS),
  topColour: z.enum(CLOTH_COLOURS),
  bottom: z.enum(BOTTOMS),
  bottomColour: z.enum(CLOTH_COLOURS),
  shoes: z.enum(SHOES),
  shoeColour: z.enum(CLOTH_COLOURS),
  headwear: z.enum(HEADWEAR),
  headwearColour: z.enum(CLOTH_COLOURS),
  eyewear: z.enum(EYEWEAR),
});

export type PlayerLook = z.infer<typeof lookSchema>;

/** The first look: the peg doll's pool colour, carried into the room. */
export const DEFAULT_LOOK: PlayerLook = {
  version: 1,
  body: "b",
  skin: 2,
  hair: "buns",
  hairColour: "espresso",
  beard: false,
  top: "tee",
  topColour: "pool",
  bottom: "trousers",
  bottomColour: "ink",
  shoes: "sneakers",
  shoeColour: "sun",
  headwear: "none",
  headwearColour: "sun",
  eyewear: "none",
};

/**
 * Read a stored blob as a look. A field that is missing or no longer
 * offered falls back to the default on its own, so one retired option
 * never costs the player the rest of their look. Garbage is the default.
 */
export function parseLook(raw: unknown): PlayerLook {
  const whole = lookSchema.safeParse(raw);
  if (whole.success) return whole.data;
  if (!raw || typeof raw !== "object") return DEFAULT_LOOK;
  const out: Record<string, unknown> = { ...DEFAULT_LOOK };
  const shape = lookSchema.shape;
  for (const key of Object.keys(shape) as Array<keyof typeof shape>) {
    const value = (raw as Record<string, unknown>)[key];
    if (key !== "version" && shape[key].safeParse(value).success) out[key] = value;
  }
  return lookSchema.parse(out);
}

/** Change one part of the look. Unknown values leave the look as it was. */
export function withLook<K extends Exclude<keyof PlayerLook, "version">>(
  look: PlayerLook,
  key: K,
  value: PlayerLook[K],
): PlayerLook {
  const next = { ...look, [key]: value };
  return lookSchema.safeParse(next).success ? next : look;
}

/** Words for each option, for labels and the room's description. */
export const LOOK_LABEL = {
  body: { a: "Build one", b: "Build two" },
  hair: { none: "Shaved", buzzed: "Buzzed", parted: "Parted", long: "Long", buns: "Buns" },
  top: { tee: "Tee", long: "Long sleeve", tank: "Tank" },
  bottom: { trousers: "Trousers", shorts: "Shorts" },
  shoes: { sneakers: "Sneakers", boots: "Boots", none: "Barefoot" },
  headwear: { none: "Nothing", beanie: "Beanie", cap: "Cap", party: "Party hat", flower: "Flower clip", bunny: "Bunny ears", bow: "Hair bow", cat: "Cat ears", headphones: "Headphones", witch: "Witch's hat" },
  eyewear: { none: "Nothing", round: "Round glasses", hearts: "Heart glasses", shades: "Shades", stars: "Star glasses" },
  skin: ["Tone one", "Tone two", "Tone three", "Tone four", "Tone five", "Tone six"],
  cloth: {
    pool: "Pool",
    sun: "Sun",
    sprout: "Sprout",
    copper: "Copper",
    cloth: "Cloth",
    glass: "Glass",
    foil: "Foil",
    ink: "Ink",
    cream: "Cream",
    peach: "Peach",
    sky: "Sky",
    mint: "Mint",
    blush: "Blush",
  },
  hairColour: {
    black: "Black",
    espresso: "Espresso",
    chestnut: "Chestnut",
    auburn: "Auburn",
    honey: "Honey",
    platinum: "Platinum",
    silver: "Silver",
    pool: "Pool",
    sprout: "Sprout",
  },
} as const;

/** One sentence a screen reader can hear in place of the picture. */
export function describeLook(look: PlayerLook): string {
  const hair =
    look.hair === "none"
      ? "a shaved head"
      : `${LOOK_LABEL.hairColour[look.hairColour].toLowerCase()} ${LOOK_LABEL.hair[look.hair].toLowerCase()} hair`;
  const beard = look.beard ? " and a beard" : "";
  const feet =
    look.shoes === "none"
      ? "bare feet"
      : `${LOOK_LABEL.cloth[look.shoeColour].toLowerCase()} ${LOOK_LABEL.shoes[look.shoes].toLowerCase()}`;
  const head = look.headwear === "none" ? "" : `, a ${LOOK_LABEL.cloth[look.headwearColour].toLowerCase()} ${LOOK_LABEL.headwear[look.headwear].toLowerCase()}`;
  const eyes = look.eyewear === "none" ? "" : `, ${LOOK_LABEL.eyewear[look.eyewear].toLowerCase()}`;
  return `You, with ${hair}${beard}${head}${eyes}, a ${LOOK_LABEL.cloth[look.topColour].toLowerCase()} ${LOOK_LABEL.top[look.top].toLowerCase()}, ${LOOK_LABEL.cloth[look.bottomColour].toLowerCase()} ${LOOK_LABEL.bottom[look.bottom].toLowerCase()} and ${feet}`;
}

/**
 * What the player can wear to match the pet: a hat or glasses the pet has
 * on, in the closest the player's own wardrobe has. Null when the pet's
 * piece has no match.
 */
export function twinWith(wearing: string | null): Partial<Pick<PlayerLook, "headwear" | "headwearColour" | "eyewear">> | null {
  switch (wearing) {
    case "knit-beanie":
      return { headwear: "beanie", headwearColour: "pool" };
    case "party-hat":
      return { headwear: "party", headwearColour: "sun" };
    case "flower-crown":
      return { headwear: "flower", headwearColour: "blush" };
    case "strawberry-hat":
      return { headwear: "beanie", headwearColour: "blush" };
    case "nap-ribbon":
      return { headwear: "bow", headwearColour: "sprout" };
    case "headphones":
      return { headwear: "headphones", headwearColour: "pool" };
    case "round-glasses":
      return { eyewear: "round" };
    case "sunglasses":
      return { eyewear: "shades" };
    case "heart-glasses":
      return { eyewear: "hearts" };
    default:
      return null;
  }
}
