import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { C, F, sticker } from "../brand";
import type { Box, Element } from "../elements";
import { FPS } from "../timeline";
import { life, pop } from "./motion";
import { Footage, type Shot } from "./Phone";

/** Arrives on the design system's spring at `at` and leaves at `to`; nothing is drawn outside that. */
function useShown(at: number, to: number) {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const visible = t >= at - 0.05 && t <= to + 0.05;
  const p = pop(frame, at, 14, 160);
  return { visible, opacity: Math.min(1, p * 1.3) * life(t, at, to, 0.3), lift: (1 - p) * 24, scale: 0.94 + 0.06 * p };
}

function Caption({ children, paper }: { children: ReactNode; paper?: boolean }) {
  return (
    <div style={{ marginTop: 18, fontFamily: paper ? F.mono : F.text, fontWeight: paper ? 400 : 600, fontSize: paper ? 22 : 26, color: C.inkSoft, letterSpacing: paper ? "0.04em" : 0, maxWidth: 820 }}>
      {children}
    </div>
  );
}

/**
 * One app element lifted out of the phone, exactly: the recording is cropped just inside the element's
 * own border, and that border is drawn again at the same weight, radius and shadow (scaled). No frame of
 * the edit's own, and nothing from around the element.
 */
export function Lift({ shot, el, x, y, w, at, to, caption }: { shot: Shot; el: Element; x: number; y: number; w: number; at: number; to: number; caption?: ReactNode }) {
  const s = useShown(at, to);
  if (!s.visible) return null;
  const [cx, cy, cw, ch] = el.content;
  const k = w / (cw + 2 * el.border);
  const b = Math.max(2, el.border * k);
  const inner = { w: cw * k, h: ch * k };
  const paper = el.color === C.rule;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: s.opacity, transform: `translateY(${s.lift}px) scale(${s.scale})`, transformOrigin: "top left" }}>
      <div
        style={{
          position: "relative",
          width: inner.w + 2 * b,
          height: inner.h + 2 * b,
          border: `${b}px solid ${el.color ?? C.ink}`,
          borderRadius: el.radius * k,
          overflow: "hidden",
          background: paper ? C.paper : C.surface,
          boxShadow: el.shadow ? `${el.shadow[0] * k}px ${el.shadow[1] * k}px 0 ${el.shadow[2]}` : "none",
        }}
      >
        <Footage shot={shot} w={inner.w} h={inner.h} baseScale={k} look={[[shot.at, 1, cx + cw / 2, cy + ch / 2]]} />
      </div>
      {caption ? <Caption paper={paper}>{caption}</Caption> : null}
    </div>
  );
}

/**
 * Borderless content floating on the ground: a crop whose edges pass only through the page, feathered
 * so the recording's ground melts into the film's.
 */
export function Float({ shot, region, x, y, w, at, to, caption, feather = 28 }: { shot: Shot; region: Box; x: number; y: number; w: number; at: number; to: number; caption?: ReactNode; feather?: number }) {
  const s = useShown(at, to);
  if (!s.visible) return null;
  const [rx, ry, rw, rh] = region;
  const k = w / rw;
  const h = rh * k;
  const fade = (dir: string) => `linear-gradient(${dir}, transparent 0, black ${feather}px, black calc(100% - ${feather}px), transparent 100%)`;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: s.opacity, transform: `translateY(${s.lift}px) scale(${s.scale})`, transformOrigin: "top left" }}>
      <div style={{ width: w, height: h, WebkitMaskImage: fade("to right"), maskImage: fade("to right") }}>
        <div style={{ position: "relative", width: w, height: h, overflow: "hidden", WebkitMaskImage: fade("to bottom"), maskImage: fade("to bottom") }}>
          <Footage shot={shot} w={w} h={h} baseScale={k} look={[[shot.at, 1, rx + rw / 2, ry + rh / 2]]} />
        </div>
      </div>
      {caption ? <Caption>{caption}</Caption> : null}
    </div>
  );
}

/**
 * A region inside a sheet (which has no border of its own there), framed in the sheet's register:
 * Playroom (ink edge, sticker shadow) or Paper (hairline rule, square).
 */
export function Framed({ shot, region, x, y, w, at, to, caption, paper = false, radius = 22 }: { shot: Shot; region: Box; x: number; y: number; w: number; at: number; to: number; caption?: ReactNode; paper?: boolean; radius?: number }) {
  const s = useShown(at, to);
  if (!s.visible) return null;
  const [rx, ry, rw, rh] = region;
  const h = (w * rh) / rw;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: s.opacity, transform: `translateY(${s.lift}px) scale(${s.scale})`, transformOrigin: "top left" }}>
      <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: paper ? 4 : radius, background: paper ? C.paper : C.surface, ...(paper ? { border: `2px solid ${C.rule}` } : sticker(6)) }}>
        <Footage shot={shot} w={w} h={h} baseScale={w / rw} look={[[shot.at, 1, rx + rw / 2, ry + rh / 2]]} />
      </div>
      {caption ? <Caption paper={paper}>{caption}</Caption> : null}
    </div>
  );
}
