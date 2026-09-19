import { describe, expect, it } from "vitest";
import {
  applyCareAction,
  applyStatDecay,
  calculateLevelFromXp,
  calculatePetMood,
  clampStat,
  elapsedSecondsBetween,
  initialStats,
  validateCareCooldown,
} from "./math";
import { CARE_COOLDOWN_SECONDS } from "./constants";
import { CareActionType, PetMood } from "./enums";

const FULL = { hunger: 72, happiness: 72, energy: 72, hygiene: 72 };

describe("clampStat", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clampStat(150)).toBe(100);
    expect(clampStat(-4)).toBe(0);
    expect(clampStat(72.6)).toBe(73);
  });
});

describe("applyCareAction", () => {
  it.each([
    [CareActionType.Feed, { hunger: 95, happiness: 74, energy: 72, hygiene: 72 }],
    [CareActionType.Play, { hunger: 66, happiness: 95, energy: 60, hygiene: 72 }],
    [CareActionType.Groom, { hunger: 72, happiness: 75, energy: 72, hygiene: 97 }],
    [CareActionType.Rest, { hunger: 72, happiness: 72, energy: 100, hygiene: 72 }],
  ])("%s applies the locked deltas", (action, expected) => {
    const { stats, xpGained } = applyCareAction(FULL, action);
    expect(stats).toEqual(expected);
    expect(xpGained).toBe(10);
  });

  it("clamps at the boundaries", () => {
    const { stats } = applyCareAction(
      { hunger: 99, happiness: 99, energy: 5, hygiene: 99 },
      CareActionType.Play,
    );
    expect(stats).toEqual({ hunger: 93, happiness: 100, energy: 0, hygiene: 99 });
  });
});

describe("applyStatDecay", () => {
  it("returns a copy for non-positive or non-finite elapsed time", () => {
    expect(applyStatDecay(FULL, 0)).toEqual(FULL);
    expect(applyStatDecay(FULL, -10)).toEqual(FULL);
    expect(applyStatDecay(FULL, Number.NaN)).toEqual(FULL);
  });

  it("drains at the locked hourly rates", () => {
    // 24h: hunger −60, happiness −43.2→−43, energy −36, hygiene −28.8→−29
    expect(applyStatDecay(FULL, 24 * 3600)).toEqual({
      hunger: 12,
      happiness: 29,
      energy: 36,
      hygiene: 43,
    });
  });

  it("floors at zero", () => {
    expect(
      applyStatDecay({ hunger: 1, happiness: 1, energy: 1, hygiene: 1 }, 48 * 3600),
    ).toEqual({ hunger: 0, happiness: 0, energy: 0, hygiene: 0 });
  });
});

describe("levels", () => {
  it("starts at 1 and rises every 100 XP", () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(99)).toBe(1);
    expect(calculateLevelFromXp(100)).toBe(2);
    expect(calculateLevelFromXp(-50)).toBe(1);
  });
});

describe("calculatePetMood", () => {
  it("prioritizes critical needs, then averages", () => {
    expect(calculatePetMood({ ...FULL, hunger: 10 })).toBe(PetMood.Hungry);
    expect(calculatePetMood({ ...FULL, energy: 10 })).toBe(PetMood.Tired);
    expect(calculatePetMood({ ...FULL, hygiene: 10 })).toBe(PetMood.Scruffy);
    expect(calculatePetMood({ ...FULL, happiness: 10 })).toBe(PetMood.Lonely);
    expect(calculatePetMood({ hunger: 95, happiness: 95, energy: 95, hygiene: 95 })).toBe(
      PetMood.Radiant,
    );
    expect(calculatePetMood(FULL)).toBe(PetMood.Happy);
    expect(calculatePetMood({ hunger: 50, happiness: 50, energy: 50, hygiene: 50 })).toBe(
      PetMood.Okay,
    );
  });
});

describe("validateCareCooldown", () => {
  const now = new Date("2026-09-18T12:00:00Z");

  it("allows the first action", () => {
    expect(validateCareCooldown(null, CareActionType.Feed, now)).toEqual({
      allowed: true,
    });
  });

  it("blocks within the 30-minute window with remaining seconds", () => {
    const last = new Date(now.getTime() - 10 * 60 * 1000);
    const result = validateCareCooldown(last, CareActionType.Feed, now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.remainingSeconds).toBe(CARE_COOLDOWN_SECONDS - 600);
      expect(result.message).toMatch(/cooling down/);
    }
  });

  it("allows after the window", () => {
    const last = new Date(now.getTime() - 31 * 60 * 1000);
    expect(validateCareCooldown(last, CareActionType.Rest, now)).toEqual({
      allowed: true,
    });
  });

  it("caps a future timestamp at one full window (clock skew never extends cooldown)", () => {
    const future = new Date(now.getTime() + 60 * 60 * 1000);
    const result = validateCareCooldown(future, CareActionType.Feed, now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      // Without the clamp this would be window + skew (5400s).
      expect(result.remainingSeconds).toBe(CARE_COOLDOWN_SECONDS);
    }
  });
});

describe("elapsedSecondsBetween", () => {
  it("never goes negative", () => {
    const from = new Date("2026-09-18T12:00:00Z");
    const to = new Date("2026-09-18T11:00:00Z");
    expect(elapsedSecondsBetween(from, to)).toBe(0);
    expect(elapsedSecondsBetween(from, new Date("2026-09-18T12:01:40Z"))).toBe(100);
  });
});

describe("initialStats", () => {
  it("starts every vital at 72", () => {
    expect(initialStats()).toEqual(FULL);
  });
});
