"use client";

import { useSyncExternalStore } from "react";
import type { PetSpecies } from "@/lib/game/enums";
import { findCoat, type Coat } from "./coats";

const KEY = "pawket.pet-coats.v1";
const listeners = new Set<() => void>();
let cache: { raw: string | null; coats: Readonly<Record<string, string>> } | null = null;
const NONE: Readonly<Record<string, string>> = {};

function readCoats(): Readonly<Record<string, string>> {
  if (typeof window === "undefined") return NONE;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {}
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

export function readCoatChoices(): Readonly<Record<string, string>> {
  return readCoats();
}

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

export function useCoats(): (pet: { id: string; species: PetSpecies }) => Coat {
  const chosen = useSyncExternalStore(subscribe, readCoats, () => NONE);
  return (pet) => findCoat(pet.species, chosen[pet.id]);
}
