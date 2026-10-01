"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `step(dt)` once per animation frame while `running`, with `dt` in
 * seconds and capped, so a tab that was hidden resumes where it paused
 * instead of leaping.
 */
export function useFrame(running: boolean, step: (dt: number) => void) {
  const latest = useRef(step);
  useEffect(() => {
    latest.current = step;
  });
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      latest.current(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
