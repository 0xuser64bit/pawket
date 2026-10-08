// Pawket's Daylight palette and families, from the design system (app/globals.css, docs/DESIGN.md).
// Hues keep their jobs: sun acts, sprout grows, pool is people and settled things, bloom is guilds.
export const C = {
  ground: "#f6efe2",
  surface: "#fffbf3",
  surfaceSunk: "#ece2d1",
  paper: "#f7f7f4",
  paperSunk: "#ecece7",
  rule: "#85816f",
  ink: "#2a1e14",
  inkSoft: "#61513f",
  inkFaint: "#6f5f4a",
  sun: "#ff8a3d",
  sunEdge: "#b8500f",
  sunSoft: "#ffe4cd",
  sprout: "#63b655",
  sproutEdge: "#3a7a31",
  sproutSoft: "#dcefd3",
  pool: "#7ba4ec",
  poolEdge: "#3a63ad",
  poolSoft: "#dfe8fb",
  bloom: "#b8407a",
  bloomEdge: "#7c2650",
  bloomSoft: "#f9dde9",
  onBloom: "#fff8ec",
} as const;

export const F = {
  display: "'Fraunces', Georgia, serif",
  text: "'Hanken Grotesk', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
} as const;

/** The wordmark's axes: Fraunces at 600 with SOFT 64 and WONK 1. */
export const WORDMARK = { fontFamily: F.display, fontWeight: 600, fontVariationSettings: "'SOFT' 64, 'WONK' 1" } as const;
export const DISPLAY = { fontFamily: F.display, fontWeight: 600, fontVariationSettings: "'SOFT' 50, 'WONK' 0" } as const;

/** Playroom depth: a 2px edge and a hard sticker shadow, scaled for a 1080p frame. */
export const sticker = (offset = 6) => ({ border: `3px solid ${C.ink}`, boxShadow: `${offset}px ${offset}px 0 ${C.ink}` });
