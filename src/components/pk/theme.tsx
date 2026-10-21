"use client";

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

function readChoice(): ThemeChoice {
  const picked = document.documentElement.dataset.theme;
  return isThemeId(picked) ? picked : "system";
}

function readScheme(): "light" | "dark" {
  return getComputedStyle(document.documentElement).colorScheme.includes("dark") ? "dark" : "light";
}

export function useTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, readScheme, () => "light" as const);
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system" as const);
}

export function useToken(name: `--${string}`, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
    () => fallback,
  );
}

export function setTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const apply = () => {
    if (choice === "system") delete root.dataset.theme;
    else root.dataset.theme = choice;
    try {
      if (choice === "system") window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, choice);
    } catch {}
    const ground = getComputedStyle(root).getPropertyValue("--ground").trim();
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = ground;
    // Synchronously: the view transition snapshots the page as this callback leaves it.
    flushSync(() => {
      for (const listener of listeners) listener();
    });
  };
  if ("startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const root = document.documentElement;
    root.dataset.transition = "room";
    document.startViewTransition(apply).finished.finally(() => delete root.dataset.transition);
  } else {
    apply();
  }
}

const named = (id: ThemeId) => THEMES.find((theme) => theme.id === id)!;

function roomInForce(choice: ThemeChoice, scheme: "light" | "dark") {
  return named(choice === "system" ? (scheme === "dark" ? "dark" : "light") : choice);
}

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
          <span className="caption pk-muted">Light, or Dark when your device is dark.</span>
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
        ) : null,
      )}
    </div>
  );
}

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
      title={`${current.name} → ${next.name}`}
      onClick={() => setTheme(next.id)}
    >
      <span className="pk-theme-dot" data-theme-preview={current.id} aria-hidden="true" />
    </button>
  );
}
