// Every time in the edit, in seconds from the start. Narration is placed here; the scenes cut on its
// words (cue), and the captions are built from the same ElevenLabs character timings.
import s1 from "../public/audio/narration/s1-hook.json";
import s2a from "../public/audio/narration/s2a-adopt.json";
import s2b from "../public/audio/narration/s2b-room.json";
import s2c from "../public/audio/narration/s2c-today.json";
import s3a from "../public/audio/narration/s3a-play.json";
import s3b from "../public/audio/narration/s3b-profile.json";
import s3c from "../public/audio/narration/s3c-market.json";
import s3d from "../public/audio/narration/s3d-guilds.json";
import s3e from "../public/audio/narration/s3e-world.json";
import s4a from "../public/audio/narration/s4a-keep.json";
import s4b from "../public/audio/narration/s4b-record.json";
import s4c from "../public/audio/narration/s4c-money.json";
import s5 from "../public/audio/narration/s5-close.json";

export const FPS = 30;
export const LENGTH = 170;
export const DURATION = LENGTH * FPS;
export const f = (seconds: number) => Math.round(seconds * FPS);

/** The story's five parts. */
export const PARTS = {
  hook: [0, 12],
  companion: [12, 55],
  world: [55, 115],
  solana: [115, 155],
  close: [155, 170],
} as const;

import placements from "./placements.json";
import { wordsOf, type Alignment } from "./cues";
export type { Word } from "./cues";

const ALIGN: Record<string, Alignment> = {
  "s1-hook": s1, "s2a-adopt": s2a, "s2b-room": s2b, "s2c-today": s2c, "s3a-play": s3a, "s3b-profile": s3b,
  "s3c-market": s3c, "s3d-guilds": s3d, "s3e-world": s3e, "s4a-keep": s4a, "s4b-record": s4b, "s4c-money": s4c, "s5-close": s5,
};
const LINES = (placements as Array<[string, number]>).map(([id, at]) => [id, at, ALIGN[id]] as const);

export const NARRATION = LINES.map(([id, at, a]) => {
  const words = wordsOf(a, at);
  return { id, at, end: words[words.length - 1].end, words };
});

const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** When a word is spoken: cue("s2b-room", "feed") → seconds. `nth` picks a repeat; `end` its end. */
export function cue(id: string, word: string, nth = 0, end = false): number {
  const line = NARRATION.find((n) => n.id === id);
  if (!line) throw new Error(`no line ${id}`);
  const hits = line.words.filter((w) => bare(w.text) === bare(word));
  const hit = hits[nth];
  if (!hit) throw new Error(`no "${word}" in ${id}`);
  return end ? hit.end : hit.start;
}

export const lineEnd = (id: string) => NARRATION.find((n) => n.id === id)!.end;
export const lineStart = (id: string) => NARRATION.find((n) => n.id === id)!.at;

/** Is anyone speaking at t (seconds)? With a little air either side, for the music's ducking. */
export function speaking(t: number, pad = 0.25): boolean {
  return NARRATION.some((n) => t >= n.words[0].start - pad && t <= n.end + pad);
}
