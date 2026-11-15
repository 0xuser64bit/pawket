"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackCloses } from "@/lib/native/android";
import { Icon } from "./icon";

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
    d.dy = raw > 0 ? raw : raw / 5;
    const dt = event.timeStamp - d.t;
    if (dt > 0) d.v = (event.clientY - d.y) / dt;
    d.y = event.clientY;
    d.t = event.timeStamp;
    el.style.transition = "none";
    el.style.transform = `translateY(${d.dy}px)`;
    scrim.current?.style.setProperty("--pk-drag", String(Math.max(0, d.dy) / el.offsetHeight));
  }
  function release(cancelled = false) {
    const d = drag.current;
    const el = sheet.current;
    drag.current = null;
    if (!d || !el) return;
    if (!cancelled && (d.dy > Math.min(160, el.offsetHeight / 3) || (d.dy > 24 && d.v > 0.5))) return dismiss();
    el.style.transition = "";
    el.style.transform = "";
    scrim.current?.style.removeProperty("--pk-drag");
  }

  const trapKey = useEffectEvent((event: KeyboardEvent) => {
    const layer = scrim.current;
    if (!layer || Array.from(document.querySelectorAll(".pk-scrim")).at(-1) !== layer || event.defaultPrevented) return;
    if (event.key === "Escape") { event.preventDefault(); dismiss(); }
    if (event.key !== "Tab") return;
    const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".pk-toasts .pk-toast")).sort((a, b) => Number(a.dataset.depth) - Number(b.dataset.depth));
    const controls = [
      ...Array.from(sheet.current?.querySelectorAll<HTMLElement>(selector) ?? []),
      ...cards.flatMap((card) => Array.from(card.querySelectorAll<HTMLElement>(selector))),
    ].filter((el) => el.tabIndex >= 0 && !el.matches(":disabled") && !el.closest('[inert], [aria-hidden="true"]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
    event.preventDefault();
    const at = controls.indexOf(document.activeElement as HTMLElement);
    const next = at < 0 ? (event.shiftKey ? controls.at(-1) : controls[0]) : controls[(at + (event.shiftKey ? -1 : 1) + controls.length) % controls.length];
    (next ?? sheet.current)?.focus();
  });

  useEffect(() => {
    if (!mounted) return;
    const layer = scrim.current;
    if (!layer?.parentElement) return;
    const behind = Array.from(layer.parentElement.children).filter(
      (el): el is HTMLElement => el !== layer && el instanceof HTMLElement && !el.inert && !el.hasAttribute("data-toasts"),
    );
    for (const el of behind) el.inert = true;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const before = document.activeElement as HTMLElement | null;
    (sheet.current?.querySelector<HTMLElement>("[data-autofocus]") ?? sheet.current)?.focus();
    const key = (event: KeyboardEvent) => trapKey(event);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
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
        aria-owns="pawket-toasts"
        aria-label={title}
        tabIndex={-1}
        onPointerDown={grab}
        onPointerMove={pull}
        onPointerUp={() => release()}
        onPointerCancel={() => release(true)}
      >
        <div className="pk-sheet__grab" aria-hidden="true" />
        <header className="pk-paper__head">
          {register === "room" ? <h2 className="title">{title}</h2> : <span className="receipt-label">{title}</span>}
          {meta ? <span className={register === "room" ? "caption pk-faint" : "receipt-label"}>{meta}</span> : null}
          <button type="button" className="pk-sheet__close" aria-label={`Close ${title}`} onClick={dismiss}><Icon name="close" size={16} /></button>
        </header>
        <div className="pk-paper__body">{children}</div>
        {/* eslint-disable-next-line react-hooks/refs */}
        {foot ? <footer className="pk-paper__foot">{typeof foot === "function" ? foot(dismiss) : foot}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
