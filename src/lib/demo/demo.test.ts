import { describe, expect, it } from "vitest";
import { OWNED_ITEMS, findGuilds, findItems, findListings } from "./index";

const names = (list: Array<{ name: string }>) => list.map((item) => item.name);

describe("market search and filters", () => {
  it("does what each filter chip says", () => {
    expect(names(findListings({ filter: "all" }))).toEqual(["Marmalade", "Sesame", "Biscuit", "Mochi"]);
    expect(names(findListings({ filter: "cat" }))).toEqual(["Marmalade"]);
    expect(names(findListings({ filter: "cloth" }))).toEqual(["Marmalade", "Biscuit"]);
    expect(names(findListings({ filter: "cheap" }))).toEqual(["Marmalade", "Biscuit"]);
  });

  it("searches names and traits, ignoring case and stray spaces", () => {
    expect(names(findListings({ q: "  floppy " }))).toEqual(["Biscuit"]);
    expect(names(findListings({ q: "CLOUD BUN" }))).toEqual(["Sesame", "Mochi"]);
    expect(names(findListings({ filter: "cloth", q: "cloud" }))).toEqual([]);
  });

  it("searches items by name and slot", () => {
    expect(names(findItems(OWNED_ITEMS, "backdrop"))).toEqual(["Window seat"]);
    expect(findItems(OWNED_ITEMS, "")).toHaveLength(OWNED_ITEMS.length);
  });
});

describe("guild search and filters", () => {
  it("keeps only social guilds under No token", () => {
    expect(names(findGuilds({ filter: "no-token" }))).toEqual(["The Window Seat"]);
  });

  it("searches what a guild is about, not just its name", () => {
    expect(names(findGuilds({ q: "lanterns" }))).toEqual(["Nightshift"]);
  });
});
