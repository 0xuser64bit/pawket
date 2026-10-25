import { HAIR_COLOURS, type ClothColour, type HairColour } from "@/lib/player/look";

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
  "on-sun": "#2a1e14",
  sprout: "#63b655",
  "sprout-edge": "#3a7a31",
  "sprout-soft": "#dcefd3",
  pool: "#7ba4ec",
  "pool-edge": "#3a63ad",
  "pool-soft": "#dfe8fb",
  bloom: "#b8407a",
  "bloom-edge": "#7c2650",
  "trim-cloth": "#8c7a60",
  "trim-copper": "#a45f2a",
  "trim-glass": "#2d8296",
  "trim-foil": "#95761a",
  "pet-eye": "#2a1e14",
  "pet-shine": "#ffffff",
  "pet-blush": "#ff9f8f",
  "pet-cream": "#fff3e2",
  "pet-cocoa": "#6b3d1f",
  "pet-cloud": "#fbf8f4",
  "pet-cloud-shade": "#c7d3f2",
} as const;

export type Tone = keyof typeof DAYLIGHT;

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
  peach: "sun-soft",
  sky: "pool-soft",
  mint: "sprout-soft",
  blush: "pet-blush",
};

export function clothHex(colour: ClothColour): string {
  return DAYLIGHT[CLOTH_TONE[colour]];
}

export function hairHex(colour: HairColour): string {
  return HAIR_COLOURS[colour];
}
