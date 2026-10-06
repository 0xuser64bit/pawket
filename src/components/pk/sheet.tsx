"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
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
 * on the dimmed room, or the phone's back gesture in the Android app leaves
 * by the same door as Cancel.
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
