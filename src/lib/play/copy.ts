import { nextRandom } from "./random";

export const BEANS = 4;

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

export function showMs(length: number): number {
  return Math.max(260, 560 - length * 28);
}

export type CopyAnswer = "next" | "done" | "wrong";

export function checkCopy(pattern: readonly number[], taps: readonly number[]): CopyAnswer {
  const i = taps.length - 1;
  if (i < 0) return "next";
  if (taps[i] !== pattern[i]) return "wrong";
  return taps.length === pattern.length ? "done" : "next";
}
