import { DEFAULT_LOOK, lookSchema, parseLook, type PlayerLook } from "./look";

const STORAGE_KEY = "pawket.player-look.v1";

const listeners = new Set<() => void>();
let cache: { raw: string | null; look: PlayerLook } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readLookSnapshot(): PlayerLook {
  if (typeof window === "undefined") return DEFAULT_LOOK;
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.look;
  let look = DEFAULT_LOOK;
  if (raw) {
    try {
      look = parseLook(JSON.parse(raw));
    } catch {
      look = DEFAULT_LOOK;
    }
  }
  cache = { raw, look };
  return look;
}

export function saveLook(look: PlayerLook): boolean {
  if (typeof window === "undefined" || !lookSchema.safeParse(look).success) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
  } catch {
    return false;
  }
  cache = null;
  for (const listener of listeners) listener();
  return true;
}

export function subscribeLook(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
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
