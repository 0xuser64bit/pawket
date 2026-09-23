import { guestPetSchema, migrateStoredPet, type GuestPet } from "./pet";

const STORAGE_KEY = "pawket.guest-pet.v1";

/** Load the persisted guest pet. Null when absent, corrupt, or server-side. */
export function loadGuestPet(): GuestPet | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStored();
    return null;
  }
  const pet = migrateStoredPet(parsed);
  if (!pet) {
    removeStored();
    return null;
  }
  return pet;
}

function removeStored(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ponytail: absence is the desired end state anyway.
  }
}

/** Persist a pet. False when storage is blocked or the record is invalid. */
export function saveGuestPet(pet: GuestPet): boolean {
  if (typeof window === "undefined") return false;
  if (!guestPetSchema.safeParse(pet).success) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
  } catch {
    // Storage full or blocked (private mode). The caller has to say so —
    // a silent save is how a player loses a pet they think they kept.
    return false;
  }
  notifyGuestPetListeners();
  return true;
}

export function clearGuestPet(): void {
  if (typeof window === "undefined") return;
  removeStored();
  notifyGuestPetListeners();
}

type GuestPetListener = () => void;

const listeners = new Set<GuestPetListener>();

function notifyGuestPetListeners(): void {
  for (const listener of listeners) listener();
  snapshotCache = null;
}

/** Subscribe to guest-pet changes (same-tab saves + other-tab storage events). */
export function subscribeGuestPet(listener: GuestPetListener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        snapshotCache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

let snapshotCache: { raw: string | null; pet: GuestPet | null } | null = null;

/**
 * Cached snapshot for `useSyncExternalStore` — returns a stable reference
 * while the stored string is unchanged (required to avoid render loops).
 */
export function readGuestPetSnapshot(): GuestPet | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (snapshotCache && snapshotCache.raw === raw) return snapshotCache.pet;
  const pet = loadGuestPet();
  snapshotCache = { raw, pet };
  return pet;
}
