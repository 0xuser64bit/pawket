"use client";

import { useSyncExternalStore } from "react";
import { useMounted } from "@/lib/utils/use-mounted";
import type { GuestPet } from "./pet";
import { readPetsSnapshot, subscribePets } from "./storage";

const NONE: GuestPet[] = [];

export function usePets() {
  const ready = useMounted();
  const stored = useSyncExternalStore(subscribePets, readPetsSnapshot, () => NONE);
  return { ready, pets: ready ? stored : NONE };
}
