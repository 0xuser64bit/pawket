"use client";

import { useSyncExternalStore } from "react";
import type { PetSpecies } from "@/lib/game/enums";
import { findCoat, type Coat } from "./coats";

/**
 * Each pet's coat on this device (`coats.ts` is the catalog): a pet's id, a
 * local id or an address on Solana, to a coat id. The classic coat is the
 * absence of a choice.
 */
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

/** Every coat chosen on this device, by pet: what a copy of the pets carries. */
export function readCoatChoices(): Readonly<Record<string, string>> {
  return readCoats();
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
