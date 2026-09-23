"use client";

import { useSyncExternalStore } from "react";
import { useMounted } from "@/lib/utils/use-mounted";
import { readGuestPetSnapshot, subscribeGuestPet } from "./storage";

/** The pet in this browser, after hydration. `ready` is false during SSR. */
export function useGuestPet() {
  const ready = useMounted();
  const stored = useSyncExternalStore(subscribeGuestPet, readGuestPetSnapshot, () => null);
  return { ready, pet: ready ? stored : null };
}
