"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { DecorSlot } from "@/lib/room/decor";

/**
 * The room's things drawn flat, the way the flat room draws everything:
 * tokens for colour, the room's ink for the line, and a few colours a thing
 * has of its own (a sunflower, a strawberry). Each is drawn around its own
 * origin — a picture about its centre, a plant from its pot's foot, a rug
 * about its middle, something by the bed from where it stands — and the
 * flat room puts the origin where the slot is (`FLAT_AT`). A bed is two
 * drawings, behind the pet and in front of it, on the nook's 120 × 120.
 * The same drawings are the Market's tiles and the room panel's choices.
 */

/** Where each slot's origin is in the flat room's drawing, and how big the thing is drawn there. */
export const FLAT_AT: Record<Exclude<DecorSlot, "bed">, { x: number; y: number; scale: number }> = {
  wall: { x: 345, y: 140, scale: 1 },
  corner: { x: 226, y: 223, scale: 0.62 },
  rug: { x: 320, y: 368, scale: 1 },
  side: { x: 735, y: 318, scale: 1 },
};

const OWN = { sunny: "#ffc84a", berry: "#e2434b", lavender: "#a88fdc", navy: "#22305a", card: "#c9955e", dough: "#e9b27a", rope: "#d8c093", neon: "#ff5fa2" };
const NIGHT = { opacity: "var(--pk-night)" };

/* ----------------------------------------------------------- the time */

const ticking = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribeMinutes(listener: () => void) {
  ticking.add(listener);
  timer ??= setInterval(() => ticking.forEach((each) => each()), 15_000);
  return () => {
    ticking.delete(listener);
    if (!ticking.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const minuteNow = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/** The clock's hands: this device's time once the page is here, ten past ten (a clock's pose) before. */
function ClockHands() {
  const minutes = useSyncExternalStore(subscribeMinutes, minuteNow, () => 10 * 60 + 10);
  const hour = ((minutes % 720) / 720) * 360;
  const minute = ((minutes % 60) / 60) * 360;
  return (
    <g strokeWidth="3.4">
      <path d="M0 0v-12" transform={`rotate(${hour})`} />
      <path d="M0 0v-18" transform={`rotate(${minute})`} strokeWidth="2.6" />
      <circle r="2.6" fill="var(--sun-edge)" stroke="none" />
    </g>
  );
}

/* ------------------------------------------------------------- drawings */

function pot(width: number, height: number, fill: string, band?: string) {
  const w = width / 2;
  return (
    <>
      <path d={`M${-w} ${-height}h${width}l-${width * 0.12} ${height}h${-width * 0.76}z`} fill={fill} />
      {band ? <path d={`M${-w - 2} ${-height}h${width + 4}v${height * 0.24}h${-width - 4}z`} fill={band} /> : null}
    </>
  );
}

const PAW_BEANS = [
  [-11, -7, -0.5],
  [-4.4, -13, -0.15],
  [4.4, -13, 0.15],
  [11, -7, 0.5],
] as const;

function paw(fill: string, scale = 1) {
  return (
    <g fill={fill} transform={`scale(${scale})`}>
      <path d="M0 15c-6-4-10-7-10-11.5 0-3.2 2.4-5.4 5.3-5.4 2.2 0 3.7 1.1 4.7 2.9 1-1.8 2.5-2.9 4.7-2.9 2.9 0 5.3 2.2 5.3 5.4 0 4.5-4 7.5-10 11.5z" />
      {PAW_BEANS.map(([x, y, r]) => (
        <ellipse key={x} cx={x} cy={y} rx="3.3" ry="4.2" transform={`rotate(${r * 30} ${x} ${y})`} />
      ))}
    </g>
  );
}

const HEART = "M0 14C-9 8-16 3-16-4c0-5 3.8-8.4 8.2-8.4 3.4 0 6 1.8 7.8 4.6 1.8-2.8 4.4-4.6 7.8-4.6 4.4 0 8.2 3.4 8.2 8.4 0 7-7 12-16 18z";

type Drawing = { draw: () => ReactNode; box: [number, number, number, number] };
type Bed = { back: () => ReactNode; front: () => ReactNode };

const DRAW: Record<string, Drawing> = {
  /* the wall: about its centre */
  "sea-painting": {
    box: [-52, -40, 104, 80],
    draw: () => (
      <>
        <rect x="-46" y="-34" width="92" height="68" rx="6" fill="var(--trim-copper)" />
        <rect x="-37" y="-25" width="74" height="50" rx="3" fill="var(--pool-soft)" strokeWidth="3" />
        <circle cx="18" cy="-9" r="7.5" fill="var(--sun)" strokeWidth="2.6" />
        <path d="M-37 8c6-5 12-5 18 0s12 5 18 0 12-5 18 0 12 5 18 0v17h-72z" fill="var(--pool)" strokeWidth="3" />
        <path d="M-27 14c4-3 8-3 12 0M5 16c4-3 8-3 12 0" stroke="var(--surface)" strokeWidth="2.4" fill="none" />
        <path d="M-24-12c0-4 4-6 8-5 2-4 9-4 10 1 4 0 6 4 4 6z" fill="var(--surface)" strokeWidth="2.4" />
      </>
    ),
  },
  "paw-portrait": {
    box: [-38, -44, 76, 88],
    draw: () => (
      <>
        <rect x="-32" y="-38" width="64" height="76" rx="20" fill="var(--trim-foil)" />
        <rect x="-24" y="-30" width="48" height="60" rx="14" fill="var(--sun-soft)" strokeWidth="3" />
        <g transform="translate(0 2)" strokeWidth="2.4">{paw("var(--sun)")}</g>
      </>
    ),
  },
  "wall-clock": {
    box: [-36, -36, 72, 72],
    draw: () => (
      <>
        <circle r="30" fill="var(--sun)" />
        <circle r="23" fill="var(--surface)" strokeWidth="3" />
        <g strokeWidth="2.4">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={i % 3 === 0 ? "M0-21v6" : "M0-21v3"} transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <ClockHands />
      </>
    ),
  },
  bunting: {
    box: [-54, -30, 108, 50],
    draw: () => (
      <>
        <path d="M-50-22Q0 2 50-22" fill="none" strokeWidth="2.6" />
        {(["var(--sun)", "var(--pool)", "var(--sprout)", "var(--pet-blush)", OWN.sunny, "var(--trim-glass)", "var(--sun)"] as const).map((fill, i) => {
          const x = -39 + i * 13;
          const y = -22 + 24 * (1 - (x / 50) ** 2) * 0.5;
          return <path key={i} d={`M${x - 6} ${y}h12l-6 14z`} fill={fill} strokeWidth="2.4" />;
        })}
      </>
    ),
  },
  "bat-garland": {
    box: [-54, -30, 108, 52],
    draw: () => (
      <>
        <path d="M-50-22Q0 2 50-22" fill="none" strokeWidth="2.6" />
        {[-36, -18, 0, 18, 36].map((x, i) => {
          const y = -22 + 24 * (1 - (x / 50) ** 2) * 0.5 + 7;
          return (
            <g key={x} transform={`translate(${x} ${y}) rotate(${i % 2 ? 7 : -7}) scale(1.3)`} fill={OWN.navy} strokeWidth="1.4">
              <path d="M2.6-1C5.6-4 9-4.4 11.6-3 10.6-1.2 10-.2 9 .8 8.2 0 7.2 .2 6.6 1.4 6 .4 5 .4 4.2 1.6 3.6.6 3 .6 2.6 1.2zM-2.6-1C-5.6-4-9-4.4-11.6-3-10.6-1.2-10-.2-9 .8-8.2 0-7.2.2-6.6 1.4-6 .4-5 .4-4.2 1.6-3.6.6-3 .6-2.6 1.2z" />
              <path d="M-2.4-3.2l.6-3 1.4 2.2h.8l1.4-2.2.6 3c.8 1 1 2.6.4 4.2-.6 1.4-1.8 2.2-2.8 2.2s-2.2-.8-2.8-2.2c-.6-1.6-.4-3.2.4-4.2z" />
            </g>
          );
        })}
      </>
    ),
  },
  "blossom-scroll": {
    box: [-34, -48, 68, 96],
    draw: () => (
      <>
        <path d="M-18-40l18-6 18 6" fill="none" strokeWidth="2.2" />
        <rect x="-22" y="-36" width="44" height="72" fill="var(--surface)" strokeWidth="3" />
        <rect x="-28" y="-40" width="56" height="7" rx="3.5" fill="var(--trim-copper)" strokeWidth="2.6" />
        <rect x="-28" y="33" width="56" height="7" rx="3.5" fill="var(--trim-copper)" strokeWidth="2.6" />
        <path d="M-14 26C-6 10 0 -2 12-20M-2 4c6-2 10 0 14 4" fill="none" stroke="var(--pet-cocoa)" strokeWidth="3" />
        <g fill="var(--pet-blush)" strokeWidth="1.8">
          <circle cx="12" cy="-20" r="5" />
          <circle cx="3" cy="-8" r="4.4" />
          <circle cx="13" cy="7" r="4" />
          <circle cx="-8" cy="12" r="4.6" />
          <circle cx="-12" cy="24" r="3.6" />
        </g>
      </>
    ),
  },
  "aurora-print": {
    box: [-52, -40, 104, 80],
    draw: () => (
      <>
        <rect x="-46" y="-34" width="92" height="68" rx="6" fill="var(--edge)" />
        <rect x="-38" y="-26" width="76" height="52" rx="3" fill={OWN.navy} stroke="none" />
        <path d="M-38-6c8-12 16-12 25-4s16 8 25-2 18-8 26 0v10c-8-8-17-8-26 1s-16 8-25 1-17-8-25 4z" fill="var(--sprout)" stroke="none" opacity="0.9" />
        <path d="M-38 4c10-8 18-8 26-2s16 6 26-2 18-6 24 0v8c-8-6-16-4-24 2s-17 6-26 0-16-6-26 4z" fill="var(--trim-glass)" stroke="none" opacity="0.9" />
        <g fill="var(--surface)" stroke="none">
          <circle cx="-26" cy="-17" r="1.6" />
          <circle cx="4" cy="-20" r="1.4" />
          <circle cx="28" cy="-14" r="1.8" />
        </g>
        <path d="M-38 25v-8l12-7 9 6 12-10 11 9 9-5 13 8v7z" fill="var(--edge)" stroke="none" />
      </>
    ),
  },
  "star-chart": {
    box: [-40, -40, 80, 80],
    draw: () => (
      <>
        <circle r="34" fill="var(--trim-foil)" />
        <circle r="27" fill={OWN.navy} strokeWidth="3" />
        <path d="M-6-14a14 14 0 1 0 12 23 11 11 0 0 1-12-23z" fill={OWN.sunny} strokeWidth="2.4" />
        <g fill={OWN.sunny} stroke="none">
          <path d="M14-12l1.6 3.4 3.4 1.6-3.4 1.6-1.6 3.4-1.6-3.4-3.4-1.6 3.4-1.6z" />
          <path d="M16 10l1.2 2.6 2.6 1.2-2.6 1.2-1.2 2.6-1.2-2.6-2.6-1.2 2.6-1.2z" />
          <circle cx="-14" cy="14" r="1.6" />
          <circle cx="2" cy="-20" r="1.4" />
        </g>
      </>
    ),
  },
  "sun-mirror": {
    box: [-42, -42, 84, 84],
    draw: () => (
      <>
        <g fill="var(--trim-copper)" strokeWidth="2.4">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={i % 2 ? "M-5-20l5-14 5 14z" : "M-6-20l6-18 6 18z"} transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r="21" fill="var(--sun-edge)" />
        <circle r="15" fill="var(--pool-soft)" strokeWidth="2.6" />
        <path d="M-7-6l6-6M-6 2l10-10" stroke="var(--surface)" strokeWidth="2.6" />
      </>
    ),
  },
  "front-page": {
    box: [-34, -42, 68, 84],
    draw: () => (
      <>
        <rect x="-30" y="-38" width="60" height="76" rx="2" fill="var(--edge)" />
        <rect x="-25" y="-33" width="50" height="66" fill="var(--surface)" stroke="none" />
        <rect x="-21" y="-29" width="42" height="8" fill="var(--edge)" stroke="none" />
        <rect x="-21" y="-17" width="20" height="22" fill="var(--sun-soft)" strokeWidth="2" />
        <g transform="translate(-11 -6) scale(0.42)" strokeWidth="3">{paw("var(--sun)")}</g>
        <path d="M3-15h18M3-9h18M3-3h12M-21 11h42M-21 17h42M-21 23h30" stroke="var(--edge-soft)" strokeWidth="2.4" />
      </>
    ),
  },
  "neon-heart": {
    box: [-30, -28, 60, 50],
    draw: () => (
      <>
        <path d={HEART} transform="scale(1.3) translate(0 -2)" fill="none" stroke={OWN.neon} strokeWidth="11" opacity="0.35" style={NIGHT} />
        <path d={HEART} transform="scale(1.3) translate(0 -2)" fill="none" stroke={OWN.neon} strokeWidth="4.5" />
        <path d="M-17-16v-6M17-16v-6M0 22v5" stroke="var(--edge-soft)" strokeWidth="2.4" />
      </>
    ),
  },

  /* the corner: from the pot's foot */
  fern: {
    box: [-34, -78, 68, 82],
    draw: () => (
      <>
        <path d="M2-30c-4-20-20-30-32-24 6 14 18 22 32 24zM2-30c0-22 12-36 28-34-2 16-12 30-28 34zM2-30c-8-14-4-34 6-42 8 14 4 32-6 42z" fill="var(--sprout)" strokeWidth="3" />
        {pot(34, 30, "var(--trim-copper)")}
      </>
    ),
  },
  cactus: {
    box: [-34, -92, 68, 96],
    draw: () => (
      <>
        <path d="M-14-30c0-12 0-24 14-24s14 12 14 24z" fill="var(--sprout)" />
        <rect x="-11" y="-80" width="22" height="54" rx="11" fill="var(--sprout)" />
        <path d="M-11-48h-6c-5 0-7-4-7-10v-8M11-56h6c5 0 7-4 7-10v-6" fill="none" stroke="var(--edge)" strokeWidth="11" />
        <path d="M-11-48h-6c-5 0-7-4-7-10v-8M11-56h6c5 0 7-4 7-10v-6" fill="none" stroke="var(--sprout)" strokeWidth="5" />
        <path d="M-4-68l-2-3M4-58l2-3M-5-44l-2 3M5-36l2 3" stroke="var(--surface)" strokeWidth="2" />
        <circle cy="-83" r="5" fill="var(--pet-blush)" strokeWidth="2.4" />
        {pot(36, 28, "var(--trim-copper)", "var(--sun)")}
      </>
    ),
  },
  monstera: {
    box: [-46, -96, 92, 100],
    draw: () => (
      <>
        <path d="M0-28C-2-46-16-56-32-54c-4 14 6 30 32 26zM0-28c2-22 18-34 36-30 2 16-12 32-36 30zM0-30c-10-20-6-44 6-58 12 14 8 40-6 58z" fill="var(--sprout)" strokeWidth="3" />
        <path d="M-16-48l-6 5M-12-38l-8 2M18-50l7 4M14-40l9 0M2-64l-6 4M2-50l6 3" stroke="var(--surface)" strokeWidth="3.4" />
        {pot(38, 30, "var(--surface)", "var(--pool)")}
      </>
    ),
  },
  sunflower: {
    box: [-34, -118, 68, 122],
    draw: () => (
      <>
        <path d="M0-28v-62" stroke="var(--sprout-edge)" strokeWidth="5" />
        <path d="M0-50c-10-10-22-8-26 0 10 6 20 6 26 0zM0-64c10-10 22-8 26 0-10 6-20 6-26 0z" fill="var(--sprout)" strokeWidth="2.6" />
        <g fill={OWN.sunny} strokeWidth="2.2" transform="translate(0 -96)">
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="0" cy="-11" rx="4.4" ry="8" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="9" fill="var(--pet-cocoa)" strokeWidth="2.6" />
        </g>
        {pot(32, 28, "var(--pool)", "var(--pool-edge)")}
      </>
    ),
  },
  "pumpkin-lantern": {
    box: [-52, -84, 104, 88],
    draw: () => (
      <>
        <circle cy="-32" r="46" fill={OWN.sunny} stroke="none" opacity="0.22" style={NIGHT} />
        <ellipse cx="-16" cy="-30" rx="20" ry="27" fill="var(--sun)" />
        <ellipse cx="16" cy="-30" rx="20" ry="27" fill="var(--sun)" />
        <ellipse cy="-30" rx="19" ry="30" fill="var(--sun)" />
        <path d="M0-59c0-8 3-12 9-15" fill="none" stroke="var(--sprout-edge)" strokeWidth="6" />
        <g fill={OWN.sunny} strokeWidth="2.6">
          <path d="M-17-37l6-10 6 10zM5-37l6-10 6 10z" />
          <path d="M-17-21q17 12 34 0l-4-1-4 4-4-4h-9l-4 4-4-4z" />
        </g>
      </>
    ),
  },
  bonsai: {
    box: [-46, -70, 92, 74],
    draw: () => (
      <>
        <path d="M-4-14c0-10 6-16 2-24-4-8 4-14 10-18M-2-34c-8-2-14 2-18 8" fill="none" stroke="var(--pet-cocoa)" strokeWidth="6" />
        <g fill="var(--sprout)" strokeWidth="3">
          <ellipse cx="14" cy="-58" rx="22" ry="11" />
          <ellipse cx="-24" cy="-28" rx="16" ry="9" />
          <ellipse cx="-4" cy="-46" rx="14" ry="8" />
        </g>
        <path d="M-36-14h72l-6 14h-60z" fill="var(--trim-glass)" />
      </>
    ),
  },
  "lavender-pot": {
    box: [-34, -90, 68, 94],
    draw: () => (
      <>
        <path d="M-8-28l-10-44M-2-28l-4-52M4-28l4-50M10-28l12-40" fill="none" stroke="var(--sprout-edge)" strokeWidth="2.6" />
        <g fill={OWN.lavender} strokeWidth="2.2">
          <rect x="-24" y="-88" width="9" height="20" rx="4.5" transform="rotate(-12 -19 -78)" />
          <rect x="-11" y="-96" width="9" height="22" rx="4.5" transform="rotate(-4 -6 -85)" />
          <rect x="3" y="-94" width="9" height="22" rx="4.5" transform="rotate(5 8 -83)" />
          <rect x="16" y="-84" width="9" height="20" rx="4.5" transform="rotate(16 21 -74)" />
        </g>
        {pot(34, 30, "var(--surface)", OWN.lavender)}
      </>
    ),
  },

  /* the rug: about its middle, seen lying on the floor */
  "meadow-rug": {
    box: [-236, -42, 472, 84],
    draw: () => (
      <>
        <ellipse rx="230" ry="36" fill="var(--sprout-soft)" />
        <ellipse rx="196" ry="26" fill="none" stroke="var(--sprout)" strokeWidth="3" strokeDasharray="2 12" />
      </>
    ),
  },
  "round-rug": {
    box: [-236, -42, 472, 84],
    draw: () => (
      <>
        <ellipse rx="230" ry="36" fill="var(--sun)" />
        <ellipse rx="186" ry="28" fill="var(--sun-soft)" strokeWidth="3" />
        <ellipse rx="134" ry="20" fill="var(--sun)" strokeWidth="3" />
        <ellipse rx="80" ry="12" fill="var(--sun-soft)" strokeWidth="3" />
      </>
    ),
  },
  "striped-rug": {
    box: [-236, -42, 472, 84],
    draw: () => (
      <>
        <path d="M-212-30h424l14 60h-452z" fill="var(--surface)" />
        <path d="M-209-17h418l3 9h-424zM-204 4h408l4 10h-416z" fill="var(--pool)" stroke="none" />
        <path d="M-226 30v8M-212 30v8M-198 30v8M198 30v8M212 30v8M226 30v8" stroke="var(--edge-soft)" strokeWidth="3" />
        <path d="M-212-30h424l14 60h-452z" fill="none" />
      </>
    ),
  },
  "heart-rug": {
    box: [-150, -46, 300, 92],
    draw: () => (
      <>
        <path d="M0 40C-80 30-150 12-150-12c0-18 26-30 60-30 34 0 60 10 90 24 30-14 56-24 90-24 34 0 60 12 60 30 0 24-70 42-150 52z" fill="var(--pet-blush)" />
        <path d="M0 26C-56 20-104 8-104-8c0-12 18-20 42-20 24 0 42 7 62 16 20-9 38-16 62-16 24 0 42 8 42 20 0 16-48 28-104 34z" fill="var(--sun-soft)" stroke="none" />
      </>
    ),
  },
  "strawberry-rug": {
    box: [-190, -50, 380, 96],
    draw: () => (
      <>
        <path d="M-150-24c40-18 260-18 300 0 30 14-40 50-150 66C-110 26-180-10-150-24z" fill={OWN.berry} />
        <g fill={OWN.sunny} stroke="none">
          {[-110, -70, -30, 10, 50, 90, -90, -50, -10, 30, 70, -40, 0, 40].map((x, i) => (
            <ellipse key={i} cx={x} cy={i < 6 ? -8 : i < 11 ? 8 : 22} rx="5" ry="2.6" />
          ))}
        </g>
        <path d="M-60-30c20-14 40-6 60-14 20 8 40 0 60 14-20 4-40 8-60 0-20 8-40 4-60 0z" fill="var(--sprout)" strokeWidth="3" />
      </>
    ),
  },
  "honeycomb-rug": {
    box: [-200, -46, 400, 92],
    draw: () => (
      <g strokeWidth="3">
        {[[-120, 0], [-60, -20], [-60, 20], [0, 0], [60, -20], [60, 20], [120, 0]].map(([x, y]) => (
          <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
            <path d="M-40 0l20-16h40l20 16-20 16h-40z" fill={OWN.sunny} />
            <path d="M-24 0l12-9h24l12 9-12 9h-24z" fill="var(--sun-soft)" stroke="none" />
          </g>
        ))}
      </g>
    ),
  },

  /* by the bed: from where it stands */
  "floor-lamp": {
    box: [-36, -182, 72, 186],
    draw: () => (
      <>
        <path d="M-60 0l60-146 60 146z" fill={OWN.sunny} stroke="none" opacity="0.2" style={NIGHT} />
        <path d="M0-140V-4" strokeWidth="4" />
        <ellipse cy="-3" rx="18" ry="5" fill="var(--edge)" />
        <path d="M-16-178h32l12 34h-56z" fill="var(--sun-soft)" />
        <path d="M-16-178h32l12 34h-56z" fill={OWN.sunny} stroke="none" style={NIGHT} />
      </>
    ),
  },
  bookcase: {
    box: [-50, -162, 100, 166],
    draw: () => (
      <>
        <rect x="-44" y="-142" width="88" height="142" rx="4" fill="var(--trim-copper)" />
        <rect x="-36" y="-134" width="72" height="40" fill="var(--surface-sunk)" strokeWidth="3" />
        <rect x="-36" y="-88" width="72" height="40" fill="var(--surface-sunk)" strokeWidth="3" />
        <rect x="-36" y="-42" width="72" height="36" fill="var(--surface-sunk)" strokeWidth="3" />
        <g strokeWidth="2.4">
          {[
            [-33, -128, 8, 34, "var(--pool)"], [-24, -124, 9, 30, "var(--sun)"], [-14, -126, 7, 32, "var(--sprout)"], [10, -122, 9, 28, "var(--trim-glass)"], [20, -128, 8, 34, "var(--pet-blush)"],
            [-33, -80, 9, 32, OWN.sunny], [-23, -84, 8, 36, "var(--pool)"], [0, -82, 9, 34, "var(--sun)"], [12, -80, 8, 32, "var(--sprout)"],
            [-30, -36, 9, 30, "var(--trim-glass)"], [-20, -34, 8, 28, "var(--pet-blush)"], [14, -36, 9, 30, "var(--pool)"],
          ].map(([x, y, w, h, fill]) => (
            <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx="1.5" fill={fill as string} />
          ))}
        </g>
        <g transform="translate(26 -142) scale(0.5)" strokeWidth="5">
          {pot(30, 24, "var(--surface)", "var(--sprout)")}
          <path d="M0-24c-6-14-16-18-24-12 6 10 14 14 24 12zM0-24c4-16 14-20 22-14-4 10-12 14-22 14z" fill="var(--sprout)" />
        </g>
      </>
    ),
  },
  "leaf-pile": {
    box: [-62, -48, 124, 52],
    draw: () => (
      <>
        <path d="M-56 0c4-24 28-38 56-38s52 14 56 38z" fill="var(--trim-copper)" />
        <g strokeWidth="2">
          {(
            [
              [-38, -10, -30, "var(--sun)"], [-22, -22, 20, OWN.sunny], [-6, -30, -10, OWN.berry], [10, -27, 35, "var(--sun)"], [26, -18, -25, OWN.sunny],
              [42, -8, 15, OWN.berry], [-30, -4, 50, OWN.berry], [-8, -14, -40, "var(--sun-edge)"], [14, -12, 60, OWN.sunny], [32, -4, -15, "var(--sun)"],
              [-50, 2, 80, OWN.sunny], [52, 1, -70, "var(--sun)"],
            ] as const
          ).map(([x, y, a, fill]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="8" ry="4" transform={`rotate(${a} ${x} ${y})`} fill={fill} />
          ))}
        </g>
      </>
    ),
  },
  "cat-tree": {
    box: [-46, -170, 92, 174],
    draw: () => (
      <>
        <rect x="-40" y="-12" width="80" height="12" rx="4" fill="var(--trim-cloth)" />
        <rect x="-16" y="-150" width="16" height="140" fill={OWN.rope} />
        <path d="M-16-130h16M-16-110h16M-16-90h16M-16-70h16M-16-50h16M-16-30h16" stroke="var(--trim-cloth)" strokeWidth="2.4" />
        <rect x="-34" y="-92" width="70" height="10" rx="4" fill="var(--trim-cloth)" />
        <path d="M-30-150c0 10 10 14 22 14s22-4 22-14z" fill="var(--trim-cloth)" />
        <path d="M24-82v34" strokeWidth="2" />
        <circle cx="24" cy="-42" r="6" fill="var(--pet-blush)" strokeWidth="2.6" />
      </>
    ),
  },
};

const BEDS: Record<string, Bed> = {
  basket: {
    back: () => (
      <>
        <path d="M2 94c0-11 26-19 58-19s58 8 58 19" fill="var(--trim-copper)" stroke="var(--edge)" strokeWidth="3" />
        <path d="M10 94c0-7 22-13 50-13s50 6 50 13" fill="var(--pet-cream)" stroke="none" />
      </>
    ),
    front: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M2 94c0 17 24 26 58 26s58-9 58-26c-14 8-34 12-58 12S16 102 2 94z" fill="var(--trim-copper)" />
        <path d="M16 106c4 2 8 3 12 4M44 111h8M68 111h8M92 110c4-1 8-2 12-4" stroke="var(--sun-soft)" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  "cloud-bed": {
    back: () => (
      <path d="M4 96c-4-10 6-16 14-14 0-10 14-14 22-8 6-8 22-8 28 0 8-6 22-2 22 8 8-2 18 4 14 14z" fill="var(--pet-cloud)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
    ),
    front: () => (
      <path d="M2 98c-2 12 10 20 22 16 6 8 22 8 28 2 8 6 22 6 28-2 12 4 26-4 22-16-34 10-66 10-100 0z" fill="var(--pet-cloud)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />
    ),
  },
  "box-bed": {
    back: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M4 82l-2-16 22 10zM116 82l2-16-22 10z" fill={OWN.card} />
        <path d="M8 82h104v14H8z" fill={OWN.card} />
      </g>
    ),
    front: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M2 94h116v24H2z" fill={OWN.card} />
        <path d="M48 100h24v10H48z" fill="var(--trim-cloth)" strokeWidth="2.4" />
      </g>
    ),
  },
  "donut-bed": {
    back: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M2 96c0-13 26-22 58-22s58 9 58 22" fill={OWN.dough} />
        <path d="M8 92c4-10 26-15 52-15s48 5 52 15" fill="var(--pet-blush)" stroke="none" />
      </g>
    ),
    front: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M2 96c0 14 26 24 58 24s58-10 58-24c-14 8-34 12-58 12S16 104 2 96z" fill={OWN.dough} />
        <path d="M6 100c12 8 32 11 54 11s42-3 54-11c-2 6-20 12-54 12S8 106 6 100z" fill="var(--pet-blush)" stroke="none" />
        <path d="M20 104l4 2M40 108l5 1M76 108l5-1M96 104l4-2" stroke="var(--pool)" />
        <path d="M30 107l4 1M58 110h5M86 107l4-1" stroke={OWN.sunny} />
      </g>
    ),
  },
  "shell-bed": {
    back: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M6 96C4 70 30 54 60 54s56 16 54 42z" fill="var(--pet-blush)" />
        <path d="M60 56v38M36 62l10 32M84 62l-10 32M18 76l18 18M102 76l-18 18" stroke="var(--sun-soft)" strokeWidth="2.6" fill="none" />
      </g>
    ),
    front: () => <path d="M2 96c0 14 26 24 58 24s58-10 58-24c-12 6-32 10-58 10S14 102 2 96z" fill="var(--pet-cream)" stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" />,
  },
  "mug-bed": {
    back: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M8 86c0-9 23-15 52-15s52 6 52 15" fill="var(--surface)" />
        <path d="M14 86c0-5 20-9 46-9s46 4 46 9" fill="var(--pet-cocoa)" stroke="none" />
      </g>
    ),
    front: () => (
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round">
        <path d="M108 92c14-2 18 18 2 22" fill="none" strokeWidth="7" />
        <path d="M108 92c14-2 18 18 2 22" fill="none" stroke="var(--surface)" strokeWidth="3" />
        <path d="M8 86c0 8 23 14 52 14s52-6 52-14v22c0 7-23 12-52 12S8 115 8 108z" fill="var(--surface)" />
        <path d="M8 98c8 5 28 8 52 8s44-3 52-8v6c-8 5-28 8-52 8S16 109 8 104z" fill="var(--sun)" stroke="none" />
      </g>
    ),
  },
};

/** A thing in the flat room, at its slot (a bed is drawn by the nook). */
export function FlatDecor({ slot, id }: { slot: Exclude<DecorSlot, "bed">; id: string | null }) {
  const drawing = id ? DRAW[id] : undefined;
  if (!drawing) return null;
  const at = FLAT_AT[slot];
  return <g transform={`translate(${at.x} ${at.y}) scale(${at.scale})`}>{drawing.draw()}</g>;
}

/** The pet's bed, behind it and in front of it, on the nook's 120 × 120. */
export function BedBack({ id }: { id: string }) {
  return <>{(BEDS[id] ?? BEDS.basket).back()}</>;
}
export function BedFront({ id }: { id: string }) {
  return <>{(BEDS[id] ?? BEDS.basket).front()}</>;
}

/** A thing on its own, for a tile or a choice: the same drawing, framed to fit. */
export function DecorArt({ id, className }: { id: string; className?: string }) {
  const bed = BEDS[id];
  if (bed) {
    return (
      <svg className={className} viewBox="-4 50 128 74" aria-hidden="true">
        {bed.back()}
        {bed.front()}
      </svg>
    );
  }
  const drawing = DRAW[id];
  if (!drawing) return null;
  return (
    <svg className={className} viewBox={drawing.box.join(" ")} aria-hidden="true">
      <g stroke="var(--edge)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        {drawing.draw()}
      </g>
    </svg>
  );
}

/** Every id drawn flat: held to the catalog by `decor.test.ts`. */
export const DECOR_DRAWN = [...Object.keys(DRAW), ...Object.keys(BEDS)];
