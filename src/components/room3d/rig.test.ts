import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { angleDelta, solveElbow } from "./rig";

describe("two-bone reach", () => {
  const shoulder = new Vector3(0, 1.4, 0);
  const pole = new Vector3(0, 0, -1);

  it("keeps both bone lengths and lands on a reachable target", () => {
    const target = new Vector3(0.1, 1.1, 0.25);
    const { elbow, end } = solveElbow(shoulder, target, 0.25, 0.24, pole);
    expect(elbow.distanceTo(shoulder)).toBeCloseTo(0.25, 5);
    expect(end.distanceTo(elbow)).toBeCloseTo(0.24, 5);
    expect(end.distanceTo(target)).toBeLessThan(1e-3);
  });

  it("bends toward the pole", () => {
    const { elbow } = solveElbow(shoulder, new Vector3(0, 1.0, 0.1), 0.25, 0.24, pole);
    expect(elbow.z).toBeLessThan(0);
  });

  it("reaches as far as it can toward a target out of reach", () => {
    const target = new Vector3(0, 0, 0);
    const { end } = solveElbow(shoulder, target, 0.25, 0.24, pole);
    expect(end.distanceTo(shoulder)).toBeCloseTo(0.49, 3);
    expect(end.clone().sub(shoulder).normalize().y).toBeCloseTo(-1, 5);
  });
});

describe("angles", () => {
  it("turns the short way round", () => {
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6, 5);
    expect(angleDelta(0.2, 0.5)).toBeCloseTo(0.3, 5);
  });
});
