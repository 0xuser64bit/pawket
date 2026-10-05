"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "./icon";

/**
 * A toast: a short word about something that happened off to the side — a
 * send on its way, recorded, or refused — in the corner, over the page,
 * never pushing it about. Waiting stays as long as it waits; a record goes
 * by itself; a refusal stays until it is read. One store for the whole app,
 * so a send that outlives its screen still says how it ended.
 */
export interface Toast {
  id: string;
  tone: "wait" | "done" | "risk";
  title: string;
  body?: ReactNode;
  /** Milliseconds until it goes by itself; without one it stays until dismissed. */
  ttl?: number;
}

const MAX = 3;
const EMPTY: Toast[] = [];
let toasts: Toast[] = EMPTY;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function publish(next: Toast[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

/** Show `toast`, or update the one with its id in place. */
export function showToast(toast: Toast) {
  const at = toasts.findIndex((shown) => shown.id === toast.id);
  publish(at >= 0 ? toasts.map((shown, i) => (i === at ? toast : shown)) : [...toasts, toast].slice(-MAX));
  clearTimeout(timers.get(toast.id));
  timers.delete(toast.id);
  if (toast.ttl) timers.set(toast.id, setTimeout(() => dismissToast(toast.id), toast.ttl));
}

export function dismissToast(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (toasts.some((shown) => shown.id === id)) publish(toasts.filter((shown) => shown.id !== id));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Where toasts appear: once, at the end of the page. A sheet leaves it awake (`data-toasts`). */
export function Toasts() {
  const shown = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div className="pk-toasts" data-toasts aria-live="polite">
      {shown.map((toast) => (
        <div key={toast.id} className={`pk-toast pk-toast--${toast.tone}`} role={toast.tone === "risk" ? "alert" : "status"}>
          <span className="pk-toast__mark" aria-hidden="true">
            {toast.tone === "wait" ? <span className="pk-spinner" /> : <Icon name={toast.tone === "done" ? "check" : "alert"} size={14} weight={2.4} />}
          </span>
          <div className="pk-toast__words">
            <p className="pk-toast__title">{toast.title}</p>
            {toast.body ? <div className="pk-toast__body">{toast.body}</div> : null}
          </div>
          <button type="button" className="pk-toast__close" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
