"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./icon";

export interface Toast {
  id: string;
  tone: "wait" | "done" | "risk" | "note";
  title: string;
  body?: ReactNode;
  ttl?: number;
}

type Shown = Toast & { leaving?: boolean };

const MAX = 3;
const LEAVE_MS = 200;
const EMPTY: Shown[] = [];
let toasts: Shown[] = EMPTY;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function publish(next: Shown[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

const EVICT_FIRST: ReadonlyArray<Toast["tone"]> = ["done", "note", "risk", "wait"];
function admit(list: Shown[]): Shown[] {
  const next = [...list];
  while (next.filter((shown) => !shown.leaving).length > MAX) {
    const victim = EVICT_FIRST.map((tone) => next.findIndex((shown) => shown.tone === tone && !shown.leaving)).find((at) => at >= 0) ?? 0;
    const [gone] = next.splice(victim, 1);
    clearTimeout(timers.get(gone.id));
    timers.delete(gone.id);
  }
  return next;
}

export function showToast(toast: Toast) {
  const at = toasts.findIndex((shown) => shown.id === toast.id);
  publish(at >= 0 ? toasts.map((shown, i) => (i === at ? toast : shown)) : admit([...toasts, toast]));
  clearTimeout(timers.get(toast.id));
  timers.delete(toast.id);
  if (toast.ttl) timers.set(toast.id, setTimeout(() => dismissToast(toast.id), toast.ttl));
}

export function dismissToast(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  if (!toasts.some((shown) => shown.id === id && !shown.leaving)) return;
  publish(toasts.map((shown) => (shown.id === id ? { ...shown, leaving: true } : shown)));
  setTimeout(() => {
    if (toasts.some((shown) => shown.id === id && shown.leaving)) publish(toasts.filter((shown) => shown.id !== id || !shown.leaving));
  }, LEAVE_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toasts() {
  const shown = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  const [open, setOpen] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const live = shown.filter((toast) => !toast.leaving);
  const fanned = open && live.length > 1;

  useEffect(() => {
    if (!fanned) return;
    const away = (event: globalThis.PointerEvent) => {
      if (!stack.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [fanned]);

  return (
    <div
      ref={stack}
      className="pk-toasts"
      data-toasts
      data-open={fanned ? "" : undefined}
      // The one live region, mounted before any toast: a region or alert nested in it is announced twice.
      aria-live="polite"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
    >
      {shown.map((toast) => (
        <ToastCard key={toast.id} toast={toast} depth={toast.leaving ? -1 : live.length - 1 - live.indexOf(toast)} onTap={() => setOpen((was) => !was)} />
      ))}
    </div>
  );
}

const MARK = { done: "check", note: "spark", risk: "alert" } as const;

function ToastCard({ toast, depth, onTap }: { toast: Shown; depth: number; onTap: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null);

  function follow(event: PointerEvent) {
    const from = drag.current;
    const el = card.current;
    if (!from || !el || event.pointerId !== from.pointer) return;
    const dx = event.clientX - from.x;
    const dy = Math.min(0, event.clientY - from.y);
    el.style.translate = `${dx}px ${dy}px`;
    el.style.opacity = String(1 - 0.6 * Math.min(1, Math.max(Math.abs(dx) / 160, -dy / 80)));
  }

  function release(event: PointerEvent, cancelled = false) {
    const from = drag.current;
    const el = card.current;
    drag.current = null;
    if (!from || !el) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!cancelled && (Math.abs(dx) > 72 || dy < -36)) return dismissToast(toast.id);
    el.style.translate = "";
    el.style.opacity = "";
    if (!cancelled && Math.abs(dx) < 6 && Math.abs(dy) < 6) onTap();
  }

  return (
    <div
      ref={card}
      className={`pk-toast pk-toast--${toast.tone}`}
      data-depth={depth < 0 ? undefined : depth}
      data-leaving={toast.leaving ? "" : undefined}
      style={depth > 0 ? ({ "--depth": depth } as CSSProperties) : undefined}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" || (event.target as HTMLElement).closest("a, button")) return;
        drag.current = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={follow}
      onPointerUp={(event) => release(event)}
      onPointerCancel={(event) => release(event, true)}
    >
      <span key={toast.tone} className="pk-toast__mark" aria-hidden="true">
        {toast.tone === "wait" ? <span className="pk-spinner" /> : <Icon name={MARK[toast.tone]} size={14} weight={2.4} />}
      </span>
      <div className="pk-toast__words">
        <p className="pk-toast__title">{toast.title}</p>
        {toast.body ? <div className="pk-toast__body">{toast.body}</div> : null}
      </div>
      <button type="button" className="pk-toast__close" aria-label="Dismiss" onClick={() => dismissToast(toast.id)}>
        <Icon name="close" size={12} weight={2.4} />
      </button>
    </div>
  );
}
