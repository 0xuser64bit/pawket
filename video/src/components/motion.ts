import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../timeline";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The design system's curves: --ease-swap for things changing, --ease-spring for a choice landing. */
export const swap = Easing.bezier(0.2, 0.8, 0.2, 1);
export const press = Easing.bezier(0.2, 0.9, 0.3, 1);

/** 0→1 between two times (seconds), eased. */
export function ramp(t: number, from: number, to: number, ease = swap) {
  return interpolate(t, [from, to], [0, 1], { ...clamp, easing: ease });
}

/** In at `a`, out at `b`, each over `d` seconds. */
export function life(t: number, a: number, b: number, d = 0.35) {
  return Math.min(ramp(t, a, a + d), 1 - ramp(t, b - d, b));
}

/** A spring that starts at `at` seconds (frame-accurate), just past and back. */
export function pop(frame: number, at: number, damping = 13, stiffness = 170) {
  return spring({ frame: frame - Math.round(at * FPS), fps: FPS, config: { damping, stiffness, mass: 0.8 } });
}

/** Keyframes [t, value] → value at t, eased between. */
export function keys(t: number, frames: Array<[number, number]>, ease = swap) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) return interpolate(t, [t0, t1], [v0, v1], { ...clamp, easing: ease });
  }
  return frames[frames.length - 1][1];
}
