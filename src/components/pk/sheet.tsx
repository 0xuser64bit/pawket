"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackCloses } from "@/lib/native/android";
import { Icon } from "./icon";

/**
 * A decision that costs money arrives as a Paper sheet over a dimmed
 * Playroom, anchored to the foot of a phone and centred where there is room,
 * with its controls in the `paper-sunk` foot. The corner radius falling from
 * 20px to 4px is the warning; the copy only confirms it. Anything else that
 * needs the whole screen for a moment — choosing a wallet, the wallet you
 * are — is the same sheet in the Playroom (`register="room"`): a card, its
 * title in words, no warning to give.
 *
 * It is a modal in behaviour as well as looks: it renders into the body, so
 * everything behind it goes inert; focus moves into it; and Escape, a tap
 * on the dimmed room, the phone's back gesture in the Android app, or
 * dragging it down by its head leaves by the same door as Cancel.
 */
export function Sheet({
  title,
  meta,
  foot,
  onDismiss,
  register = "paper",
  children,
}: {
  title: string;
  meta?: ReactNode;
  foot?: ReactNode | ((dismiss: () => void) => ReactNode);
  register?: "paper" | "room";
  /** Cancel. Escape and the scrim do the same. */
  onDismiss: () => void;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const scrim = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const [leaving, setLeaving] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  function dismiss() {
    if (closing.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onDismiss();
    setLeaving(true);
    const duration = getComputedStyle(document.documentElement).getPropertyValue("--dur-sheet");
    closing.current = setTimeout(onDismiss, parseFloat(duration) || 220);
  }
  useBackCloses(dismiss);
  useEffect(() => () => { if (closing.current !== null) clearTimeout(closing.current); }, []);

  // On a phone the sheet is a thing in the hand: its head drags it down, and
  // let go past a third of the way (or with a flick) it leaves the way Cancel
  // does; short of that it settles back. The dimmed room lightens as it goes.
  const drag = useRef<{ from: number; dy: number; y: number; t: number; v: number } | null>(null);
  function grab(event: PointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (event.button !== 0 || !target.closest(".pk-sheet__grab, .pk-paper__head") || target.closest("button, a, input")) return;
    if (!window.matchMedia("(max-width: 719px)").matches) return;
    drag.current = { from: event.clientY, dy: 0, y: event.clientY, t: event.timeStamp, v: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pull(event: PointerEvent<HTMLElement>) {
    const d = drag.current;
    const el = sheet.current;
    if (!d || !el) return;
    const raw = event.clientY - d.from;
    // Down follows the finger; up gives a little, then holds.
    d.dy = raw > 0 ? raw : raw / 5;
    const dt = event.timeStamp - d.t;
    if (dt > 0) d.v = (event.clientY - d.y) / dt;
    d.y = event.clientY;
    d.t = event.timeStamp;
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
    scrim.current?.style.setProperty("--pk-drag", String(Math.max(0, d.dy) / el.offsetHeight));
  }
  function release() {
    const d = drag.current;
    const el = sheet.current;
    drag.current = null;
    if (!d || !el) return;
    if (d.dy > Math.min(160, el.offsetHeight / 3) || (d.dy > 24 && d.v > 0.5)) return dismiss();
    el.style.transition = "";
    el.style.transform = "";
    scrim.current?.style.removeProperty("--pk-drag");
  }

  useEffect(() => {
    if (!mounted) return;
    const layer = scrim.current;
    if (!layer?.parentElement) return;
    const behind = Array.from(layer.parentElement.children).filter(
      // Toasts stay awake: a send made from a sheet says how it went over it.
      (el): el is HTMLElement => el !== layer && el instanceof HTMLElement && !el.inert && !el.hasAttribute("data-toasts"),
    );
    for (const el of behind) el.inert = true;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const before = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    return () => {
      for (const el of behind) el.inert = false;
      root.style.overflow = overflow;
      before?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;
  return createPortal(
    <div
      ref={scrim}
      className={`pk-scrim${leaving ? " pk-scrim--out" : ""}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        ref={sheet}
        className={register === "room" ? "pk-sheet pk-sheet--room" : "pk-sheet"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onPointerDown={grab}
        onPointerMove={pull}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); dismiss(); }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter((el) => !el.matches(":disabled") && el.getClientRects().length > 0);
          const first = controls[0];
          const last = controls.at(-1);
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
            event.preventDefault(); last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
          }
        }}
      >
        <div className="pk-sheet__grab" aria-hidden="true" />
        <header className="pk-paper__head">
          {register === "room" ? <h2 className="title">{title}</h2> : <span className="receipt-label">{title}</span>}
          {meta ? <span className={register === "room" ? "caption pk-faint" : "receipt-label"}>{meta}</span> : null}
          <button type="button" className="pk-sheet__close" aria-label={`Close ${title}`} onClick={dismiss}><Icon name="close" size={16} /></button>
        </header>
        <div className="pk-paper__body">{children}</div>
        {/* The render prop receives an event callback; it does not read the timer ref during render. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {foot ? <footer className="pk-paper__foot">{typeof foot === "function" ? foot(dismiss) : foot}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
