"use client";

import { useEffect, useState } from "react";
import { PawGlyph } from "./art";

/** How long the splash holds from the start of the page load: the paw has drawn itself and its name has landed. */
const HOLD_MS = 1350;
const HOLD_REDUCED_MS = 500;

/**
 * The splash on every full page load — a refresh, an opened link: the mark
 * draws itself, its name follows, and the whole of it lifts away once the
 * page under it has arrived. It is in the server's HTML, so it is the first
 * thing painted, before any JavaScript; after hydration it holds until the
 * intro has played (counted from the start of the load, so a slow load
 * never waits twice) and then fades. Moving between places inside Pawket
 * never shows it again: it lives in the root layout, which stays mounted.
 *
 * Decorative: the page beneath it says what is happening in words.
 */
export function BootSplash() {
  const [phase, setPhase] = useState<"on" | "leaving" | "gone">("on");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = Math.max(0, (reduced ? HOLD_REDUCED_MS : HOLD_MS) - performance.now());
    const timer = window.setTimeout(() => setPhase(reduced ? "gone" : "leaving"), hold);
    return () => window.clearTimeout(timer);
  }, []);

  // The fade is 380ms. Where animations never run, its end never comes, so
  // the splash goes on time anyway rather than covering the page.
  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("gone"), 700);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      className={phase === "leaving" ? "pk-boot pk-boot--out" : "pk-boot"}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && phase === "leaving") setPhase("gone");
      }}
    >
      <PawGlyph size={88} moving />
      <p className="pk-mark__name pk-splash__name">Pawket</p>
    </div>
  );
}
