import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { chooseCoat, copyCoat, readCoatChoices } from "./use-coats";

const KEY = "pawket.pet-coats.v1";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("can retry an already copied coat without another storage write", () => {
  chooseCoat("local", "lilac");
  chooseCoat("confirmed", "lilac");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });

  expect(copyCoat("local", "confirmed")).toBe(true);
  expect(readCoatChoices()).toEqual({ local: "lilac", confirmed: "lilac" });
});

it("refuses to copy an unreadable choice instead of replacing saved coats with an empty map", () => {
  chooseCoat("local", "lilac");
  chooseCoat("other", "mint");
  const saved = window.localStorage.getItem(KEY);
  const getItem = Storage.prototype.getItem;
  const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key) {
    if (key === KEY) throw new Error("Storage unavailable");
    return getItem.call(this, key);
  });

  expect(copyCoat("local", "confirmed")).toBe(false);
  blocked.mockRestore();
  expect(window.localStorage.getItem(KEY)).toBe(saved);
});

it("preserves the source and an unrelated coat while copying a classic choice over a stale target", () => {
  chooseCoat("confirmed", "lilac");
  chooseCoat("other", "mint");

  expect(copyCoat("local", "confirmed")).toBe(true);
  expect(readCoatChoices()).toEqual({ other: "mint" });
});

it("leaves the source, target and other coats intact when copying cannot be saved", () => {
  chooseCoat("local", "lilac");
  chooseCoat("confirmed", "smoke");
  chooseCoat("other", "mint");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });

  expect(copyCoat("local", "confirmed")).toBe(false);
  expect(readCoatChoices()).toEqual({ local: "lilac", confirmed: "smoke", other: "mint" });
});
