import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_LOOK } from "./look";
import { DEFAULT_PROFILE, parseProfile, saveProfile, usePlayerProfile, withOutfit } from "./profile";

describe("player profile", () => {
  beforeEach(() => window.localStorage.clear());

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

  it.each([null, "pawket.player.v1"])("refreshes a mounted profile after storage deletion with key %s", (key) => {
    const kept = { ...withOutfit(DEFAULT_PROFILE, 1, DEFAULT_LOOK), name: "Arth" };
    saveProfile(kept);
    const { result } = renderHook(() => usePlayerProfile());
    expect(result.current).toEqual(kept);

    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
    });
    expect(result.current).toEqual(DEFAULT_PROFILE);
  });

  it("does not resurrect cleared outfits when the mounted profile is edited", () => {
    saveProfile(withOutfit(DEFAULT_PROFILE, 0, DEFAULT_LOOK));
    const { result } = renderHook(() => usePlayerProfile());
    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage }));
    });
    act(() => {
      expect(saveProfile({ ...result.current, name: "New name" })).toBe(true);
    });
    expect(JSON.parse(window.localStorage.getItem("pawket.player.v1")!)).toEqual({ ...DEFAULT_PROFILE, name: "New name" });
  });

  it("does not react to an unrelated storage key", () => {
    saveProfile({ ...DEFAULT_PROFILE, name: "Arth" });
    const { result } = renderHook(() => usePlayerProfile());
    const snapshot = result.current;
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", storageArea: window.localStorage }));
    });
    expect(result.current).toBe(snapshot);
  });
});
