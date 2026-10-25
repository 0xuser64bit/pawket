import { describe, expect, it } from "vitest";
import { DEFAULT_LOOK, describeLook, lookSchema, parseLook, twinWith, withLook } from "./look";

describe("player look", () => {
  it("starts from a valid default", () => {
    expect(lookSchema.safeParse(DEFAULT_LOOK).success).toBe(true);
  });

  it("reads garbage as the default", () => {
    expect(parseLook(null)).toEqual(DEFAULT_LOOK);
    expect(parseLook("pool tee")).toEqual(DEFAULT_LOOK);
    expect(parseLook(42)).toEqual(DEFAULT_LOOK);
  });

  it("keeps every valid field when one is retired", () => {
    const stored = { ...DEFAULT_LOOK, top: "cape", topColour: "sprout", hair: "long" };
    expect(parseLook(stored)).toEqual({ ...DEFAULT_LOOK, topColour: "sprout", hair: "long" });
  });

  it("never takes a guild or risk hue for clothes", () => {
    expect(parseLook({ ...DEFAULT_LOOK, topColour: "bloom" }).topColour).toBe(DEFAULT_LOOK.topColour);
    expect(parseLook({ ...DEFAULT_LOOK, bottomColour: "alarm" }).bottomColour).toBe(DEFAULT_LOOK.bottomColour);
  });

  it("changes one part and refuses an unknown value", () => {
    expect(withLook(DEFAULT_LOOK, "shoes", "boots").shoes).toBe("boots");
    expect(withLook(DEFAULT_LOOK, "skin", 99 as never)).toBe(DEFAULT_LOOK);
  });

  it("describes the look in one sentence", () => {
    expect(describeLook(DEFAULT_LOOK)).toBe(
      "You, with espresso buns hair, a pool tee, ink trousers and sun sneakers",
    );
    expect(describeLook({ ...DEFAULT_LOOK, hair: "none", beard: true, shoes: "none" })).toBe(
      "You, with a shaved head and a beard, a pool tee, ink trousers and bare feet",
    );
  });

  it("has no field that could reach play", () => {
    for (const key of Object.keys(DEFAULT_LOOK)) expect(key).not.toMatch(/stat|xp|boost|cooldown|score/i);
  });
});

describe("extras and matching", () => {
  it("gives a look from before extras nothing on the head or the nose", () => {
    const before = { ...DEFAULT_LOOK } as Record<string, unknown>;
    delete before.headwear;
    delete before.headwearColour;
    delete before.eyewear;
    expect(parseLook(before)).toMatchObject({ headwear: "none", eyewear: "none" });
  });

  it("matches the pet's hat or glasses where the player has one like it", () => {
    expect(twinWith("knit-beanie")).toEqual({ headwear: "beanie", headwearColour: "pool" });
    expect(twinWith("heart-glasses")).toEqual({ eyewear: "hearts" });
    expect(twinWith("nap-ribbon")).toEqual({ headwear: "bow", headwearColour: "sprout" });
    expect(twinWith("headphones")).toEqual({ headwear: "headphones", headwearColour: "pool" });
    expect(twinWith("sunglasses")).toEqual({ eyewear: "shades" });
    expect(twinWith("wool-scarf")).toBeNull();
    expect(twinWith(null)).toBeNull();
  });

  it("keeps a pastel as a cloth colour", () => {
    expect(withLook(DEFAULT_LOOK, "topColour", "mint").topColour).toBe("mint");
  });
});
