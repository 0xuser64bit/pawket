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

function write(pets: GuestPet[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
    return true;
  } catch {
    // Storage full or blocked (private mode). The caller has to say so —
    // a silent save is how a player loses a pet they think they kept.
    return false;
  }
}

/** Each stored blob as a pet, damaged ones dropped, one entry per id. */
function parse(raw: unknown): GuestPet[] {
  if (!Array.isArray(raw)) return NONE;
  const seen = new Set<string>();
  const pets: GuestPet[] = [];
  for (const item of raw) {
    const pet = migrateStoredPet(item);
    if (pet && !seen.has(pet.id)) {
      seen.add(pet.id);
      pets.push(pet);
    }
  }
  return pets;
}

/** Null means storage could not be read; mutations must not replace it with an empty list. */
function loadStoredPets(): GuestPet[] | null {
  if (typeof window === "undefined") return NONE;
  const raw = read(STORAGE_KEY);
  if (raw === undefined) return null;
  if (raw !== null) {
    try {
      return parse(JSON.parse(raw));
    } catch {
      remove(STORAGE_KEY);
      return NONE;
    }
  }
  // The one pet from before, moved into the list.
  const legacy = read(LEGACY_KEY);
  if (legacy === undefined) return null;
  if (legacy === null) return NONE;
  let pet: GuestPet | null = null;
  try {
    pet = migrateStoredPet(JSON.parse(legacy));
  } catch {
    pet = null;
  }
  if (!pet) {
    remove(LEGACY_KEY);
    return NONE;
  }
  if (write([pet])) remove(LEGACY_KEY);
  return [pet];
}

/** The pets in this browser. Empty when none, corrupt, inaccessible, or server-side. */
export function loadPets(): GuestPet[] {
  return loadStoredPets() ?? NONE;
}

/**
 * Keep a pet: replaced in place when its id is already here, else added at
 * the end. False when storage is blocked or the record is invalid.
 */
export function savePet(pet: GuestPet): boolean {
  if (typeof window === "undefined") return false;
  if (!guestPetSchema.safeParse(pet).success) return false;
  const pets = loadStoredPets();
  if (!pets) return false;
  const at = pets.findIndex((p) => p.id === pet.id);
  const next = at < 0 ? [...pets, pet] : pets.map((p, i) => (i === at ? pet : p));
  if (!write(next)) return false;
  notify();
  return true;
}

/** Let one pet go from this browser. The others stay as they are. */
export function removePet(id: string): boolean {
  if (typeof window === "undefined") return false;
  const pets = loadStoredPets();
  if (!pets) return false;
  if (!pets.some((p) => p.id === id)) return true;
  if (!write(pets.filter((p) => p.id !== id))) return false;
  notify();
  return true;
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
  const pets = loadStoredPets();
  if (!pets) return snapshot?.pets ?? NONE;
  // A legacy move writes the list, so cache against what is stored now.
  snapshot = { raw: read(STORAGE_KEY) ?? null, pets };
  return pets;
}
