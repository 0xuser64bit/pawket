"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOOK } from "./look";
import { readLookSnapshot, subscribeLook } from "./storage";

/** The player's look on this device. The default until hydration. */
export function usePlayerLook() {
  return useSyncExternalStore(subscribeLook, readLookSnapshot, () => DEFAULT_LOOK);
}
