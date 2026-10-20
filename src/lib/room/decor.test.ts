import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { THEMES, roomItem } from "@/config/themes";
import { DECOR, DECOR_SLOTS, DEFAULT_DECOR, decorOpen, findDecor, isNewDecor, parseDecor, placeDecor, shownDecor, useRoomDecor } from "./decor";

const POWER_KEYS = /stat|xp|cooldown|boost|power|weight|priority|speed|price/i;

afterEach(() => window.localStorage.clear());

describe("the room's things", () => {
  it("are looks only, each in one known place, with unique ids", () => {
    const ids = DECOR.map((piece) => piece.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const piece of DECOR) {
      expect(DECOR_SLOTS).toContain(piece.slot);
      for (const key of Object.keys(piece)) expect(key).not.toMatch(POWER_KEYS);
    }
    for (const [slot, id] of Object.entries(DEFAULT_DECOR)) {
      if (!id) continue;
      expect(findDecor(id)?.slot).toBe(slot);
      expect(findDecor(id)?.room).toBeUndefined();
    }
  });

  it("give each of the Market's rooms one thing of its own, and nothing to a free room", () => {
    const sold = THEMES.filter((theme) => roomItem(theme.id) !== null).map((theme) => theme.id).sort();
    const given = DECOR.flatMap((piece) => (piece.room ? [piece.room] : [])).sort();
    expect(given).toEqual(sold);
  });

  it("open a room's thing only to a closet that holds that room", () => {
    const scroll = findDecor("blossom-scroll")!;
    expect(decorOpen(scroll, new Set())).toBe(false);
    expect(decorOpen(scroll, new Set([roomItem("blossom")!]))).toBe(true);
    expect(decorOpen(findDecor("cactus")!, new Set())).toBe(true);
  });
});

describe("what the room shows", () => {
  it("keeps a choice it can show, and the slot's own thing for one it cannot", () => {
    const chosen = { wall: "blossom-scroll", corner: "cactus", rug: null, bed: "fern", side: "nope" };
    expect(shownDecor(chosen, new Set())).toEqual({ ...DEFAULT_DECOR, corner: "cactus", rug: null });
    expect(shownDecor(chosen, new Set([roomItem("blossom")!])).wall).toBe("blossom-scroll");
  });

  it("never leaves the pet without a bed", () => {
    expect(shownDecor({ ...DEFAULT_DECOR, bed: null }, new Set()).bed).toBe(DEFAULT_DECOR.bed);
    expect(placeDecor("bed", null)).toBe(false);
  });

  it("reads back what was stored, a damaged slot as its own thing, and garbage as the room it came with", () => {
    expect(parseDecor("garbage")).toEqual(DEFAULT_DECOR);
    expect(parseDecor({ slots: { wall: "wall-clock", rug: "fern", corner: null } })).toEqual({ ...DEFAULT_DECOR, wall: "wall-clock", corner: null });
  });

  it("places a thing only in its own slot, and tells every reader", () => {
    const { result } = renderHook(() => useRoomDecor());
    expect(placeDecor("wall", "fern")).toBe(false);
    act(() => {
      expect(placeDecor("wall", "wall-clock")).toBe(true);
    });
    expect(result.current.wall).toBe("wall-clock");
    act(() => {
      placeDecor("wall", null);
    });
    expect(result.current.wall).toBeNull();
  });
});

describe("new things", () => {
  it("are marked new for thirty days after they arrive, and never before or after", () => {
    const leaves = findDecor("leaf-pile")!;
    expect(isNewDecor(leaves, new Date("2026-10-21T12:00:00Z"))).toBe(true);
    expect(isNewDecor(leaves, new Date("2026-11-19T12:00:00Z"))).toBe(true);
    expect(isNewDecor(leaves, new Date("2026-11-21T12:00:00Z"))).toBe(false);
    expect(isNewDecor(findDecor("fern")!, new Date("2026-10-21T12:00:00Z"))).toBe(false);
  });
});
