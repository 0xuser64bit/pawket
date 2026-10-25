import { guestPetSchema, migrateStoredPet, type GuestPet } from "./pet";

const STORAGE_KEY = "pawket.pets.v1";
const LEGACY_KEY = "pawket.guest-pet.v1";
const UNREADABLE_KEY = "pawket.pets.v1.unreadable";

const NONE: GuestPet[] = [];

function read(key: string): string | null | undefined {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return undefined;
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function write(pets: GuestPet[], kept: readonly unknown[] = []): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...pets, ...kept]));
    return true;
  } catch {
    return false;
  }
}

interface Stored {
  pets: GuestPet[];
  kept: unknown[];
}

const EMPTY: Stored = { pets: NONE, kept: [] };

function parse(raw: unknown[]): Stored {
  const seen = new Set<string>();
  const pets: GuestPet[] = [];
  const kept: unknown[] = [];
  for (const item of raw) {
    const pet = migrateStoredPet(item);
    if (!pet) kept.push(item);
    else if (!seen.has(pet.id)) {
      seen.add(pet.id);
      pets.push(pet);
    }
  }
  return { pets, kept };
}

function setAside(raw: string): void {
  try {
    window.localStorage.setItem(`${UNREADABLE_KEY}.${Date.now()}`, raw);
  } catch {
    return;
  }
  remove(STORAGE_KEY);
}

function loadStored(): Stored | null {
  if (typeof window === "undefined") return EMPTY;
  const raw = read(STORAGE_KEY);
  if (raw === undefined) return null;
  if (raw !== null) {
    let list: unknown;
    try {
      list = JSON.parse(raw);
    } catch {
      list = undefined;
    }
    if (Array.isArray(list)) return parse(list);
    setAside(raw);
    return read(STORAGE_KEY) === null ? EMPTY : null;
  }
  const legacy = read(LEGACY_KEY);
  if (legacy === undefined) return null;
  if (legacy === null) return EMPTY;
  let pet: GuestPet | null = null;
  try {
    pet = migrateStoredPet(JSON.parse(legacy));
  } catch {
    pet = null;
  }
  if (!pet) {
    remove(LEGACY_KEY);
    return EMPTY;
  }
  if (write([pet])) remove(LEGACY_KEY);
  return { pets: [pet], kept: [] };
}

export function loadPets(): GuestPet[] {
  return loadStored()?.pets ?? NONE;
}

export function savePet(pet: GuestPet): boolean {
  if (typeof window === "undefined") return false;
  if (!guestPetSchema.safeParse(pet).success) return false;
  const stored = loadStored();
  if (!stored) return false;
  const { pets, kept } = stored;
  const at = pets.findIndex((p) => p.id === pet.id);
  const next = at < 0 ? [...pets, pet] : pets.map((p, i) => (i === at ? pet : p));
  if (!write(next, kept)) return false;
  notify();
  return true;
}

export function removePet(id: string): boolean {
  if (typeof window === "undefined") return false;
  const stored = loadStored();
  if (!stored) return false;
  const { pets, kept } = stored;
  if (!pets.some((p) => p.id === id)) return true;
  if (!write(pets.filter((p) => p.id !== id), kept)) return false;
  notify();
  return true;
}

export interface Brought {
  added: GuestPet[];
  updated: GuestPet[];
  same: number;
}

export function bringBackPets(incoming: readonly GuestPet[]): Brought | null {
  if (typeof window === "undefined") return null;
  const stored = loadStored();
  if (!stored) return null;
  const pets = [...stored.pets];
  const result: Brought = { added: [], updated: [], same: 0 };
  for (const pet of incoming) {
    if (!guestPetSchema.safeParse(pet).success) continue;
    const at = pets.findIndex((p) => p.id === pet.id);
    if (at < 0) {
      pets.push(pet);
      result.added.push(pet);
    } else if (Date.parse(pet.statsUpdatedAt) > Date.parse(pets[at].statsUpdatedAt)) {
      pets[at] = pet;
      result.updated.push(pet);
    } else {
      result.same++;
    }
  }
  if (result.added.length || result.updated.length) {
    if (!write(pets, stored.kept)) return null;
    notify();
  }
  return result;
}

export function readPet(id: string): GuestPet | null {
  return loadPets().find((p) => p.id === id) ?? null;
}

const listeners = new Set<() => void>();

function notify(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function subscribePets(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_KEY || event.key === null) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

let snapshot: { raw: string | null; pets: GuestPet[] } | null = null;

export function readPetsSnapshot(): GuestPet[] {
  if (typeof window === "undefined") return NONE;
  const raw = read(STORAGE_KEY);
  if (raw === undefined) return snapshot?.pets ?? NONE;
  if (snapshot && snapshot.raw === raw) return snapshot.pets;
  const stored = loadStored();
  if (!stored) return snapshot?.pets ?? NONE;
  snapshot = { raw: read(STORAGE_KEY) ?? null, pets: stored.pets };
  return stored.pets;
}
