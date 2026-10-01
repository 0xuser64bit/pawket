"use client";

import { useEffect, type RefObject } from "react";

/** How far a pointer has to be, in pet-widths, for the eyes to reach the edge of their range. */
const REACH = 1.6;

/**
 * Every pet inside `scope` that is marked `data-eyes` looks toward the
 * pointer from where it sits: its eyes move a few units toward it (see
 * `.pk-pet-eyes`). Off for anyone who asked for less motion. One pointer
 * listener and one write per frame, whatever the number of pets.
 */
export function useEyesFollow(scope: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const aim = () => {
      frame = 0;
      for (const el of scope.current?.querySelectorAll<HTMLElement>("[data-eyes]") ?? []) {
        const box = el.getBoundingClientRect();
        if (box.width === 0) continue;
        const dx = (x - (box.left + box.width / 2)) / (box.width * REACH);
        const dy = (y - (box.top + box.height * 0.4)) / (box.height * REACH);
        el.style.setProperty("--pk-look-x", Math.max(-1, Math.min(1, dx)).toFixed(2));
        el.style.setProperty("--pk-look-y", Math.max(-1, Math.min(1, dy)).toFixed(2));
      }
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(aim);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scope, enabled]);
}
