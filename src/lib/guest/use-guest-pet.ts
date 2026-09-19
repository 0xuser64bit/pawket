"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { CareActionType } from "@/lib/game/enums";
import {
  applyGuestCare,
  createGuestPet,
  projectGuestPet,
  type AdoptGuestInput,
  type GuestPet,
  type ProjectedPet,
} from "./pet";
import {
  clearGuestPet,
  readGuestPetSnapshot,
  saveGuestPet,
  subscribeGuestPet,
} from "./storage";
import { useMounted } from "@/lib/utils/use-mounted";

export interface GuestPetState {
  /** Null until hydrated (SSR-safe) or when no guest pet exists yet. */
  pet: GuestPet | null;
  hydrated: boolean;
  now: Date;
  /** Live projection (decay applied forward). Null without a pet. */
  live: ProjectedPet | null;
  /** Returns an error message when the action is cooling down, else null. */
  care: (action: CareActionType) => string | null;
  adopt: (input: AdoptGuestInput) => void;
  startOver: () => void;
}

/**
 * Owns the guest companion: external-store truth (SSR-safe, cross-tab),
 * a 1s ticker for countdowns/decay display, persistence every mutation.
 * State changes apply immediately (local truth) — the no-optimism rule
 * governs on-chain sends, not local play.
 */
export function useGuestPet(): GuestPetState {
  const mounted = useMounted();
  // Server and first client render see null (identical HTML); the store
  // value swaps in after hydration via `mounted`, like `useMounted` documents.
  const stored = useSyncExternalStore(
    subscribeGuestPet,
    readGuestPetSnapshot,
    () => null,
  );
  const pet: GuestPet | null = mounted ? stored : null;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!pet) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [pet]);

  const adopt = useCallback((input: AdoptGuestInput) => {
    saveGuestPet(createGuestPet(input));
    setNow(new Date());
  }, []);

  const care = useCallback((action: CareActionType): string | null => {
    const current = readGuestPetSnapshot();
    if (!current) return "Adopt a companion first.";
    const result = applyGuestCare(current, action, new Date());
    if (!result.ok) return result.message;
    saveGuestPet(result.pet);
    return null;
  }, []);

  const startOver = useCallback(() => {
    clearGuestPet();
  }, []);

  return {
    pet,
    hydrated: mounted,
    now,
    live: pet ? projectGuestPet(pet, now) : null,
    care,
    adopt,
    startOver,
  };
}
