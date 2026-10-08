import type { Sfx } from "./components/Soundtrack";
import { COMPANION_END } from "./scenes/Companion";
import { HISTORY_AT, keepsake, SOLANA, SOLANA_RECORDS } from "./scenes/Solana";
import { TOGETHER } from "./scenes/Together";
import { PURCHASE_RECORDED, WORLD } from "./scenes/World";
import { cue } from "./timeline";

// Sound that means something: the paw drawing itself, a heartbeat, things arriving, a care counted,
// a record confirmed on Solana. Kept quiet; the voice leads. Every time comes from the scenes.
export const SFX: Sfx[] = [
  // the paw draws itself, then the heart beats twice
  ...[0.15, 0.22, 0.29, 0.36].map((at) => ({ file: "pop", at, volume: 0.14 })),
  { file: "pop", at: 0.55, volume: 0.2 },
  { file: "thump", at: 1.66, volume: 0.45 },
  { file: "thump", at: 1.92, volume: 0.3 },
  { file: "whoosh", at: 1.4, volume: 0.25 },
  { file: "whoosh", at: 7.2, volume: 0.18 },
  { file: "sparkle", at: 9.1, volume: 0.28 },
  // your companion
  { file: "whoosh", at: 11.9, volume: 0.18 },
  ...[16.0, 18.5, 22.1].map((at) => ({ file: "pop", at, volume: 0.2 })),
  { file: "sparkle", at: 22.7, volume: 0.22 },
  ...(["feed", "play", "brush", "rest"] as const).map((w) => ({ file: "pop", at: cue("s2b-room", w), volume: 0.18 })),
  { file: "sparkle", at: cue("s2c-today", "xp"), volume: 0.18 },
  { file: "paper", at: cue("s2c-today", "snap") + 0.2, volume: 0.3 },
  // together: four games, the day's round, the household
  { file: "whoosh", at: COMPANION_END - 0.2, volume: 0.18 },
  ...[0, 1, 2, 3].map((i) => ({ file: "pop", at: cue("s3a-play", "four") - 0.6 + i * 0.12, volume: 0.13 })),
  { file: "chime", at: 55.0 + (18.7 - 17.4), volume: 0.18 },
  { file: "whoosh", at: TOGETHER.profile - 0.15, volume: 0.14 },
  { file: "sparkle", at: cue("s3b-profile", "keep"), volume: 0.18 },
  // a story you can keep: the register turns to Paper; a chime on each confirmed record
  { file: "paper", at: SOLANA.start - 0.1, volume: 0.4 },
  ...SOLANA_RECORDS.map((at, i) => ({ file: "chime", at, volume: [0.24, 0.22, 0.2, 0.18, 0.2][i] })),
  { file: "flip", at: keepsake + 0.3, volume: 0.35 },
  { file: "paper", at: HISTORY_AT, volume: 0.25 },
  // the world around you
  { file: "whoosh", at: WORLD.start - 0.1, volume: 0.16 },
  { file: "paper", at: cue("s3c-market", "it's") + 0.2, volume: 0.3 },
  { file: "chime", at: PURCHASE_RECORDED, volume: 0.2 },
  { file: "whoosh", at: WORLD.guilds + 0.05, volume: 0.14 },
  { file: "chime", at: cue("s3d-guilds", "check"), volume: 0.16 },
  { file: "pop", at: cue("s3d-guilds", "vote"), volume: 0.18 },
  { file: "whoosh", at: WORLD.park - 0.05, volume: 0.14 },
  // the close
  { file: "whoosh", at: 154.9, volume: 0.2 },
  ...[163.55, 163.62, 163.69, 163.76].map((at) => ({ file: "pop", at, volume: 0.12 })),
  { file: "sparkle", at: 163.9, volume: 0.26 },
];
