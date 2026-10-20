import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { DECOR } from "@/lib/room/decor";
import { DECOR_DRAWN } from "@/components/home/decor-art";
import { DECOR_BUILT, buildDecor } from "./decor";

const size = (id: string) => new Box3().setFromObject(buildDecor(id)!.object).getSize(new Vector3());

describe("the room's things, three ways", () => {
  it("are each built in 3D and drawn flat, and nothing the catalog does not list", () => {
    const ids = DECOR.map((piece) => piece.id).sort();
    expect([...DECOR_BUILT].sort()).toEqual(ids);
    expect([...DECOR_DRAWN].sort()).toEqual(ids);
  });

  it("keep a bed to the cushion's footprint, low enough that a napping pet is seen", () => {
    for (const piece of DECOR.filter((each) => each.slot === "bed")) {
      const { x, y, z } = size(piece.id);
      expect(Math.max(x, z), piece.id).toBeLessThanOrEqual(1.05);
      expect(y, piece.id).toBeLessThanOrEqual(0.62);
    }
  });

  it("hang a picture flat on the wall, and lay a rug flat on the floor", () => {
    for (const piece of DECOR.filter((each) => each.slot === "wall")) expect(size(piece.id).z, piece.id).toBeLessThan(0.12);
    for (const piece of DECOR.filter((each) => each.slot === "rug")) expect(size(piece.id).y, piece.id).toBeLessThan(0.05);
  });

  it("let a clock keep the time it is given", () => {
    const clock = buildDecor("wall-clock")!;
    clock.tick!(new Date(2026, 9, 20, 3, 0));
    const hands = clock.object.children.filter((child) => child.type === "Group");
    // At three o'clock the hour hand points right and the minute hand up.
    expect(hands[0].rotation.z).toBeCloseTo(-Math.PI / 2);
    expect(hands[1].rotation.z).toBeCloseTo(0);
  });

  it("light a lamp after dark and put it out by day", () => {
    const lamp = buildDecor("floor-lamp")!;
    lamp.evening!(true);
    let lit = 0;
    lamp.object.traverse((node) => {
      const material = (node as { material?: { emissiveIntensity?: number } }).material;
      if (material?.emissiveIntensity) lit++;
    });
    expect(lit).toBeGreaterThan(0);
    expect(buildDecor("nope")).toBeNull();
  });
});
