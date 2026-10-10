import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "@/lib/player/look";
import { accessoriesFor } from "./accessories";

describe("bunny ears", () => {
  it("fits the headband across the skull and joins both ears to it", () => {
    const accessory = accessoriesFor({ ...DEFAULT_LOOK, headwear: "bunny" }, {
      l: new Vector3(0.034, 0.1, 0.08),
      r: new Vector3(-0.034, 0.1, 0.08),
    });
    const [band, left, , right] = accessory.children[0].children;
    const bandBox = new Box3().setFromObject(band);
    const size = bandBox.getSize(new Vector3());
    expect(size.x).toBeGreaterThan(size.z * 5);
    for (const ear of [left, right]) {
      expect(bandBox.intersectsBox(new Box3().setFromObject(ear))).toBe(true);
    }
  });
});
