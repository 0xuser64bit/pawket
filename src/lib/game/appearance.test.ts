import { describe, expect, it } from "vitest";
import { MOOD_SENTENCE, suggestCare } from "./appearance";
import { CareActionType, PetMood } from "./enums";

const RESTED = { [CareActionType.Feed]: 0, [CareActionType.Play]: 0, [CareActionType.Groom]: 0, [CareActionType.Rest]: 0 };

describe("suggestCare", () => {
  it("asks for the care that looks after the lowest vital", () => {
    expect(suggestCare({ hunger: 20, happiness: 60, energy: 70, hygiene: 80 }, RESTED)).toBe(CareActionType.Feed);
    expect(suggestCare({ hunger: 90, happiness: 30, energy: 70, hygiene: 80 }, RESTED)).toBe(CareActionType.Play);
    expect(suggestCare({ hunger: 90, happiness: 60, energy: 10, hygiene: 80 }, RESTED)).toBe(CareActionType.Rest);
    expect(suggestCare({ hunger: 90, happiness: 60, energy: 70, hygiene: 5 }, RESTED)).toBe(CareActionType.Groom);
  });

  it("skips a care that is resting", () => {
    const fed = { ...RESTED, [CareActionType.Feed]: 600 };
    expect(suggestCare({ hunger: 10, happiness: 60, energy: 70, hygiene: 80 }, fed)).toBe(CareActionType.Play);
  });

  it("asks for nothing when every care is resting", () => {
    const all = { [CareActionType.Feed]: 1, [CareActionType.Play]: 1, [CareActionType.Groom]: 1, [CareActionType.Rest]: 1 };
    expect(suggestCare({ hunger: 10, happiness: 10, energy: 10, hygiene: 10 }, all)).toBeNull();
  });
});

describe("MOOD_SENTENCE", () => {
  it("has a sentence for every mood, with no exclamation mark", () => {
    for (const mood of Object.values(PetMood)) {
      expect(MOOD_SENTENCE[mood]).toMatch(/^is /);
      expect(MOOD_SENTENCE[mood]).not.toContain("!");
    }
  });
});
