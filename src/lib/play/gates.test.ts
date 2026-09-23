import { describe, expect, it } from "vitest";
import { GATE_COUNT, gatePattern, scoreGates } from "./gates";

describe("gatePattern", () => {
  it("is the same pattern every time for a seed", () => {
    expect(gatePattern("pepper-2026-09-23")).toEqual(gatePattern("pepper-2026-09-23"));
    expect(gatePattern("pepper-2026-09-23")).toHaveLength(GATE_COUNT);
  });

  it("changes when the seed changes", () => {
    expect(gatePattern("a")).not.toEqual(gatePattern("b"));
  });

  it("locks the porch pattern for a known seed", () => {
    expect(gatePattern("pawket")).toEqual(["left", "right", "left", "right", "left"]);
  });
});

describe("scoreGates", () => {
  const pattern = ["left", "right", "left"] as const;

  it("counts ordered matches and ignores a short or long answer", () => {
    expect(scoreGates(pattern, ["left", "right", "left"])).toBe(3);
    expect(scoreGates(pattern, ["right", "right", "right"])).toBe(1);
    expect(scoreGates(pattern, ["left"])).toBe(1);
    expect(scoreGates(pattern, ["left", "right", "left", "left"])).toBe(3);
    expect(scoreGates(pattern, [])).toBe(0);
  });
});
