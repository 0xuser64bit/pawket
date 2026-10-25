import { useEffect, useRef, useSyncExternalStore } from "react";
import type { CareReminder } from "@/lib/reminders/care";

interface Bridge {
  postMessage(message: string): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
}

declare global {
  interface Window {
    PawketAndroid?: Bridge;
    pawketBack?: () => boolean;
  }
}

function bridge(): Bridge | null {
  return typeof window === "undefined" ? null : (window.PawketAndroid ?? null);
}

export function inAndroidApp(): boolean {
  return bridge() !== null;
}

export function useAndroidApp(): boolean {
  return useSyncExternalStore(
    () => () => {},
    inAndroidApp,
    () => false,
  );
}

export function useHere(): { here: string; Here: string } {
  return useAndroidApp() ? { here: "this app", Here: "This app" } : { here: "this browser", Here: "This browser" };
}

export interface Answer {
  ok: boolean;
  reason?: string;
}

const ANSWER_WAIT_MS = 15_000;
const waiting = new Map<string, (answer: Answer) => void>();
const heard = new WeakSet<Bridge>();
let asked = 0;

function ask(op: string, fields: Record<string, unknown>, wait = ANSWER_WAIT_MS): Promise<Answer> {
  const app = bridge();
  if (!app) return Promise.resolve({ ok: false, reason: "no-app" });
  if (!heard.has(app)) {
    heard.add(app);
    app.addEventListener("message", ({ data }) => {
      try {
        const answer = JSON.parse(String(data)) as Answer & { id?: string };
        if (answer.id) waiting.get(answer.id)?.({ ok: answer.ok === true, reason: answer.reason });
      } catch {}
    });
  }
  const id = `a${++asked}`;
  return new Promise((resolve) => {
    const done = (answer: Answer) => {
      waiting.delete(id);
      window.clearTimeout(timer);
      resolve(answer);
    };
    const timer = window.setTimeout(() => done({ ok: false, reason: "no-answer" }), wait);
    waiting.set(id, done);
    try {
      app.postMessage(JSON.stringify({ id, op, ...fields }));
    } catch {
      done({ ok: false, reason: "no-answer" });
    }
  });
}

export function sharePicture(data: string, name: string, title: string): Promise<Answer> {
  return ask("share-image", { data, name, title });
}

export function savePicture(data: string, name: string): Promise<Answer> {
  return ask("save-image", { data, name });
}

export function shareCard(card: { data: string; name: string; title: string; url: string; text?: string }): Promise<Answer> {
  return ask("share-card", card);
}

export function shareLink(link: { url: string; text?: string; title?: string }): Promise<Answer> {
  return ask("share-link", link);
}

export function remindDaily(reminder: { title: string; notes: string; url: string; at: Date; days: number }): Promise<Answer> {
  return ask("remind", { ...reminder, at: reminder.at.getTime() });
}

const REMINDERS_KEY = "pawket.care-reminders";
const reminderListeners = new Set<() => void>();
const ALLOW_WAIT_MS = 120_000;

function remindersOn(): boolean {
  try {
    return window.localStorage.getItem(REMINDERS_KEY) === "on";
  } catch {
    return false;
  }
}

function keepReminders(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(REMINDERS_KEY, "on");
    else window.localStorage.removeItem(REMINDERS_KEY);
  } catch {}
  for (const listener of reminderListeners) listener();
}

export function useCareReminders(): [boolean, (on: boolean) => Promise<Answer>] {
  const on = useSyncExternalStore(
    (listener) => {
      reminderListeners.add(listener);
      return () => reminderListeners.delete(listener);
    },
    remindersOn,
    () => false,
  );
  const set = async (next: boolean) => {
    if (!next) {
      keepReminders(false);
      return ask("care-reminder", { on: false });
    }
    const answer = await ask("allow-reminders", {}, ALLOW_WAIT_MS);
    if (answer.ok) keepReminders(true);
    return answer;
  };
  return [on, set];
}

export async function setCareReminder(reminder: CareReminder | null): Promise<void> {
  if (!remindersOn()) return;
  const answer = await ask(
    "care-reminder",
    reminder ? { on: true, at: reminder.at.getTime(), title: reminder.title, text: reminder.text } : { on: false },
  );
  if (answer.reason === "not-allowed") keepReminders(false);
}

const HAPTICS_KEY = "pawket.haptics";
const hapticListeners = new Set<() => void>();

function hapticsOn(): boolean {
  try {
    return window.localStorage.getItem(HAPTICS_KEY) !== "off";
  } catch {
    return true;
  }
}

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
    } catch {}
    for (const listener of hapticListeners) listener();
    if (next) haptic("done");
  };
  return [on, set];
}

export function haptic(kind: "done" | "cheer" | "refuse" | "tap"): void {
  const app = bridge();
  if (!app || !hapticsOn()) return;
  try {
    app.postMessage(JSON.stringify({ op: "haptic", kind }));
  } catch {}
}

const backs: Array<() => void> = [];

function closeNewest(): boolean {
  const close = backs.at(-1);
  if (!close) return false;
  close();
  return true;
}

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

function paintBars(): void {
  const app = bridge();
  const style = getComputedStyle(document.documentElement);
  const ground = style.getPropertyValue("--ground").trim();
  if (!app || !/^#[0-9a-f]{6}$/i.test(ground)) return;
  try {
    app.postMessage(JSON.stringify({ op: "room", ground, dark: style.colorScheme.includes("dark") }));
  } catch {}
}

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
