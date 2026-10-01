import { nextRandom } from "./random";

/**
 * Copy: a giant paw. The pet taps its four toe beans in a pattern; the
 * player taps it back. Each pattern the player gets right grows by one; one
 * wrong bean ends the round. The score is the longest pattern copied.
 *
 * The pattern comes from the round's seed, so the same seed is the same
 * round. Nothing here reads a vital, a level or a wearable.
 */
export const BEANS = 4;

/** The first `length` beans of the round seeded by `seed`. Each pattern extends the last. */
export function copyPattern(seed: number, length: number): number[] {
  const pattern: number[] = [];
  let state = seed;
  for (let i = 0; i < length; i++) {
    let r: number;
    [r, state] = nextRandom(state);
    pattern.push(Math.floor(r * BEANS));
  }
  return pattern;
}

/** How long each bean stays lit while the pet shows the pattern: quicker as it grows. */
export function showMs(length: number): number {
  return Math.max(260, 560 - length * 28);
}

export type CopyAnswer = "next" | "done" | "wrong";

/** What the player's latest tap means, given the taps so far in this pattern. */
export function checkCopy(pattern: readonly number[], taps: readonly number[]): CopyAnswer {
  const i = taps.length - 1;
  if (i < 0) return "next";
  if (taps[i] !== pattern[i]) return "wrong";
  return taps.length === pattern.length ? "done" : "next";
}
