import { HAIR_COLOURS, type ClothColour, type HairColour } from "@/lib/player/look";

/**
 * The room's materials are things, lit by the room: a pool-blue shirt is
 * the same shirt after dark, so materials take the Daylight token values
 * whatever the theme, and the light is what changes. These mirror `:root`
 * in `app/globals.css` — `palette.test.ts` fails if they drift. The pets'
 * coats are the same values, baked into their GLBs by the asset pipeline.
 *
 * What follows the theme is read from the page instead (`readThemeInk`):
 * the outline is the theme's `edge`, and the backdrop is the theme's sky.
 */
export const DAYLIGHT = {
  ground: "#f6efe2",
  surface: "#fffbf3",
  "surface-sunk": "#ece2d1",
  edge: "#2a1e14",
  "edge-soft": "#ded1bb",
  "ink-inverse": "#fff8ec",
  sun: "#ff8a3d",
  "sun-edge": "#b8500f",
  "sun-soft": "#ffe4cd",
  sprout: "#63b655",
  "sprout-edge": "#3a7a31",
  "sprout-soft": "#dcefd3",
  pool: "#7ba4ec",
  "pool-edge": "#3a63ad",
  "pool-soft": "#dfe8fb",
  "trim-cloth": "#8c7a60",
  "trim-copper": "#a45f2a",
  "trim-glass": "#2d8296",
  "trim-foil": "#95761a",
} as const;

export type Tone = keyof typeof DAYLIGHT;

/** A cloth colour's token. Ink and cream are the two neutrals. */
export const CLOTH_TONE: Record<ClothColour, Tone> = {
  pool: "pool",
  sun: "sun",
  sprout: "sprout",
  copper: "trim-copper",
  cloth: "trim-cloth",
  glass: "trim-glass",
  foil: "trim-foil",
  ink: "edge",
  cream: "ink-inverse",
};

export function clothHex(colour: ClothColour): string {
  return DAYLIGHT[CLOTH_TONE[colour]];
}

export function hairHex(colour: HairColour): string {
  return HAIR_COLOURS[colour];
}

/** What the theme decides: the outline ink, and whether it is evening. */
export interface ThemeInk {
  edge: string;
  evening: boolean;
}

export function readThemeInk(): ThemeInk {
  const style = getComputedStyle(document.documentElement);
  const edge = style.getPropertyValue("--edge").trim() || DAYLIGHT.edge;
  return { edge, evening: style.colorScheme === "dark" };
}
