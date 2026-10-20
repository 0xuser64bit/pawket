"use client";

import { useSyncExternalStore } from "react";
import { PetSpecies } from "@/lib/game/enums";

/**
 * A pet's coat: the colour of its fur, chosen by its person. Expression
 * only, like the wardrobe, and kept on this device the way the room and the
 * player's look are — Solana has no field for it, so a pet's Passport, the
 * Park and a visit show its species' classic coat.
 *
 * Each coat is a fill and a patch for the flat art (`PetArt` takes both)
 * and a main and second colour for the 3D model, which the room swaps for
 * the colours the asset pipeline baked in (`PetActor.paint`). The classic
 * coat is the species' own tokens. Every other coat stays light enough that
 * the flat art's dark eyes read on it.
 */
export interface Coat {
  id: string;
  name: string;
  /** The flat art's fill and patch. */
  coat: string;
  patch: string;
  /** The 3D model's main and second colours, sRGB. */
  main: string;
  second: string;
}

/** The colours the pipeline baked into each model (`scripts/3d/build.mjs`): Daylight values, held to the palette by the test. */
export const BAKED: Record<PetSpecies, { main: string; second: string }> = {
  [PetSpecies.LunaCat]: { main: "#ff8a3d", second: "#b8500f" },
  [PetSpecies.MossPup]: { main: "#a45f2a", second: "#6b3d1f" },
  [PetSpecies.CloudBun]: { main: "#fbf8f4", second: "#c7d3f2" },
};

const own = (id: string, name: string, main: string, second: string): Coat => ({ id, name, coat: main, patch: second, main, second });

export const COATS: Record<PetSpecies, readonly Coat[]> = {
  [PetSpecies.LunaCat]: [
    { id: "classic", name: "Ginger", coat: "var(--sun)", patch: "var(--sun-edge)", ...BAKED[PetSpecies.LunaCat] },
    own("snow", "Snow", "#f6f1ea", "#c9ced9"),
    own("smoke", "Smoke", "#a9aeb8", "#737a86"),
    own("honey", "Honey", "#ffcf86", "#d98d3c"),
    own("lilac", "Lilac", "#cdbbe6", "#9d88c2"),
  ],
  [PetSpecies.MossPup]: [
    { id: "classic", name: "Copper", coat: "var(--trim-copper)", patch: "var(--pet-cocoa)", ...BAKED[PetSpecies.MossPup] },
    own("golden", "Golden", "#e6b35c", "#a96c27"),
    own("cream", "Cream", "#f1e2c6", "#c49c6c"),
    own("ash", "Ash", "#b6b2ac", "#77716a"),
    own("berry", "Berry", "#e9a7a4", "#b8656c"),
  ],
  [PetSpecies.CloudBun]: [
    { id: "classic", name: "Cloud", coat: "var(--pet-cloud)", patch: "var(--pet-cloud-shade)", ...BAKED[PetSpecies.CloudBun] },
    own("cocoa", "Cocoa", "#b0805b", "#7c5235"),
    own("butter", "Butter", "#f9e2a6", "#ddb260"),
    own("mist", "Mist", "#c4cad7", "#8f98ab"),
    own("mint", "Mint", "#cfe8d6", "#8fbf9f"),
  ],
};

export function findCoat(species: PetSpecies, id: string | null | undefined): Coat {
  return COATS[species].find((coat) => coat.id === id) ?? COATS[species][0];
}

const KEY = "pawket.pet-coats.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; coats: Readonly<Record<string, string>> } | null = null;
const NONE: Readonly<Record<string, string>> = {};

function readCoats(): Readonly<Record<string, string>> {
  if (typeof window === "undefined") return NONE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Blocked storage: every pet in its classic coat.
  }
  if (cache && cache.raw === raw) return cache.coats;
  let coats: Record<string, string> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") {
      for (const [pet, id] of Object.entries(parsed)) if (typeof id === "string" && id.length <= 24 && pet.length <= 64) coats[pet] = id;
    }
  } catch {
    coats = {};
  }
  cache = { raw, coats };
  return coats;
}

/** Dress `pet` (a local id, or an address on Solana) in coat `id`. False when storage is blocked. */
export function chooseCoat(pet: string, id: string): boolean {
  const next = { ...readCoats(), [pet]: id };
  if (id === "classic") delete next[pet];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  cache = null;
  for (const listener of listeners) listener();
  return true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Each pet's coat on this device, as a lookup. The classic coat on the server
 * and the first render, so a page drawn there and here agree.
 */
export function useCoats(): (pet: { id: string; species: PetSpecies }) => Coat {
  const chosen = useSyncExternalStore(subscribe, readCoats, () => NONE);
  return (pet) => findCoat(pet.species, chosen[pet.id]);
}
