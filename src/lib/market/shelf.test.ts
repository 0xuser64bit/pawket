import { expect, it } from "vitest";
import { isShelfFilter, onShelf, type ShelfEntry } from "./shelf";

const headphones: ShelfEntry = { name: "Headphones", line: "For any of your pets on Solana.", kind: "piece", tags: ["head", "foil"] };
const hearts: ShelfEntry = { name: "Heart glasses", line: "For any of your pets on Solana.", kind: "piece", tags: ["eyes", "cloth"] };
const strawberry: ShelfEntry = { name: "Strawberry", line: "Strawberry milk: pink, with a coral sun.", kind: "room", tags: ["light", "glass"] };
const starlight: ShelfEntry = { name: "Starlight", line: "A navy night with a gold moon.", kind: "room", tags: ["dark", "glass"] };

it("finds a thing by the start of any word it is known by", () => {
  expect(onShelf(headphones, "hea", "all", false)).toBe(true);
  expect(onShelf(hearts, "hea", "all", false)).toBe(true);
  expect(onShelf(strawberry, "hea", "all", false)).toBe(false);
  expect(onShelf(hearts, "  GLASSES ", "all", false)).toBe(true);
});

it("needs every word of the query, and knows a few words players use instead", () => {
  expect(onShelf(strawberry, "pink room", "all", false)).toBe(true);
  expect(onShelf(starlight, "pink room", "all", false)).toBe(false);
  expect(onShelf(hearts, "specs", "all", false)).toBe(true);
  expect(onShelf(starlight, "night theme", "all", false)).toBe(true);
});

it("narrows to a kind, a place on the pet, or what the closet holds", () => {
  expect(onShelf(strawberry, "", "room", false)).toBe(true);
  expect(onShelf(headphones, "", "room", false)).toBe(false);
  expect(onShelf(headphones, "", "head", false)).toBe(true);
  expect(onShelf(hearts, "", "head", false)).toBe(false);
  expect(onShelf(hearts, "", "yours", false)).toBe(false);
  expect(onShelf(hearts, "", "yours", true)).toBe(true);
});

it("takes only the filters it shows", () => {
  expect(isShelfFilter("room")).toBe(true);
  expect(isShelfFilter("stat")).toBe(false);
});

it("finds the autumn things by the season's other names", () => {
  const leaves: ShelfEntry = { name: "Leaf pile", line: "A heap of autumn leaves, for jumping in.", kind: "decor", tags: ["side", "free"] };
  for (const query of ["autumn", "halloween", "fall", "spooky"]) expect(onShelf(leaves, query, "all", false), query).toBe(true);
});
