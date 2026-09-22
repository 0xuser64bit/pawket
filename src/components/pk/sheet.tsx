"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A decision that costs money arrives as a Paper sheet over a dimmed
 * Playroom, anchored to the foot of a phone and centred where there is room,
 * with its controls in the `paper-sunk` foot. The corner radius falling from
 * 20px to 4px is the warning; the copy only confirms it.
 *
 * It is a modal in behaviour as well as looks: focus moves into it, the page
 * behind goes inert, and Escape or a tap on the dimmed room leaves by the
 * same door as Cancel. It renders on the server, so it is on screen before
 * any of that is wired.
 */
export function Sheet({
  title,
  meta,
  foot,
  dismissHref,
  children,
}: {
  title: string;
  meta?: string;
  foot?: ReactNode;
  /** Where Cancel goes. Escape and the scrim go there too. */
  dismissHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const scrim = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);

  useEffect(() => {
    const layer = scrim.current;
    if (!layer?.parentElement) return;
    const behind = Array.from(layer.parentElement.children).filter(
      (el): el is HTMLElement => el !== layer && el instanceof HTMLElement && !el.inert,
    );
    for (const el of behind) el.inert = true;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    sheet.current?.focus();
    return () => {
      for (const el of behind) el.inert = false;
      root.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      ref={scrim}
      className="pk-scrim"
      onClick={(event) => {
        if (event.target === event.currentTarget) router.push(dismissHref);
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
          if (event.key === "Escape") router.push(dismissHref);
        }}
      >
        <header className="pk-paper__head">
          <span className="receipt-label">{title}</span>
          {meta ? <span className="receipt-label">{meta}</span> : null}
        </header>
        <div className="pk-paper__body">{children}</div>
        {foot ? <footer className="pk-paper__foot">{foot}</footer> : null}
      </section>
    </div>
  );
}
