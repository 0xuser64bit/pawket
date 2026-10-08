import { interpolate, useCurrentFrame } from "remotion";
import { C, F, WORDMARK, sticker } from "../brand";
import { FPS } from "../timeline";
import { Appear, Chip } from "../components/Labels";
import { pop, ramp, swap } from "../components/motion";
import { PawDraw } from "../components/PawDraw";
import { Footage, HERO_SIZE, type Shot } from "../components/Phone";
import { HERO_FOCUS, WINDOW } from "./Hook";

// Back home at full quality (capture/hq-room.mjs): a wave on "Show up for Mango", a cheer on "One care
// at a time", and the two of them dancing through the name.
const HERO: Shot = { clip: "hq-close", at: 155.0, to: 170.0, src: 1.0, size: HERO_SIZE };
const END = { x: 110, y: 300, w: 800, h: 800 * (HERO_SIZE.h / HERO_SIZE.w) };

/** 155–170 s: back to Mango, then the name and the promise. */
export function Close() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t < 154.6) return null;
  const inP = pop(frame, 155.0, 15, 140);
  const m = ramp(t, 162.6, 164.0, swap);
  const box = {
    x: interpolate(m, [0, 1], [WINDOW.x, END.x]),
    y: interpolate(m, [0, 1], [WINDOW.y, END.y]),
    w: interpolate(m, [0, 1], [WINDOW.w, END.w]),
    h: interpolate(m, [0, 1], [WINDOW.h, END.h]),
  };
  const cover = Math.max(box.w / HERO_SIZE.w, box.h / HERO_SIZE.h);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          borderRadius: 40,
          overflow: "hidden",
          background: C.ground,
          ...sticker(interpolate(m, [0, 1], [10, 7])),
          opacity: Math.min(1, inP * 1.4),
          transform: `translateY(${(1 - inP) * 40}px) scale(${0.96 + 0.04 * inP})`,
        }}
      >
        <Footage shot={HERO} w={box.w} h={box.h} baseScale={cover} look={[[0, 1, HERO_FOCUS.x, HERO_FOCUS.y]]} />
      </div>

      {t > 163.4 ? (
        <div style={{ position: "absolute", left: 990, top: 300 }}>
          <PawDraw size={150} at={163.4} />
        </div>
      ) : null}
      <Appear at={163.7} to={171} style={{ left: 1160, top: 300 }} rise={20}>
        <div style={{ ...WORDMARK, fontSize: 150, lineHeight: 1, color: C.ink }}>Pawket</div>
      </Appear>
      <Appear at={164.5} to={171} style={{ left: 994, top: 484 }}>
        <div style={{ fontFamily: F.text, fontWeight: 500, fontSize: 50, color: C.inkSoft }}>A living companion</div>
      </Appear>
      <Appear at={165.3} to={171} style={{ left: 994, top: 584 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <Chip tone="sun" size={28}>Android app</Chip>
          <Chip icon="spark" tone="pool" size={28}>Solana devnet</Chip>
        </div>
      </Appear>
      <Appear at={165.8} to={171} style={{ left: 996, top: 694 }}>
        <div style={{ fontFamily: F.mono, fontSize: 34, color: C.ink }}>pawket.world</div>
      </Appear>
    </>
  );
}
