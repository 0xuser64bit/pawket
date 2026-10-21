"use client";

import { useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";
import type { GuestPet } from "@/lib/guest/pet";
import type { GameId } from "@/lib/play/best";

export type Days = "0" | "1" | "2-6" | "7-13" | "14-29" | "30+";
export type Where = "browser" | "solana";
type CareKey = `${import("@/lib/game/enums").CareActionType}`;
export type SendKind = "care" | "round" | "dress" | "adopt" | "guild" | "gathering" | "wave" | "market" | "coin" | "keepsake" | "wallet";
export type SendOutcome = "confirmed" | "unknown" | "declined" | "needs-wallet" | "refused" | "failed";

export type PawketEvent =
  | { name: "pet_adopted" }
  | { name: "care_saved"; where: Where; action: CareKey }
  | { name: "round_finished"; where: Where; game: GameId }
  | { name: "home_opened"; petAge: Days; sinceCare: Days | "never" }
  | { name: "keep_started" }
  | { name: "keep_blocked"; reason: "no-wallet" | "needs-wallet" | "name-taken" }
  | { name: "keep_confirmed" }
  | { name: "wallet_linked"; deposit: "none" | "some" }
  | { name: "device_link_failed"; reason: "webview" | "storage" | "other" }
  | { name: "send_outcome"; kind: SendKind; outcome: SendOutcome }
  | { name: "reminder_added"; platform: "web" | "android"; how: "calendar" | "care" }
  | { name: "pets_copied"; how: "file" | "text" }
  | { name: "pets_brought_back" };

const DAY = 86_400_000;
export function daysBucket(ms: number): Days {
  const days = Math.max(0, Math.floor(ms / DAY));
  return days === 0 ? "0" : days === 1 ? "1" : days <= 6 ? "2-6" : days <= 13 ? "7-13" : days <= 29 ? "14-29" : "30+";
}

const OFF_KEY = "pawket.counts";
const listeners = new Set<() => void>();

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

export function counting(): boolean {
  return typeof window !== "undefined" && !browserDeclines() && !playerDeclines();
}

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
      } catch {}
      for (const listener of listeners) listener();
    },
  };
}

export function record(event: PawketEvent): void {
  if (!counting()) return;
  const { name, ...data } = event;
  try {
    track(name, data);
  } catch {}
}

const OPENED_KEY = "pawket.counted-day";

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

const ADDRESS = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

export function plainUrl(url: string): string {
  try {
    const { origin, pathname } = new URL(url);
    return origin + pathname.replace(ADDRESS, "[address]");
  } catch {
    return url;
  }
}

export function reportError(error: Error & { digest?: string }): void {
  if (!counting()) return;
  try {
    void fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, name: error.name, message: String(error.message).slice(0, 1000), digest: error.digest }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
