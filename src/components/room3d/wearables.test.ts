import { describe, expect, it } from "vitest";
import { WEARABLES } from "@/lib/closet/catalog";
import { isShownIn3D, wearableFor, wearablesWithoutShape } from "./wearables";

describe("wardrobe in 3D", () => {
  it("draws every catalog item, so none is only implied", () => {
    expect(wearablesWithoutShape()).toEqual([]);
    for (const item of WEARABLES) {
      expect(isShownIn3D(item.id)).toBe(true);
      expect(wearableFor(item.id)?.name).toBe("wearable");
    }
  });

  it("draws nothing for an id it does not know", () => {
    expect(isShownIn3D("golden-saddle")).toBe(false);
    expect(wearableFor("golden-saddle")).toBeNull();
  });
});
