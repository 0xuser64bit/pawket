"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOOK } from "./look";
import { readLookSnapshot, subscribeLook } from "./storage";

export function usePlayerLook() {
  return useSyncExternalStore(subscribeLook, readLookSnapshot, () => DEFAULT_LOOK);
}
