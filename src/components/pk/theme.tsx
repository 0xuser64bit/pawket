"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { THEMES, THEME_KEY, isThemeId, roomOpen, type ThemeChoice, type ThemeId } from "@/config/themes";
import { PetArt, type PetForm } from "./pet-art";

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

/** The document is the store: the pre-paint script has already applied the pick. */
function readChoice(): ThemeChoice {
  const picked = document.documentElement.dataset.theme;
  return isThemeId(picked) ? picked : "system";
}

function readScheme(): "light" | "dark" {
  return getComputedStyle(document.documentElement).colorScheme.includes("dark") ? "dark" : "light";
}

/** Whether the room in force is a day room or an evening one. The 3D room lights the lantern for an evening. */
export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, readScheme, () => "light" as const);
}

/** The player's pick, or "system" when the room follows the device. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system" as const);
}

/** A token's value in the theme in force, read from the page, not from a copy. */
export function useToken(name: `--${string}`, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
    () => fallback,
  );
}

/** Move into a room. Remembered on this device; a blocked store keeps it until a reload. */
export function setTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const apply = () => {
    if (choice === "system") delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === "system") window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, choice);
    } catch {
      // A blocked store only means the choice does not survive a reload.
    }
    // The browser's own chrome takes the room's ground.
    const ground = getComputedStyle(root).getPropertyValue("--ground").trim();
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = ground;
    // Drawn now, inside the transition, so its new picture has the new room in it.
    flushSync(() => {
      for (const listener of listeners) listener();
    });
  };
  // The whole page crossfades into the new room where the browser can, and
  // simply changes where it cannot or motion is reduced.
  if ("startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
}

const named = (id: ThemeId) => THEMES.find((theme) => theme.id === id)!;

/** The room shown when nothing is picked: the device decides between these two. */
function roomInForce(choice: ThemeChoice, scheme: "light" | "dark") {
  return named(choice === "system" ? (scheme === "dark" ? "dark" : "light") : choice);
}

/**
 * A room in its own colours: the ground, a card on it, the sun and a pet,
 * drawn with the theme's tokens (the element carries `data-theme-preview`),
 * so what a player sees here is exactly what they will get.
 */
function Swatch({ id, form = "cat" }: { id: ThemeId; form?: PetForm }) {
  return (
    <span className="pk-swatch-room" data-theme-preview={id} aria-hidden="true">
      <span className="pk-swatch-room__card">
        <span className="pk-swatch-room__sun" />
        <span className="pk-swatch-room__grow" />
      </span>
      <span className="pk-swatch-room__pet">
        <PetArt form={form} temper="cozy" feeling="happy" still pose="full" />
      </span>
    </span>
  );
}

const NOTHING_OWNED: ReadonlySet<number> = new Set();

/**
 * Every room, as a radio group of drawn previews — native radios, so the
 * arrow keys move the pick and Tab leaves the group. "Follow my device" is
 * the first choice and the default. A Market room the closet (`owned`, item
 * ids) does not hold yet is a way to the Market, never a free pick.
 */
export function ThemePicker({
  form,
  name = "pawket-theme",
  owned = NOTHING_OWNED,
}: {
  form?: PetForm;
  name?: string;
  owned?: ReadonlySet<number>;
}) {
  const choice = useThemeChoice();
  return (
    <div className="pk-themes" role="radiogroup" aria-label="Rooms">
      <label className="pk-theme">
        <input type="radio" name={name} className="pk-sr" checked={choice === "system"} onChange={() => setTheme("system")} />
        <span className="pk-theme__art pk-theme__art--split">
          <Swatch id="light" form={form} />
          <Swatch id="dark" form={form} />
        </span>
        <span className="pk-theme__words">
          <span className="title">Follow my device</span>
          <span className="caption pk-muted">Daylight, or Lamplight when the device is dark.</span>
        </span>
      </label>
      {THEMES.map((theme) =>
        roomOpen(theme.id, owned) ? (
          <label key={theme.id} className="pk-theme">
            <input
              type="radio"
              name={name}
              className="pk-sr"
              checked={choice === theme.id}
              onChange={() => setTheme(theme.id)}
            />
            <span className="pk-theme__art">
              <Swatch id={theme.id} form={form} />
            </span>
            <span className="pk-theme__words">
              <span className="title">{theme.name}</span>
              <span className="caption pk-muted">{theme.line}</span>
            </span>
          </label>
        ) : (
          <Link key={theme.id} href="/market" className="pk-theme pk-theme--market">
            <span className="pk-theme__art">
              <Swatch id={theme.id} form={form} />
            </span>
            <span className="pk-theme__words">
              <span className="title">{theme.name}</span>
              <span className="caption pk-muted">{theme.line} In the Market.</span>
            </span>
          </Link>
        ),
      )}
    </div>
  );
}

/**
 * The shell's room switch: names the room you are in, and a tap moves into
 * the next one — every free room, and the Market rooms the closet (`owned`)
 * holds. No menu: the name on the button is the whole story, and "Follow my
 * device" lives with the other rooms in Settings.
 */
export function ThemeButton({ owned = NOTHING_OWNED }: { owned?: ReadonlySet<number> }) {
  const choice = useThemeChoice();
  const scheme = useTheme();
  const current = roomInForce(choice, scheme);
  const open = THEMES.filter((room) => roomOpen(room.id, owned));
  const next = open[(open.findIndex((room) => room.id === current.id) + 1) % open.length];
  return (
    <button
      type="button"
      className="pk-btn pk-btn--quiet pk-btn--sm pk-theme-button"
      aria-label={`Room: ${current.name}. Move to ${next.name}`}
      onClick={() => setTheme(next.id)}
    >
      <span className="pk-theme-dot" data-theme-preview={current.id} aria-hidden="true" />
      <span>{current.name}</span>
    </button>
  );
}
