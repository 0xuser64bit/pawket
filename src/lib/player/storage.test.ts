import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DEFAULT_LOOK } from "./look";
import { saveLook } from "./storage";
import { usePlayerLook } from "./use-player-look";

afterEach(() => window.localStorage.clear());

it.each([null, "pawket.player-look.v1"])("resets a mounted look after another tab clears storage with key %s", (key) => {
  saveLook({ ...DEFAULT_LOOK, shoes: "boots" });
  const { result } = renderHook(() => usePlayerLook());
  expect(result.current.shoes).toBe("boots");
  act(() => {
    window.localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key, storageArea: window.localStorage }));
  });
  expect(result.current).toEqual(DEFAULT_LOOK);
});
