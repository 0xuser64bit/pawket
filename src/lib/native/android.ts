import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * The phone around the page, when Pawket runs in its Android app
 * (`android/`): the share sheet, the gallery, the calendar, haptics, the
 * back gesture and the system bars, through `window.PawketAndroid` — which
 * the app injects into Pawket's own origin only (`PawketBridge.kt` lists
 * what it accepts). Outside the app nothing here exists: every request
 * answers that it was not made, and the page does what a browser can.
 *
 * It carries pictures, links and colours, never a key or a transaction:
 * signing is the wallet app's (Mobile Wallet Adapter) and Solana is the page's.
 */

interface Bridge {
  postMessage(message: string): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

declare global {
  interface Window {
    PawketAndroid?: Bridge;
    /** Called by the app on the system back: closes the newest open sheet, true if there was one. */
    pawketBack?: () => boolean;
  }
}

function bridge(): Bridge | null {
  return typeof window === "undefined" ? null : (window.PawketAndroid ?? null);
}

export function inAndroidApp(): boolean {
  return bridge() !== null;
}

/** True in the Android app, once hydrated: false on the server and on the first render, like `useMounted`. */
export function useAndroidApp(): boolean {
  return useSyncExternalStore(
    () => () => {},
    inAndroidApp,
    () => false,
  );
}

/** Where this device keeps what it keeps: "this app" in the Android app, "this browser" everywhere else. */
export function useHere(): { here: string; Here: string } {
  return useAndroidApp() ? { here: "this app", Here: "This app" } : { here: "this browser", Here: "This browser" };
}

/** What the app answered: `ok`, or why not. "no-app" is a browser, where nothing was asked. */
export interface Answer {
  ok: boolean;
  reason?: string;
}

const ANSWER_WAIT_MS = 15_000;
const waiting = new Map<string, (answer: Answer) => void>();
const heard = new WeakSet<Bridge>();
let asked = 0;

function ask(op: string, fields: Record<string, unknown>): Promise<Answer> {
  const app = bridge();
  if (!app) return Promise.resolve({ ok: false, reason: "no-app" });
  if (!heard.has(app)) {
    heard.add(app);
    app.addEventListener("message", ({ data }) => {
      try {
        const answer = JSON.parse(String(data)) as Answer & { id?: string };
        if (answer.id) waiting.get(answer.id)?.({ ok: answer.ok === true, reason: answer.reason });
      } catch {
        // Not an answer of ours.
      }
    });
  }
  const id = `a${++asked}`;
  return new Promise((resolve) => {
    const done = (answer: Answer) => {
      waiting.delete(id);
      window.clearTimeout(timer);
      resolve(answer);
    };
    // An answer that never comes (an older app) is a no, not a page that waits forever.
    const timer = window.setTimeout(() => done({ ok: false, reason: "no-answer" }), ANSWER_WAIT_MS);
    waiting.set(id, done);
    app.postMessage(JSON.stringify({ id, op, ...fields }));
  });
}

/** A printed photo (a PNG data URL) into the phone's share sheet. */
export function sharePicture(data: string, name: string, title: string): Promise<Answer> {
  return ask("share-image", { data, name, title });
}

/** A printed photo into the phone's gallery, under Pictures/Pawket. */
export function savePicture(data: string, name: string): Promise<Answer> {
  return ask("save-image", { data, name });
}

/** A page of Pawket's into the share sheet. The app shares only links to Pawket. */
export function shareLink(link: { url: string; text?: string; title?: string }): Promise<Answer> {
  return ask("share-link", link);
}

/** A daily reminder, opened in the phone's calendar app for the player to save; nothing is scheduled here. */
export function remindDaily(reminder: { title: string; notes: string; url: string; at: Date; days: number }): Promise<Answer> {
  return ask("remind", { ...reminder, at: reminder.at.getTime() });
}

/* -------------------------------------------------------------- haptics */

const HAPTICS_KEY = "pawket.haptics";
const hapticListeners = new Set<() => void>();

function hapticsOn(): boolean {
  try {
    return window.localStorage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

/** The app's haptics, on unless the player turned them off on this device. The phone's own setting still decides. */
export function useHaptics(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (listener) => {
      hapticListeners.add(listener);
      return () => hapticListeners.delete(listener);
    },
    hapticsOn,
    () => true,
  );
  const set = (next: boolean) => {
    try {
      if (next) window.localStorage.removeItem(HAPTICS_KEY);
      else window.localStorage.setItem(HAPTICS_KEY, "off");
    } catch {
      // Blocked storage: the choice lasts until the page reloads.
    }
    for (const listener of hapticListeners) listener();
    if (next) haptic("done");
  };
  return [on, set];
}

/**
 * One haptic, for a moment that counts: a care kept ("done"), a new level
 * ("cheer"), a care or send refused ("refuse"). Called when the thing has
 * happened — after the save, or after Solana confirmed — never while signing.
 */
export function haptic(kind: "done" | "cheer" | "refuse"): void {
  const app = bridge();
  if (!app || !hapticsOn()) return;
  app.postMessage(JSON.stringify({ op: "haptic", kind }));
}

/* ----------------------------------------------------------------- back */

const backs: Array<() => void> = [];

function closeNewest(): boolean {
  const close = backs.at(-1);
  if (!close) return false;
  close();
  return true;
}

/**
 * While the component is mounted, the phone's back gesture closes it — the
 * newest first — before it goes back a page. Does nothing in a browser.
 */
export function useBackCloses(close: () => void): void {
  const latest = useRef(close);
  useEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    if (!inAndroidApp()) return;
    const entry = () => latest.current();
    backs.push(entry);
    window.pawketBack = closeNewest;
    return () => {
      const at = backs.indexOf(entry);
      if (at >= 0) backs.splice(at, 1);
    };
  }, []);
}

/* ---------------------------------------------------------------- bars */

/** Tells the app the room's ground colour, so the status and navigation bars wear it. */
function paintBars(): void {
  const app = bridge();
  const style = getComputedStyle(document.documentElement);
  const ground = style.getPropertyValue("--ground").trim();
  if (!app || !/^#[0-9a-f]{6}$/i.test(ground)) return;
  app.postMessage(JSON.stringify({ op: "room", ground, dark: style.colorScheme.includes("dark") }));
}

/** In the app, the system bars follow the room: a pick (`data-theme`), or the device's light or dark. */
export function useBarsFollowRoom(): void {
  useEffect(() => {
    if (!inAndroidApp()) return;
    paintBars();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", paintBars);
    const picks = new MutationObserver(paintBars);
    picks.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      media.removeEventListener("change", paintBars);
      picks.disconnect();
    };
  }, []);
}
