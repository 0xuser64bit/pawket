/**
 * A small seeded generator (mulberry32), carried as a number so a game step
 * stays a pure function of its state: the same seed and the same inputs
 * always play the same round.
 */
export function nextRandom(state: number): [value: number, state: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** A seed from any string, so a round can be named and replayed. */
export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}
