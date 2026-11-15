"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./icon";

export interface Toast {
  id: string;
  tone: "wait" | "done" | "risk" | "note";
  title: string;
  body?: ReactNode;
  ttl?: number;
  /** Receipts and recovery actions stay until deliberately dismissed. */
  persistent?: boolean;
}

type Shown = Toast & { mountedOrder: number; leaving?: boolean };

const MAX = 3;
const LEAVE_MS = 200;
const EMPTY: Shown[] = [];
let toasts: Shown[] = EMPTY;
let mountedOrder = 0;
const listeners = new Set<() => void>();
const leavingTimers = new Map<string, ReturnType<typeof setTimeout>>();

function publish(next: Shown[]) {
  toasts = next;
  for (const listener of listeners) listener();
}

function focusedToast() {
  return typeof document === "undefined" ? undefined : document.activeElement?.closest<HTMLElement>("[data-toast-id]")?.dataset.toastId;
}

const EVICT_FIRST: ReadonlyArray<Toast["tone"]> = ["done", "note", "risk"];
function admit(list: Shown[], incomingRisk?: string): Shown[] {
  const next = [...list];
  const focused = focusedToast();
  while (next.filter((shown) => !shown.leaving).length > MAX) {
    const victim = EVICT_FIRST.map((tone) => next.findIndex((shown) => shown.tone === tone && !shown.leaving && !shown.persistent && shown.id !== focused && shown.id !== incomingRisk)).find((at) => at >= 0);
    // Keep receipts, and admit new errors even when they fill the visual fold.
    if (victim === undefined) break;
    next.splice(victim, 1);
  }
  return next;
}

export function showToast(toast: Toast) {
  clearTimeout(leavingTimers.get(toast.id));
  leavingTimers.delete(toast.id);
  const before = toasts.find((shown) => shown.id === toast.id);
  publish(admit([...toasts.filter((shown) => shown.id !== toast.id), { ...toast, mountedOrder: before?.mountedOrder ?? mountedOrder++ }], toast.tone === "risk" ? toast.id : undefined));
}

export function dismissToast(id: string) {
  if (!toasts.some((shown) => shown.id === id && !shown.leaving)) return;
  if (focusedToast() === id) {
    const next = Array.from(document.querySelectorAll<HTMLElement>(".pk-toast:not([data-leaving])")).sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth)).find((card) => card.dataset.toastId !== id);
    const modal = Array.from(document.querySelectorAll<HTMLElement>('.pk-sheet[role="dialog"]')).at(-1);
    (next?.querySelector<HTMLElement>(".pk-toast__close") ?? modal ?? document.querySelector<HTMLElement>(".pk-toasts"))?.focus();
  }
  publish(toasts.map((shown) => (shown.id === id ? { ...shown, leaving: true } : shown)));
  leavingTimers.set(id, setTimeout(() => {
    leavingTimers.delete(id);
    if (toasts.some((shown) => shown.id === id && shown.leaving)) publish(toasts.filter((shown) => shown.id !== id || !shown.leaving));
  }, LEAVE_MS));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toasts() {
  const shown = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => true);
  const stack = useRef<HTMLDivElement>(null);
  const live = shown.filter((toast) => !toast.leaving);
  const fanned = (open || hovered || focused) && live.length > 0;

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
      id="pawket-toasts"
      tabIndex={-1}
      className="pk-toasts"
      data-toasts
      data-open={fanned ? "" : undefined}
      aria-live="polite"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const id = focusedToast();
        if (id) { event.preventDefault(); event.stopPropagation(); dismissToast(id); }
      }}
    >
      {/* Promote visually without moving a focused DOM subtree. */}
      {shown.toSorted((a, b) => a.mountedOrder - b.mountedOrder).map((toast) => {
        const depth = toast.leaving ? -1 : live.length - 1 - live.indexOf(toast);
        const covered = !fanned && depth > 0;
        return <ToastCard key={toast.id} toast={toast} depth={depth} covered={covered} paused={hidden || hovered || focused || covered} onTap={() => setOpen((was) => !was)} />;
      })}
    </div>
  );
}

const MARK = { done: "check", note: "spark", risk: "alert" } as const;

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function ToastCard({ toast, depth, covered, paused, onTap }: { toast: Shown; depth: number; covered: boolean; paused: boolean; onTap: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const lifetime = useRef({ toast, remaining: toast.ttl ?? 0 });

  useEffect(() => {
    if (lifetime.current.toast !== toast) lifetime.current = { toast, remaining: toast.ttl ?? 0 };
    if (paused || toast.leaving || toast.persistent || !toast.ttl) return;
    const started = Date.now();
    const timer = setTimeout(() => {
      // A queued callback may outlive the commit that updates this receipt.
      if (toasts.find((shown) => shown.id === toast.id) === toast) dismissToast(toast.id);
    }, lifetime.current.remaining);
    return () => {
      clearTimeout(timer);
      lifetime.current.remaining = Math.max(0, lifetime.current.remaining - (Date.now() - started));
    };
  }, [toast, paused]);

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
      data-toast-id={toast.id}
      data-depth={depth < 0 ? undefined : depth}
      data-covered={covered ? "" : undefined}
      data-overflow={depth >= MAX ? "" : undefined}
      data-leaving={toast.leaving ? "" : undefined}
      aria-hidden={covered || toast.leaving ? true : undefined}
      style={depth > 0 ? ({ "--depth": depth } as CSSProperties) : undefined}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" || (event.target as HTMLElement).closest('a, button, [tabindex]:not([tabindex="-1"])')) return;
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
