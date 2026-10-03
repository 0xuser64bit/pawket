import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "./look";
import { DEFAULT_PROFILE, parseProfile, withOutfit } from "./profile";

describe("player profile", () => {
  it("reads a whole profile as it was kept", () => {
    const kept = { version: 1, name: "Arth", outfits: [DEFAULT_LOOK, null, null] };
    expect(parseProfile(kept)).toEqual(kept);
  });

  it("keeps the name and the good outfits of a damaged profile", () => {
    const damaged = { name: "A".repeat(40), outfits: [{ ...DEFAULT_LOOK, top: "cape" }, 7] };
    const parsed = parseProfile(damaged);
    expect(parsed.name).toHaveLength(24);
    expect(parsed.outfits[0]).toEqual({ ...DEFAULT_LOOK });
    expect(parsed.outfits.slice(1)).toEqual([null, null]);
  });

  it("turns garbage into the default", () => {
    expect(parseProfile("nope")).toEqual(DEFAULT_PROFILE);
    expect(parseProfile(null)).toEqual(DEFAULT_PROFILE);
  });

  it("keeps an outfit in one slot and leaves the others", () => {
    const next = withOutfit(DEFAULT_PROFILE, 1, DEFAULT_LOOK);
    expect(next.outfits).toEqual([null, DEFAULT_LOOK, null]);
    expect(withOutfit(next, 1, null).outfits).toEqual([null, null, null]);
  });
});
