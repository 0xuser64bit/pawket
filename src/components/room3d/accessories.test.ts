import { Box3, Vector3, type BufferGeometry, type Material, type Mesh } from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "@/lib/player/look";
import { accessoriesFor } from "./accessories";
import { disposeTree } from "./materials";

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

describe("taking a piece off", () => {
  it("gives back each geometry and material it built, once, outlines included", () => {
    const worn = accessoriesFor({ ...DEFAULT_LOOK, headwear: "bunny", eyewear: "round" }, { l: new Vector3(0.034, 0.1, 0.08), r: new Vector3(-0.034, 0.1, 0.08) });
    const disposed = new Map<BufferGeometry | Material, number>();
    worn.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      for (const thing of [mesh.geometry, mesh.material as Material]) {
        if (!disposed.has(thing)) thing.addEventListener("dispose", () => disposed.set(thing, disposed.get(thing)! + 1));
        disposed.set(thing, 0);
      }
    });
    disposeTree(worn);
    expect(disposed.size).toBeGreaterThan(4);
    expect([...disposed.values()].every((times) => times === 1)).toBe(true);
  });
});
