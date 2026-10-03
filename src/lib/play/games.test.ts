import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATCH_LIVES, CATCH_MOUTH, CATCH_SECONDS, startCatch, stepCatch, type CatchState } from "./catch";
import { BEANS, checkCopy, copyPattern, showMs } from "./copy";
import { AIRTIME, HOP, hopScore, startHop, stepHop, type HopState } from "./hop";
import { PAIRS, dealPairs, flipCard, pairsScore, settle } from "./pairs";

const DT = 1 / 60;

function playCatch(seed: number, steer: (s: CatchState) => number): CatchState {
  let state = startCatch(seed);
  for (let i = 0; i < 60 * 40 && !state.over; i++) state = stepCatch(state, DT, steer(state));
  return state;
}

describe("Catch", () => {
  it("is the same round for the same seed and the same hands", () => {
    const a = playCatch(7, () => 0.5);
    const b = playCatch(7, () => 0.5);
    expect(a.score).toBe(b.score);
    expect(a.lives).toBe(b.lives);
  });

  it("ends after thirty seconds, or after the third cloud", () => {
    const state = playCatch(11, () => 0.5);
    expect(state.over).toBe(true);
    expect(state.t === CATCH_SECONDS || state.lives === 0).toBe(true);
    expect(state.lives).toBeGreaterThanOrEqual(0);
    expect(state.lives).toBeLessThanOrEqual(CATCH_LIVES);
  });

  it("rewards chasing treats and dodging clouds over standing still", () => {
    const chase = (s: CatchState) => {
      const treat = s.drops.filter((d) => d.kind !== "cloud" && d.y < CATCH_MOUTH.bottom).sort((a, b) => b.y - a.y)[0];
      return treat ? treat.x : s.x;
    };
    let chased = 0;
    let idle = 0;
    for (let seed = 1; seed <= 8; seed++) {
      chased += playCatch(seed, chase).score;
      idle += playCatch(seed, () => 0.02).score;
    }
    expect(chased).toBeGreaterThan(idle * 2);
  });

  it("counts a star as three treats", () => {
    const state: CatchState = { ...startCatch(1), x: 0.5, nextDrop: 99, drops: [{ id: 1, kind: "star", x: 0.5, y: CATCH_MOUTH.top, vy: 0 }] };
    expect(stepCatch(state, DT, 0.5).score).toBe(3);
  });

  it("takes a life for a cloud caught", () => {
    const state: CatchState = { ...startCatch(1), x: 0.5, nextDrop: 99, drops: [{ id: 1, kind: "cloud", x: 0.5, y: CATCH_MOUTH.top, vy: 0 }] };
    const next = stepCatch(state, DT, 0.5);
    expect(next.lives).toBe(CATCH_LIVES - 1);
    expect(next.events).toEqual([{ kind: "ouch", x: 0.5 }]);
  });
});

/** A player who jumps when the next thing is a jump's reach away. */
function autoJump(state: HopState): boolean {
  const next = state.obstacles.find((o) => o.x + o.w > HOP.petX - HOP.petHalf);
  return !!next && next.x - (HOP.petX + HOP.petHalf) < state.speed * AIRTIME * 0.25;
}

describe("Hop", () => {
  it("can always be cleared by good timing, even at top speed", () => {
    for (let seed = 1; seed <= 12; seed++) {
      let state = startHop(seed);
      for (let i = 0; i < 60 * 150 && !state.over; i++) state = stepHop(state, DT, autoJump(state));
      expect(state.over, `seed ${seed} at ${state.speed.toFixed(2)}`).toBe(false);
      expect(state.speed).toBe(HOP.topSpeed);
    }
  });

  it("ends at the first bump for a pet that never jumps", () => {
    let state = startHop(3);
    for (let i = 0; i < 60 * 60 && !state.over; i++) state = stepHop(state, DT, false);
    expect(state.over).toBe(true);
    expect(state.events).toContain("bump");
  });

  it("cannot jump again in the air", () => {
    let state = stepHop(startHop(1), DT, true);
    const vy = state.vy;
    state = stepHop(state, DT, true);
    expect(state.vy).toBeLessThan(vy);
    expect(state.events).not.toContain("jump");
  });

  it("scores ten a field and five a heart", () => {
    expect(hopScore({ run: 3.27, collected: 2 })).toBe(42);
  });
});

describe("Copy", () => {
  it("grows one bean at a time, keeping the pattern so far", () => {
    const five = copyPattern(42, 5);
    expect(copyPattern(42, 6).slice(0, 5)).toEqual(five);
    for (const bean of copyPattern(42, 50)) expect(bean).toBeGreaterThanOrEqual(0);
    expect(Math.max(...copyPattern(42, 50))).toBeLessThan(BEANS);
  });

  it("uses every bean", () => {
    expect(new Set(copyPattern(9, 40)).size).toBe(BEANS);
  });

  it("says next, done or wrong", () => {
    expect(checkCopy([1, 2, 3], [1])).toBe("next");
    expect(checkCopy([1, 2, 3], [1, 2, 3])).toBe("done");
    expect(checkCopy([1, 2, 3], [1, 3])).toBe("wrong");
  });

  it("shows a longer pattern faster, never too fast to see", () => {
    expect(showMs(10)).toBeLessThan(showMs(2));
    expect(showMs(100)).toBe(260);
  });
});

describe("Pairs", () => {
  it("deals six pairs, the same way for the same seed", () => {
    const deal = dealPairs(5);
    expect(deal.cards).toEqual(dealPairs(5).cards);
    expect(deal.cards).not.toEqual(dealPairs(6).cards);
    for (let face = 0; face < PAIRS; face++) expect(deal.cards.filter((c) => c === face)).toHaveLength(2);
  });

  it("keeps a pair, turns back a miss, and ends when every pair is found", () => {
    let state = dealPairs(9);
    const first = state.cards.indexOf(0);
    const mate = state.cards.lastIndexOf(0);
    const other = state.cards.indexOf(1);
    state = flipCard(flipCard(state, first), other);
    expect(state.misses).toBe(1);
    expect(flipCard(state, mate)).toBe(state); // two are up: look first
    state = settle(state);
    state = flipCard(flipCard(state, first), mate);
    expect(state.found[first] && state.found[mate]).toBe(true);
    expect(state.open).toEqual([]);
    for (let face = 1; face < PAIRS; face++) {
      state = flipCard(flipCard(state, state.cards.indexOf(face)), state.cards.lastIndexOf(face));
    }
    expect(state.over).toBe(true);
    expect(state.moves).toBe(PAIRS + 1);
    expect(pairsScore(state)).toBe(58);
  });

  it("scores a perfect round sixty and never less than six", () => {
    expect(pairsScore({ misses: 0 })).toBe(60);
    expect(pairsScore({ misses: 100 })).toBe(PAIRS);
  });
});

describe("the playground", () => {
  it("never reads a vital, a level, a wearable or a balance", () => {
    for (const file of ["catch.ts", "hop.ts", "copy.ts", "pairs.ts", "random.ts"]) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf8");
      expect(source, file).not.toMatch(/from "@\/lib\/(game|guest|closet|solana)/);
    }
  });
});
