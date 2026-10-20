import { expect, it } from "vitest";
import type { Object3D } from "three";
import { buildRoom } from "./set";

const leaves = (group: Object3D) => group.children.filter((child) => child.name === "leaf");

it("lets leaves fall past the window in autumn only, inside the glass", () => {
  const room = buildRoom();
  expect(leaves(room.group).length).toBeGreaterThan(0);
  room.tick(new Date(2026, 5, 21, 12));
  expect(leaves(room.group).every((leaf) => !leaf.visible)).toBe(true);
  room.tick(new Date(2026, 9, 21, 12));
  for (const leaf of leaves(room.group)) {
    expect(leaf.visible).toBe(true);
    expect(Math.abs(leaf.position.x - room.window.x)).toBeLessThan(0.45);
  }
});
