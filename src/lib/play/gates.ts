/** How many gates a round asks a player to remember. Short enough to count. */
export const GATE_COUNT = 5;

export type Gate = "left" | "right";

/**
 * A deterministic porch pattern. The score is for the player; finishing the
 * round is what the companion record rewards, and this function never reads
 * a stat, a wearable, or a balance.
 */
export function gatePattern(seed: string, count = GATE_COUNT): Gate[] {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  const gates: Gate[] = [];
  for (let i = 0; i < count; i++) {
    state = Math.imul(state, 1664525) + 1013904223;
    gates.push(((state >>> 0) & 1) === 0 ? "left" : "right");
  }
  return gates;
}

/** How many answers landed on the matching gate, in order. */
export function scoreGates(pattern: readonly Gate[], answers: readonly Gate[]): number {
  const length = Math.min(pattern.length, answers.length);
  let score = 0;
  for (let i = 0; i < length; i++) {
    if (pattern[i] === answers[i]) score += 1;
  }
  return score;
}
