import { beforeEach, describe, expect, it } from "vitest";
import { dailySeed, keepBest, keepDaily, readBest, readDaily } from "./best";

describe("bests on this device", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the best of each game, including Pairs", () => {
    expect(keepBest("pairs", 40)).toBe(true);
    expect(keepBest("pairs", 30)).toBe(false);
    expect(readBest()).toEqual({ pairs: 40 });
  });

  it("gives everyone the same daily round, and a new one each day", () => {
    expect(dailySeed("catch", "2026-10-03")).toBe(dailySeed("catch", "2026-10-03"));
    expect(dailySeed("catch", "2026-10-03")).not.toBe(dailySeed("catch", "2026-10-04"));
    expect(dailySeed("catch", "2026-10-03")).not.toBe(dailySeed("hop", "2026-10-03"));
  });

  it("keeps today's daily best and forgets it tomorrow", () => {
    expect(keepDaily("hop", "2026-10-03", 12)).toBe(true);
    expect(keepDaily("hop", "2026-10-03", 9)).toBe(false);
    expect(keepDaily("catch", "2026-10-03", 0)).toBe(true);
    expect(readDaily("2026-10-03")).toEqual({ hop: 12, catch: 0 });
    expect(readDaily("2026-10-04")).toEqual({});
  });
});
