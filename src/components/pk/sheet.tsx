"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A decision that costs money, or that hands control to a wallet, arrives as
 * a Paper sheet over a dimmed Playroom, anchored to the foot of a phone and
 * centred where there is room, with its controls in the `paper-sunk` foot.
 * The corner radius falling from 20px to 4px is the warning; the copy only
 * confirms it.
 *
 * It is a modal in behaviour as well as looks: it renders into the body, so
 * everything behind it goes inert; focus moves into it; and Escape or a tap
 * on the dimmed room leaves by the same door as Cancel.
 */
export function Sheet({
  title,
  meta,
  foot,
  onDismiss,
  children,
}: {
  title: string;
  meta?: string;
  foot?: ReactNode;
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

  useEffect(() => {
    if (!mounted) return;
    const layer = scrim.current;
    if (!layer?.parentElement) return;
    const behind = Array.from(layer.parentElement.children).filter(
      (el): el is HTMLElement => el !== layer && el instanceof HTMLElement && !el.inert,
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
      className="pk-scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <section
        ref={sheet}
        className="pk-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") onDismiss();
        }}
      >
        <header className="pk-paper__head">
          <span className="receipt-label">{title}</span>
          {meta ? <span className="receipt-label">{meta}</span> : null}
        </header>
        <div className="pk-paper__body">{children}</div>
        {foot ? <footer className="pk-paper__foot">{foot}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
