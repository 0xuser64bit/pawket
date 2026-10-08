import type { ReactNode } from "react";
import { interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C } from "../brand";
import { FPS, f } from "../timeline";
import { clamp, keys, swap } from "./motion";

// The phone recordings are 1080×2400 (the emulator's 1440×3200 display, recorded at 1080 wide).
export const DEVICE = { w: 1080, h: 2400 };
// The hero takes of the room (capture/hq-room.mjs) are the room's canvas alone, 1952×850.
export const HERO_SIZE = { w: 1952, h: 850 };
export const SCREEN = { w: 405, h: 900 };
/** One place for the phone, for the whole film. */
export const PHONE = { x: 560, y: 500 };

/** Where the camera looks inside a recording: [t, zoom, focusX, focusY] in device px. */
export type Look = [t: number, zoom: number, fx: number, fy: number];

export interface Shot {
  clip: string;
  /** On the timeline, seconds. */
  at: number;
  to: number;
  /** The recording's second at `at`. */
  src: number;
  rate?: number;
  look?: Look[];
  /** Fade in over this many seconds. */
  fade?: number;
  /** The recording's pixel size, when it is not a phone recording. */
  size?: { w: number; h: number };
}

function lookAt(look: Look[] | undefined, t: number) {
  if (!look?.length) return { z: 1, fx: DEVICE.w / 2, fy: DEVICE.h / 2 };
  return {
    z: keys(t, look.map(([lt, z]) => [lt, z])),
    fx: keys(t, look.map(([lt, , x]) => [lt, x])),
    fy: keys(t, look.map(([lt, , , y]) => [lt, y])),
  };
}

/**
 * A recording placed in a box of `w`×`h`, looking where `look` says. The same shot can be shown in
 * the phone and lifted out beside it; both read the same seconds.
 */
export function Footage({ shot, w, h, look, baseScale }: { shot: Shot; w: number; h: number; look?: Look[]; baseScale?: number }) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < shot.at - 1 / FPS || t > shot.to + 1 / FPS) return null;
  const src = shot.size ?? DEVICE;
  const { z, fx, fy } = lookAt(look ?? shot.look, t);
  const k = (baseScale ?? w / src.w) * z;
  const tx = Math.min(0, Math.max(w - src.w * k, w / 2 - fx * k));
  const ty = Math.min(0, Math.max(h - src.h * k, h / 2 - fy * k));
  const opacity = shot.fade ? interpolate(t, [shot.at, shot.at + shot.fade], [0, 1], { ...clamp, easing: swap }) : 1;
  return (
    <Sequence from={f(shot.at)} durationInFrames={Math.max(1, f(shot.to - shot.at) + 1)} layout="none">
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: src.w,
          height: src.h,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${k})`,
          opacity,
        }}
      >
        <OffthreadVideo
          src={staticFile(`footage/${shot.clip}.mp4`)}
          trimBefore={Math.max(0, f(shot.src))}
          playbackRate={shot.rate ?? 1}
          muted
          style={{ width: src.w, height: src.h, display: "block" }}
        />
      </div>
    </Sequence>
  );
}

const DISSOLVE = 0.32;
const endOf = (s: Shot) => s.src + (s.to - s.at) * (s.rate ?? 1);
/** The next shot carries straight on from this one: same recording, next second, same speed. */
const carriesOn = (a: Shot, b: Shot) => a.clip === b.clip && Math.abs(endOf(a) - b.src) < 0.12 && (a.rate ?? 1) === (b.rate ?? 1);

/**
 * Shots back to back become dissolves: the outgoing shot runs on underneath for a moment while the
 * next one fades in over it, so a jump between two moments of a recording never reads as a glitch.
 * Footage that carries straight on cuts as it was recorded.
 */
export function dissolve(shots: Shot[]): Shot[] {
  return shots.map((s, i) => {
    const prev = shots[i - 1];
    const next = shots[i + 1];
    const joinsPrev = prev && Math.abs(prev.to - s.at) < 0.02 && !carriesOn(prev, s);
    const joinsNext = next && Math.abs(s.to - next.at) < 0.02 && !carriesOn(s, next);
    return { ...s, fade: s.fade ?? (joinsPrev ? DISSOLVE : 0), to: joinsNext ? s.to + DISSOLVE : s.to };
  });
}

/** Several shots, one after another, in one box. */
export function Shots({ shots, w = SCREEN.w, h = SCREEN.h }: { shots: Shot[]; w?: number; h?: number }) {
  return (
    <>
      {dissolve(shots).map((shot) => (
        <Footage key={`${shot.clip}-${shot.at}`} shot={shot} w={w} h={h} />
      ))}
    </>
  );
}

/**
 * The phone, drawn in the Playroom register: an ink body with a hard sticker shadow, so it sits in the
 * same world as the app's cards. x, y are its centre in the frame.
 */
export function Phone({ x, y, scale = 1, rotate = 0, opacity = 1, children }: { x: number; y: number; scale?: number; rotate?: number; opacity?: number; children: ReactNode }) {
  const bezel = 14;
  const W = SCREEN.w + bezel * 2;
  const H = SCREEN.h + bezel * 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x - W / 2,
        top: y - H / 2,
        width: W,
        height: H,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity,
        borderRadius: 64,
        background: C.ink,
        boxShadow: `10px 10px 0 rgba(42,30,20,0.9)`,
        padding: bezel,
      }}
    >
      <div style={{ position: "relative", width: SCREEN.w, height: SCREEN.h, borderRadius: 50, overflow: "hidden", background: C.ground }}>
        {children}
      </div>
    </div>
  );
}
