import { expect, it } from "vitest";
import { NEWS } from "./news";

it("lists what is new newest first, each on a real day, linking only inside Pawket", () => {
  const days = NEWS.map((entry) => entry.date);
  expect([...days].sort().reverse()).toEqual(days);
  for (const entry of NEWS) {
    expect(new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10), entry.title).toBe(entry.date);
    if (entry.href) expect(entry.href, entry.title).toMatch(/^\/(?!\/)/);
    expect(entry.body.length, entry.title).toBeLessThan(200);
  }
  expect(new Set(NEWS.map((entry) => entry.title)).size).toBe(NEWS.length);
});
