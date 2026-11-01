import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dailySeed, keepBest, keepDaily, readBest, readDaily } from "./best";

describe("bests on this device", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

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

  it("does not replace a newer day's scores when yesterday's round finishes late", () => {
    expect(keepDaily("catch", "2026-10-31", 90)).toBe(true);
    const kept = keepDaily("pairs", "2026-10-30", 12);
    expect(readDaily("2026-10-31")).toEqual({ catch: 90 });
    expect(kept).toBe(false);
    expect(readDaily("2026-10-30")).toEqual({});
  });

  it("starts a newer day without carrying yesterday's scores forward", () => {
    keepDaily("pairs", "2026-10-30", 12);
    expect(keepDaily("catch", "2026-10-31", 90)).toBe(true);
    expect(keepDaily("hop", "2026-10-31", 40)).toBe(true);
    expect(readDaily("2026-10-31")).toEqual({ catch: 90, hop: 40 });
    expect(readDaily("2026-10-30")).toEqual({});
  });

  it.each([null, 31, "not-a-day", "9999-99-99"])("recovers from an unreadable stored daily day: %s", (day) => {
    window.localStorage.setItem("pawket.daily.v1", JSON.stringify({ day, pairs: 12 }));
    expect(keepDaily("catch", "2026-10-31", 90)).toBe(true);
    expect(readDaily("2026-10-31")).toEqual({ catch: 90 });
  });

  it("reports an all-time best write failure without changing the saved scores", () => {
    keepBest("pairs", 40);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    expect(keepBest("pairs", 60)).toBeNull();
    expect(readBest()).toEqual({ pairs: 40 });
    expect(keepBest("pairs", 30)).toBe(false);
  });

  it("reports a daily best write failure without changing the saved scores", () => {
    keepDaily("catch", "2026-10-31", 90);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
    expect(keepDaily("pairs", "2026-10-31", 12)).toBeNull();
    expect(readDaily("2026-10-31")).toEqual({ catch: 90 });
    expect(keepDaily("catch", "2026-10-31", 80)).toBe(false);
  });
});
