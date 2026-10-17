"use client";

import { useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import type { GuestPet } from "@/lib/guest/pet";
import type { GameId } from "@/lib/play/best";

/**
 * Pawket's counts of its own loop: how many pets are adopted, cared for and
 * played with, how many come back the next day and the next week, and how far
 * the road onto Solana gets. Counted by Vercel Web Analytics, which sets no
 * cookie and keeps no profile; every property here is one of a few fixed
 * words, never a name, an address, a signature, a score or free text, so no
 * event can say who did it. A player turns counting off in Settings (page
 * views included), and a browser that sends Global Privacy Control or Do
 * Not Track is never counted. `docs/DECISIONS.md` says how to read them.
 */

/** Days, as a few ranges: enough to see a return, never a date. */
export type Days = "0" | "1" | "2-6" | "7-13" | "14-29" | "30+";
export type Where = "browser" | "solana";
type CareKey = `${import("@/lib/game/enums").CareActionType}`;
export type SendKind = "care" | "round" | "dress" | "adopt" | "guild" | "gathering" | "wave" | "market" | "coin" | "keepsake" | "wallet";
export type SendOutcome = "confirmed" | "unknown" | "declined" | "needs-wallet" | "refused" | "failed";

export type PawketEvent =
  | { name: "pet_adopted" }
  | { name: "care_saved"; where: Where; action: CareKey }
  | { name: "round_finished"; where: Where; game: GameId }
  /** Once a UTC day per browser: how old its oldest pet is, and how long since any care. */
  | { name: "home_opened"; petAge: Days; sinceCare: Days | "never" }
  | { name: "keep_started" }
  | { name: "keep_blocked"; reason: "no-wallet" | "needs-wallet" | "name-taken" }
  | { name: "keep_confirmed" }
  | { name: "wallet_linked"; deposit: "none" | "some" }
  | { name: "device_link_failed"; reason: "webview" | "storage" | "other" }
  | { name: "send_outcome"; kind: SendKind; outcome: SendOutcome }
  | { name: "reminder_added"; platform: "web" | "android" }
  | { name: "pets_copied"; how: "file" | "text" }
  | { name: "pets_brought_back" };

const DAY = 86_400_000;
export function daysBucket(ms: number): Days {
  const days = Math.max(0, Math.floor(ms / DAY));
  return days === 0 ? "0" : days === 1 ? "1" : days <= 6 ? "2-6" : days <= 13 ? "7-13" : days <= 29 ? "14-29" : "30+";
}

const OFF_KEY = "pawket.counts";
const listeners = new Set<() => void>();

/** Whether this browser asks not to be counted: Global Privacy Control or Do Not Track. */
function browserDeclines(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

function playerDeclines(): boolean {
  try {
    return window.localStorage.getItem(OFF_KEY) === "off";
  } catch {
    return false;
  }
}

/** Whether Pawket counts anything in this browser, page views included. */
export function counting(): boolean {
  return typeof window !== "undefined" && !browserDeclines() && !playerDeclines();
}

/** The Settings switch: whether counting is on, whether the browser itself declines, and the setter. */
export function useCounting(): { on: boolean; browserDeclines: boolean; set: (on: boolean) => void } {
  const on = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    counting,
    () => false,
  );
  return {
    on,
    browserDeclines: typeof navigator !== "undefined" && browserDeclines(),
    set: (next) => {
      try {
        if (next) window.localStorage.removeItem(OFF_KEY);
        else window.localStorage.setItem(OFF_KEY, "off");
      } catch {
        // Blocked storage: the choice cannot be kept, and counting already stops there for the visit.
      }
      for (const listener of listeners) listener();
    },
  };
}

/** Count one moment of the loop. Never throws, never on the server, never when declined. */
export function record(event: PawketEvent): void {
  if (!counting()) return;
  const { name, ...data } = event;
  try {
    track(name, data);
  } catch {
    // Counting is never in the way of the game.
  }
}

const OPENED_KEY = "pawket.counted-day";

/**
 * Home opened, counted once a UTC day per browser: how old the oldest pet
 * is and how long since any care. Read across days it shows who returns —
 * pets a day old opening Home are day-one returns — with no one identified.
 */
export function recordHomeOpened(pets: readonly GuestPet[], now = Date.now()): void {
  if (!counting() || pets.length === 0) return;
  const day = new Date(now).toISOString().slice(0, 10);
  try {
    if (window.localStorage.getItem(OPENED_KEY) === day) return;
    window.localStorage.setItem(OPENED_KEY, day);
  } catch {
    return;
  }
  const born = Math.min(...pets.map((pet) => Date.parse(pet.createdAt)));
  const cared = Math.max(...pets.flatMap((pet) => Object.values(pet.lastActionAt).flatMap((at) => (at ? [Date.parse(at)] : []))));
  record({ name: "home_opened", petAge: daysBucket(now - born), sinceCare: Number.isFinite(cared) ? daysBucket(now - cared) : "never" });
}

/** A run of base58 as long as a Solana address or longer: never sent in a page's address. */
const ADDRESS = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

/** The page address Vercel receives: no query, no fragment, no Solana address. */
export function plainUrl(url: string): string {
  try {
    const { origin, pathname } = new URL(url);
    return origin + pathname.replace(ADDRESS, "[address]");
  } catch {
    return url;
  }
}
