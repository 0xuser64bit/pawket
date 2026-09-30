"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icon";

type Theme = "light" | "dark";
const KEY = "pawket.theme";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

/** The document is the store: the pre-paint script has already applied it. */
function readTheme(): Theme {
  const picked = document.documentElement.dataset.theme;
  if (picked === "dark" || picked === "light") return picked;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme in force: a player's pick, or the system's. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
}

/** A token's value in the theme in force, read from the page, not from a copy. */
export function useToken(name: `--${string}`, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
    () => fallback,
  );
}

/**
 * Lamplight is the same room after dark, not a re-skin. The control names
 * the room you are switching to, so it never depends on an icon alone.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const toDark = theme !== "dark";

  function swap() {
    const next: Theme = toDark ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // A blocked store only means the choice does not survive a reload.
    }
    for (const listener of listeners) listener();
  }

  return (
    <button type="button" className="pk-btn pk-btn--quiet pk-btn--sm" onClick={swap}>
      <Icon name={toDark ? "clock" : "spark"} size={14} />
      <span>{toDark ? "Lamplight" : "Daylight"}</span>
    </button>
  );
}
