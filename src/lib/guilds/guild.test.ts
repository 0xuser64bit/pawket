import { describe, expect, it } from "vitest";
import { GUILD_LIMITS } from "@/lib/solana/program";
import { CREST_COLOURS, CREST_GLYPHS, guildProblems, isValidSlug, nameFor, slugFor } from "./guild";

describe("slugFor", () => {
  it("turns a name into an address the program accepts", () => {
    expect(slugFor("Sunbeam Club")).toBe("sunbeam-club");
    expect(slugFor("  Café  Crème!! ")).toBe("cafe-creme");
    expect(slugFor("The Muddy Paws — est. 2026")).toBe("the-muddy-paws-est-2026");
    expect(slugFor("ねこ")).toBe("");
    expect(slugFor("a".repeat(40))).toHaveLength(GUILD_LIMITS.maxSlug);
    expect(slugFor("abcdefghijklmnopqrstuvw x")).toBe("abcdefghijklmnopqrstuvw");
  });

  it("agrees with the program's rule", () => {
    expect(isValidSlug("sunbeam-club")).toBe(true);
    for (const bad of ["ab", "-sun", "sun-", "Sun", "sun beam", "a".repeat(25)]) expect(isValidSlug(bad), bad).toBe(false);
  });
});

describe("guildProblems", () => {
  const draft = { name: "Sunbeam Club", motto: "Naps first.", crest: 0, colour: 0 };

  it("passes a draft the program would take", () => {
    expect(guildProblems(draft)).toEqual({});
  });

  it("names each problem in words", () => {
    expect(guildProblems({ ...draft, name: "Su" }).name).toMatch(/3 to 32/);
    expect(guildProblems({ ...draft, name: "ねこの会" }).name).toMatch(/letters or numbers/);
    expect(guildProblems({ ...draft, motto: "a".repeat(81) }).motto).toMatch(/80/);
    expect(guildProblems({ ...draft, name: "New" }).name).toMatch(/Pawket's own/);
    expect(guildProblems({ ...draft, crest: 8 }).crest).toBeDefined();
    expect(guildProblems({ ...draft, colour: -1 }).colour).toBeDefined();
  });

  it("names as many crests and colours as the program counts", () => {
    expect(CREST_GLYPHS).toHaveLength(GUILD_LIMITS.crests);
    expect(CREST_COLOURS).toHaveLength(GUILD_LIMITS.colours);
    expect(CREST_COLOURS[0].id).toBe("bloom");
  });
});

describe("nameFor", () => {
  it("names an unfounded address so founding from it lands on that address, or not at all", () => {
    expect(nameFor("window-seat")).toBe("Window Seat");
    expect(slugFor(nameFor("club-2026")!)).toBe("club-2026");
    expect(nameFor("a--b")).toBeNull();
    expect(nameFor("ab")).toBeNull();
    expect(nameFor("new")).toBeNull();
  });
});
