import { describe, expect, it } from "vitest";
import { MARKET_WEARABLES, WEARABLES, findWearable, isWearableId, wearableItem } from "./catalog";

const POWER_KEYS = /stat|xp|cooldown|boost|power|weight|priority|speed/i;

describe("wearable catalog", () => {
  it("is a fixed set of looks, with nothing that could change play", () => {
    expect(WEARABLES.length).toBeGreaterThan(0);
    const ids = WEARABLES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of WEARABLES) {
      expect(Object.keys(item).filter((key) => key !== "price").sort()).toEqual(["icon", "id", "kind", "name"]);
      for (const key of Object.keys(item)) {
        expect(key).not.toMatch(POWER_KEYS);
      }
    }
  });

  it("keeps the first six where the program has always stored them", () => {
    expect(WEARABLES.slice(0, 6).map((item) => item.id)).toEqual([
      "wool-scarf",
      "paper-crown",
      "red-collar",
      "star-pin",
      "rain-cape",
      "nap-ribbon",
    ]);
  });

  it("keeps three starter pieces free and sells the other twenty-five as looks, classics for less", () => {
    expect(MARKET_WEARABLES).toHaveLength(25);
    expect(MARKET_WEARABLES.map((item) => wearableItem(item.id))).toEqual(Array.from({ length: 25 }, (_, i) => i + 4));
    expect(MARKET_WEARABLES.slice(0, 15).every((item) => item.price === 20_000_000n)).toBe(true);
    expect(MARKET_WEARABLES.slice(15).every((item) => item.price === 50_000_000n)).toBe(true);
    expect(WEARABLES.slice(0, 3).some((item) => item.price)).toBe(false);
  });

  it("looks up only known ids", () => {
    expect(isWearableId("wool-scarf")).toBe(true);
    expect(isWearableId("stat-cape")).toBe(false);
    expect(findWearable("paper-crown")?.name).toBe("Paper crown");
    expect(findWearable(null)).toBeUndefined();
    expect(findWearable("nope")).toBeUndefined();
  });
});
