import { interpolate, useCurrentFrame } from "remotion";
import { PawGlyph } from "@app/components/pk/art";
import { C, F, WORDMARK, sticker } from "../brand";
import { FPS } from "../timeline";
import { Appear, Chip } from "../components/Labels";
import { pop, ramp, swap } from "../components/motion";
import { PawDraw } from "../components/PawDraw";
import { Footage, HERO_SIZE, PHONE, SCREEN, type Shot } from "../components/Phone";

// The hero: Mango, kept on Solana and wearing the Halo, in the 3D room drawn at full quality
// (capture/hq-room.mjs). Mango faces us, then the player waves and Mango hops.
const HERO: Shot = { clip: "hq-hook", at: 1.4, to: 9.0, src: 0.2, size: HERO_SIZE };
/** The same room on the phone (Home, at the top): the film-wide phone's first shot. */
export const HOOK_SHOTS: Shot[] = [{ clip: "z2-home", at: 7.0, to: 12.0, src: 0.4 }];
/** The phone arrives under the window as it lands. */
export const PHONE_IN: [number, number] = [7.9, 8.5];

/** Where the room sits on Home in the phone recordings (device px), and so on the phone's screen. */
const PHONE_ROOM = { x: 58, y: 706, w: 963, h: 677 };
const k = SCREEN.w / 1080;
const SCREEN_ROOM = {
  x: PHONE.x - SCREEN.w / 2 + PHONE_ROOM.x * k,
  y: PHONE.y - SCREEN.h / 2 + PHONE_ROOM.y * k,
  w: PHONE_ROOM.w * k,
  h: PHONE_ROOM.h * k,
};
export const WINDOW = { x: 270, y: 150, w: 1380, h: 1380 * (HERO_SIZE.h / HERO_SIZE.w) };
/** The characters, between the player and Mango, in the hero takes (px). */
export const HERO_FOCUS = { x: 1100, y: 430 };

/**
 * 0–12 s. The paw draws itself; the room opens like a window onto Mango; it settles into the phone,
 * exactly where the room sits on Home, and the name arrives beside it.
 */
export function Hook() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t > 13) return null;

  const m = ramp(t, 7.2, 8.7, swap);
  const box = {
    x: interpolate(m, [0, 1], [WINDOW.x, SCREEN_ROOM.x]),
    y: interpolate(m, [0, 1], [WINDOW.y, SCREEN_ROOM.y]),
    w: interpolate(m, [0, 1], [WINDOW.w, SCREEN_ROOM.w]),
    h: interpolate(m, [0, 1], [WINDOW.h, SCREEN_ROOM.h]),
  };
  const cover = Math.max(box.w / HERO_SIZE.w, box.h / HERO_SIZE.h);
  // As it lands, the frame pans so the player stands where the phone's own camera shows them.
  const fx = interpolate(m, [0.4, 1], [HERO_FOCUS.x, 913], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const winIn = pop(frame, 1.5, 15, 150);

  return (
    <>
      {/* the paw, drawn as the loader draws it, then making way */}
      {t < 2.6 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 540 - 150, opacity: 1 - ramp(t, 1.9, 2.4), transform: `scale(${1 - 0.25 * ramp(t, 1.9, 2.5)})` }}>
          <PawDraw size={260} at={0.15} />
        </div>
      ) : null}

      {/* the room as a window */}
      {t >= 1.45 && t < 8.75 ? (
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
            ...sticker(interpolate(m, [0, 1], [10, 3])),
            borderWidth: interpolate(m, [0, 1], [3, 1]),
            opacity: Math.min(1, winIn * 1.5) * (1 - ramp(t, 8.25, 8.65)),
            transform: `translateY(${(1 - winIn) * 40}px) scale(${0.96 + 0.04 * winIn})`,
          }}
        >
          <Footage shot={HERO} w={box.w} h={box.h} baseScale={cover} look={[[0, 1, fx, HERO_FOCUS.y]]} />
        </div>
      ) : null}

      {/* the name */}
      <Appear at={9.1} to={12.4} style={{ left: 930, top: 300 }} rise={26}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <PawGlyph size={132} />
          <div style={{ ...WORDMARK, fontSize: 168, lineHeight: 1, color: C.ink, letterSpacing: "-0.01em" }}>Pawket</div>
        </div>
      </Appear>
      <Appear at={9.6} to={12.4} style={{ left: 940, top: 500 }}>
        <div style={{ fontFamily: F.text, fontWeight: 500, fontSize: 48, color: C.inkSoft }}>A living companion</div>
      </Appear>
      <Appear at={10.2} to={12.4} style={{ left: 940, top: 600 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <Chip tone="sun" size={28}>
            Android app
          </Chip>
          <Chip icon="spark" tone="pool" size={28}>
            Solana devnet
          </Chip>
        </div>
      </Appear>
    </>
  );
}
