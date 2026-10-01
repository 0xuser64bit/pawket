import { nextRandom } from "./random";

/**
 * Catch: treats fall, the pet moves along the grass to catch them, and rain
 * clouds are best avoided. Thirty seconds or three clouds, whichever comes
 * first. The field is 1 wide and 1 tall, y downward.
 *
 * Nothing here reads a vital, a level or a wearable: a level-one pet and a
 * level-ninety pet play the same round.
 */
export const CATCH_SECONDS = 30;
export const CATCH_LIVES = 3;

/** Where the pet's mouth meets a falling thing, and how wide it reaches. */
export const CATCH_MOUTH = { top: 0.68, bottom: 0.9, reach: 0.1 };
const PET_SPEED = 1.7;

export type DropKind = "treat" | "star" | "cloud";
export interface Drop {
  id: number;
  kind: DropKind;
  x: number;
  y: number;
  vy: number;
}
export type CatchEvent = { kind: "caught" | "star" | "ouch"; x: number };

export interface CatchState {
  t: number;
  x: number;
  drops: Drop[];
  score: number;
  lives: number;
  nextDrop: number;
  nextId: number;
  seed: number;
  over: boolean;
  /** What happened in the last step, for the sound and the pet's face. */
  events: CatchEvent[];
}

export function startCatch(seed: number): CatchState {
  return { t: 0, x: 0.5, drops: [], score: 0, lives: CATCH_LIVES, nextDrop: 0.4, nextId: 1, seed, over: false, events: [] };
}

/** Advance the round by `dt` seconds, with the pet heading for `target` (0–1). */
export function stepCatch(state: CatchState, dt: number, target: number): CatchState {
  if (state.over) return { ...state, events: [] };
  const t = Math.min(CATCH_SECONDS, state.t + dt);
  const reach = PET_SPEED * dt;
  const goal = Math.max(0.08, Math.min(0.92, target));
  const x = state.x + Math.max(-reach, Math.min(reach, goal - state.x));
  let { seed, nextDrop, nextId, score, lives } = state;
  const events: CatchEvent[] = [];
  const drops: Drop[] = [];

  for (const drop of state.drops) {
    const moved = { ...drop, y: drop.y + drop.vy * dt };
    const inMouth = moved.y >= CATCH_MOUTH.top && moved.y <= CATCH_MOUTH.bottom && Math.abs(moved.x - x) <= CATCH_MOUTH.reach;
    if (inMouth) {
      if (moved.kind === "cloud") {
        lives -= 1;
        events.push({ kind: "ouch", x: moved.x });
      } else {
        score += moved.kind === "star" ? 3 : 1;
        events.push({ kind: moved.kind === "star" ? "star" : "caught", x: moved.x });
      }
      continue;
    }
    if (moved.y < 1.08) drops.push(moved);
  }

  // Drops come faster as the round goes on: every 0.8s at the start, 0.34s at the end.
  nextDrop -= dt;
  while (nextDrop <= 0) {
    let r: number;
    [r, seed] = nextRandom(seed);
    const kind: DropKind = r < 0.1 ? "star" : r < 0.32 ? "cloud" : "treat";
    let rx: number;
    [rx, seed] = nextRandom(seed);
    let rv: number;
    [rv, seed] = nextRandom(seed);
    const pace = t / CATCH_SECONDS;
    drops.push({ id: nextId++, kind, x: 0.08 + rx * 0.84, y: -0.08, vy: 0.36 + pace * 0.34 + rv * 0.14 });
    nextDrop += 0.8 - pace * 0.46;
  }

  const over = t >= CATCH_SECONDS || lives <= 0;
  return { t, x, drops, score, lives, nextDrop, nextId, seed, over, events };
}
