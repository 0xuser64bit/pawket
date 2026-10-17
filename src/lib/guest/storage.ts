import { guestPetSchema, migrateStoredPet, type GuestPet } from "./pet";

/**
 * The pets kept in this browser: a list, oldest first, as many as the
 * player adopts. Each is the same record a single pet always was.
 *
 * Before a browser could keep more than one, the pet lived alone under
 * `LEGACY_KEY`. The first read moves it into the list, so nobody loses a pet
 * to the upgrade; the old key goes only once the list has been written.
 */
const STORAGE_KEY = "pawket.pets.v1";
const LEGACY_KEY = "pawket.guest-pet.v1";
/** Where a list this version cannot read at all is set aside, never deleted, one key per time it happened. */
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
  } catch {
    // Inaccessible storage retains the safe read fallback.
  }
}

function write(pets: GuestPet[], kept: readonly unknown[] = []): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...pets, ...kept]));
    return true;
  } catch {
    // Storage full or blocked (private mode). The caller has to say so —
    // a silent save is how a player loses a pet they think they kept.
    return false;
  }
}

interface Stored {
  pets: GuestPet[];
  /**
   * Entries this version cannot read — a newer release's species, say, seen by
   * a tab left open across a deploy, or a damaged one — written back as they
   * were on every save, so an older page never deletes a pet it cannot draw.
   */
  kept: unknown[];
}

const EMPTY: Stored = { pets: NONE, kept: [] };

/** Each stored blob as a pet, one entry per id; what cannot be read is kept aside, verbatim. */
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

/** Set a list this version cannot read aside before starting a new one, so it can still be recovered. */
function setAside(raw: string): void {
  try {
    window.localStorage.setItem(`${UNREADABLE_KEY}.${Date.now()}`, raw);
  } catch {
    // Storage full or blocked: the list stays where it is, unread, and nothing is written over it.
    return;
  }
  remove(STORAGE_KEY);
}

/** Null means storage could not be read; mutations must not replace it with an empty list. */
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
  // The one pet from before, moved into the list.
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

/** The pets in this browser. Empty when none, corrupt, inaccessible, or server-side. */
export function loadPets(): GuestPet[] {
  return loadStored()?.pets ?? NONE;
}

/**
 * Keep a pet: replaced in place when its id is already here, else added at
 * the end. False when storage is blocked or the record is invalid.
 */
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

/** Let one pet go from this browser. The others stay as they are. */
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
  /** Pets that were not here, now added. */
  added: GuestPet[];
  /** Pets that were here, replaced by a copy with later care. */
  updated: GuestPet[];
  /** Pets already here as new as the copy, left as they were. */
  same: number;
}

/**
 * Pets from a saved copy, in one write: a pet not here is added; one here
 * already is replaced only by a copy whose vitals were saved later. Null when
 * storage cannot be read or written — then nothing changed.
 */
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

/** One pet in this browser, read fresh — for a care, so it starts from what was last saved. */
export function readPet(id: string): GuestPet | null {
  return loadPets().find((p) => p.id === id) ?? null;
}

const listeners = new Set<() => void>();

function notify(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

/** Subscribe to changes (same-tab saves + other-tab storage events). */
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

/**
 * Cached snapshot for `useSyncExternalStore` — the same array while the
 * stored string is unchanged (required to avoid render loops).
 */
export function readPetsSnapshot(): GuestPet[] {
  if (typeof window === "undefined") return NONE;
  const raw = read(STORAGE_KEY);
  if (raw === undefined) return snapshot?.pets ?? NONE;
  if (snapshot && snapshot.raw === raw) return snapshot.pets;
  const stored = loadStored();
  if (!stored) return snapshot?.pets ?? NONE;
  // A legacy move writes the list, so cache against what is stored now.
  snapshot = { raw: read(STORAGE_KEY) ?? null, pets: stored.pets };
  return stored.pets;
}
