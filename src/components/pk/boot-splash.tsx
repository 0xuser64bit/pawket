"use client";

import { useEffect, useState } from "react";
import { PawGlyph } from "./art";

const HOLD_MS = 1350;
const HOLD_REDUCED_MS = 500;

export function BootSplash() {
  const [phase, setPhase] = useState<"on" | "leaving" | "gone">("on");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = Math.max(0, (reduced ? HOLD_REDUCED_MS : HOLD_MS) - performance.now());
    const timer = window.setTimeout(() => setPhase(reduced ? "gone" : "leaving"), hold);
    return () => window.clearTimeout(timer);
  }, []);

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
