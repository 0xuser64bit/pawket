// App elements the edit lifts out of the phone recordings, measured with tools/measure.py (device px).
// `content` is the box just inside the element's own border; the edit redraws that border at the same
// weight, radius and shadow, so the element appears as itself and nothing around it comes along.
import { C } from "./brand";

export type Box = [x: number, y: number, w: number, h: number];

export interface Element {
  content: Box;
  border: number;
  radius: number;
  shadow?: [dx: number, dy: number, color: string];
  color?: string;
}

export const EL = {
  /** "Keep Mango on Solana — Recorded on Solana, no pop-up" (k2-keep @ 16.2). */
  toast: { content: [58, 139, 964, 220], border: 6, radius: 42, shadow: [8, 8, C.ink] },
  /** "Their first page", the adoption's Paper card (a-adopt @ 20). Its foot sits under the pinned button. */
  firstPage: { content: [55, 1654, 970, 468], border: 2, radius: 10, color: C.rule },
  /** The finished round: 74 points, +25 XP for playing today (g3-hop @ 21.6). */
  hopResult: { content: [57, 1218, 965, 851], border: 5, radius: 43, shadow: [9, 9, C.ink] },
  /** Sunset nap, on now, Mango came (q3-poll @ 3.6): the pool edge of an event that is on. */
  event: { content: [57, 360, 965, 436], border: 5, radius: 43, shadow: [9, 8, "#3761a9"], color: "#3a60a9" },
  /** "Snack after the nap?", Fish · your vote (q3-poll @ 43). */
  poll: { content: [57, 839, 965, 638], border: 5, radius: 43, shadow: [9, 8, C.ink] },
  /** The Park's counts (p1-world @ 2.4). */
  parkCount: { content: [58, 1658, 964, 446], border: 6, radius: 41, shadow: [8, 8, C.ink] },
  /** Pulse's first card (p1-world @ 19). */
  pulse: { content: [58, 724, 964, 555], border: 6, radius: 42, shadow: [8, 8, C.ink] },
  /** The Pawket Wallet's history, read from Solana: its head and four rows (w3-history @ 13). */
  history: { content: [58, 429, 964, 818], border: 2, radius: 10, color: C.rule },
} satisfies Record<string, Element>;

/** Borderless content shown floating on the ground: crops whose edges pass only through the page. */
export const FLOAT = {
  /** Today's round: four cares done, the round to go (b-care @ 34.5). */
  today: [30, 1445, 1020, 395] as Box,
  /** The sticker book's first row: First meal, Playmate (h-profile @ 41.6). */
  stickers: [30, 735, 1020, 492] as Box,
};

/** Regions inside a sheet, shown in a frame of the sheet's register. */
export const SHEET = {
  /** Keep Mango on Solana: level 1 → level 1, a record nobody can edit (k1-setup @ 3.5). */
  keep: [40, 1100, 1000, 865] as Box,
  /** The Halo's Paper sheet: price, paid from, goes to, fees, looks only (m3-buy @ 3.2). */
  halo: [40, 1250, 1000, 740] as Box,
};

/** Inside each game's own field, clear of its border and rounded corners. */
export const GAME = {
  catch: [90, 790, 900, 900] as Box,
  hop: [120, 1150, 560, 560] as Box,
  copy: [110, 640, 860, 860] as Box,
  pairs: [90, 345, 905, 905] as Box,
};
