import { nextRandom } from "./random";

/**
 * Pairs: twelve cards face down, six pairs. Turn two over; a pair stays
 * face up, anything else turns back. The round ends when every pair is
 * found, and the score is sixty less two for every miss — never below six,
 * because finding them all is still finding them all.
 *
 * The deal comes from the round's seed, so the same seed is the same round.
 * Nothing here reads a vital, a level or a wearable: the faces are picked by
 * the screen, by number.
 */
export const PAIRS = 6;
const MISS_COST = 2;

export interface PairsState {
  /** The face on each card, 0 to PAIRS − 1, each twice. */
  cards: number[];
  found: boolean[];
  /** Cards turned up and not yet matched: none, one, or a pair to look at. */
  open: number[];
  moves: number;
  misses: number;
  over: boolean;
}

export function dealPairs(seed: number): PairsState {
  const cards = Array.from({ length: PAIRS * 2 }, (_, i) => Math.floor(i / 2));
  let state = seed;
  for (let i = cards.length - 1; i > 0; i--) {
    let r: number;
    [r, state] = nextRandom(state);
    const j = Math.floor(r * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, found: cards.map(() => false), open: [], moves: 0, misses: 0, over: false };
}

/** Turn a card over. A second card is a move: a pair stays found, a miss waits for `settle`. */
export function flipCard(state: PairsState, index: number): PairsState {
  if (state.over || state.found[index] || state.open.includes(index) || state.open.length >= 2) return state;
  const open = [...state.open, index];
  if (open.length < 2) return { ...state, open };
  const [a, b] = open;
  const moves = state.moves + 1;
  if (state.cards[a] === state.cards[b]) {
    const found = state.found.map((f, i) => f || i === a || i === b);
    return { ...state, found, open: [], moves, over: found.every(Boolean) };
  }
  return { ...state, open, moves, misses: state.misses + 1 };
}

/** Turn a missed pair back over. */
export function settle(state: PairsState): PairsState {
  return state.open.length === 2 ? { ...state, open: [] } : state;
}

export function pairsScore(state: Pick<PairsState, "misses">): number {
  return Math.max(PAIRS, PAIRS * 10 - state.misses * MISS_COST);
}
