import { describe, expect, it } from "vitest";
import { BADGES } from "@/lib/game/badges";
import { WEARABLES, findWearable, isUnlocked, isWearableId } from "./catalog";

const POWER_KEYS = /stat|xp|cooldown|boost|power|weight|priority|speed/i;

describe("wearable catalog", () => {
  it("is a fixed set of looks, with nothing that could change play", () => {
    expect(WEARABLES.length).toBeGreaterThan(0);
    const ids = WEARABLES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of WEARABLES) {
      expect(Object.keys(item).filter((key) => key !== "earnedBy").sort()).toEqual(["icon", "id", "kind", "name"]);
      for (const key of Object.keys(item)) {
        expect(key).not.toMatch(POWER_KEYS);
      }
    }
  });

  it("is earned only by stickers that exist, and open otherwise", () => {
    const stickers = new Set(BADGES.map((badge) => badge.id));
    for (const item of WEARABLES) if (item.earnedBy) expect(stickers.has(item.earnedBy), item.id).toBe(true);
    const hat = findWearable("party-hat")!;
    expect(isUnlocked(hat, [])).toBe(false);
    expect(isUnlocked(hat, ["growing-up"])).toBe(true);
    expect(isUnlocked(findWearable("wool-scarf")!, [])).toBe(true);
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

  it("looks up only known ids", () => {
    expect(isWearableId("wool-scarf")).toBe(true);
    expect(isWearableId("stat-cape")).toBe(false);
    expect(findWearable("paper-crown")?.name).toBe("Paper crown");
    expect(findWearable(null)).toBeUndefined();
    expect(findWearable("nope")).toBeUndefined();
  });
});
