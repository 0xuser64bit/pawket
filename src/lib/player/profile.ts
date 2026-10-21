"use client";

import { useSyncExternalStore } from "react";
import * as z from "@/lib/zod";
import { lookSchema, parseLook, type PlayerLook } from "./look";

export const OUTFIT_SLOTS = 3;
export const MAX_PLAYER_NAME = 24;

const profileSchema = z.object({
  version: z.literal(1),
  name: z.string().max(MAX_PLAYER_NAME),
  outfits: z.array(lookSchema.nullable()).length(OUTFIT_SLOTS),
});

export type PlayerProfile = z.infer<typeof profileSchema>;

export const DEFAULT_PROFILE: PlayerProfile = { version: 1, name: "", outfits: [null, null, null] };

const KEY = "pawket.player.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; profile: PlayerProfile } | null = null;

export function parseProfile(raw: unknown): PlayerProfile {
  const whole = profileSchema.safeParse(raw);
  if (whole.success) return whole.data;
  if (!raw || typeof raw !== "object") return DEFAULT_PROFILE;
  const { name, outfits } = raw as { name?: unknown; outfits?: unknown };
  return {
    version: 1,
    name: typeof name === "string" ? name.slice(0, MAX_PLAYER_NAME) : "",
    outfits: Array.from({ length: OUTFIT_SLOTS }, (_, i) => {
      const outfit = Array.isArray(outfits) ? outfits[i] : null;
      return outfit && typeof outfit === "object" ? parseLook(outfit) : null;
    }),
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function readProfileSnapshot(): PlayerProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.profile;
  let profile = DEFAULT_PROFILE;
  if (raw) {
    try {
      profile = parseProfile(JSON.parse(raw));
    } catch {
      profile = DEFAULT_PROFILE;
    }
  }
  cache = { raw, profile };
  return profile;
}

export function saveProfile(profile: PlayerProfile): boolean {
  if (!profileSchema.safeParse(profile).success) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    return false;
  }
  cache = null;
  for (const listener of listeners) listener();
  return true;
}

export function withOutfit(profile: PlayerProfile, slot: number, look: PlayerLook | null): PlayerProfile {
  const outfits = profile.outfits.map((outfit, i) => (i === slot ? look : outfit));
  return { ...profile, outfits };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePlayerProfile(): PlayerProfile {
  return useSyncExternalStore(subscribe, readProfileSnapshot, () => DEFAULT_PROFILE);
}
