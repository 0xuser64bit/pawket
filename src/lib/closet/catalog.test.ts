import { describe, expect, it } from "vitest";
import { WEARABLES, findWearable, isWearableId } from "./catalog";

const POWER_KEYS = /stat|xp|cooldown|boost|power|weight|priority|speed/i;

describe("wearable catalog", () => {
  it("is a fixed set of looks, with nothing that could change play", () => {
    expect(WEARABLES.length).toBeGreaterThan(0);
    const ids = WEARABLES.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of WEARABLES) {
      expect(Object.keys(item).sort()).toEqual(["icon", "id", "kind", "name"]);
      for (const key of Object.keys(item)) {
        expect(key).not.toMatch(POWER_KEYS);
      }
    }
  });

  it("looks up only known ids", () => {
    expect(isWearableId("wool-scarf")).toBe(true);
    expect(isWearableId("stat-cape")).toBe(false);
    expect(findWearable("paper-crown")?.name).toBe("Paper crown");
    expect(findWearable(null)).toBeUndefined();
    expect(findWearable("nope")).toBeUndefined();
  });
});
