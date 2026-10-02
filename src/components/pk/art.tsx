import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";

/**
 * Flat geometry, 3px outline, built from the palette. There is no
 * photography in Pawket and no gradients. The pets themselves are in
 * `pet-art.tsx`; this file is the paw, the player and the mark.
 */

/**
 * Pawket's own paw, on a 64 grid: four toe beans over a centre pad that is
 * a heart. Each bean is an egg, broader at its tip, leaning toward one point
 * below the pad, and every gap — bean to bean, bean to heart — is the same
 * 4.1, so the print reads as one thing. The heart is two circles meeting at
 * a rounded tip, plump because a pad is soft. The drawing sits 0.8 below
 * centre, where its weight balances.
 *
 * `shine` is a highlight per shape, every one lit from the upper right.
 */
export const PAW = {
  beans: [
    "M6.03 19.86C8.51 17.97 12.26 18.72 14.42 21.54C17.06 24.98 17.05 29.42 14.72 31.2C12.4 32.98 8.11 31.84 5.47 28.39C3.31 25.57 3.56 21.75 6.03 19.86Z",
    "M21.54 7.28C25.08 6.48 28.71 9.16 29.63 13.26C30.76 18.27 28.59 23.03 25.25 23.78C21.92 24.53 17.92 21.16 16.79 16.15C15.87 12.05 17.99 8.07 21.54 7.28Z",
    "M42.46 7.28C46.01 8.07 48.13 12.05 47.21 16.15C46.08 21.16 42.08 24.53 38.75 23.78C35.41 23.03 33.24 18.27 34.37 13.26C35.29 9.16 38.92 6.48 42.46 7.28Z",
    "M57.97 19.86C60.44 21.75 60.69 25.57 58.53 28.39C55.89 31.84 51.6 32.98 49.28 31.2C46.95 29.42 46.94 24.98 49.58 21.54C51.74 18.72 55.49 17.97 57.97 19.86Z",
  ],
  heart:
    "M32 34.63C30.1 31.35 26.24 29.76 22.59 30.74C18.94 31.72 16.4 35.04 16.4 38.82C16.4 48.24 24.28 51.63 30.11 57.66C30.6 58.18 31.29 58.47 32 58.47C32.71 58.47 33.4 58.18 33.89 57.66C39.72 51.63 47.6 48.24 47.6 38.82C47.6 35.04 45.06 31.72 41.41 30.74C37.76 29.76 33.9 31.35 32 34.63Z",
  shine: [
    "M10.57 21.28C11.8 21.69 12.9 22.65 13.56 23.87",
    "M23.96 10.01C25.26 10.43 26.4 11.57 27.05 13.08",
    "M41.82 9.91C43.09 10.17 44.12 11.17 44.63 12.62",
    "M55.07 21.08C56.24 21.21 57.16 21.94 57.56 23.04",
    "M40.35 33.58C41.96 33.93 43.33 34.99 44.05 36.47",
  ],
  /** The middle of each shape, the beans then the heart: where the loader grows it from. */
  centres: [
    [10.4, 25.5],
    [23.4, 15.5],
    [40.6, 15.5],
    [53.6, 25.5],
    [32, 44.5],
  ],
} as const;

const SHAPES = [...PAW.beans, PAW.heart];
const hundredths = (n: number) => Math.round(n * 100) / 100;

/**
 * The paw at a size, as the mark draws it. Its shape is carried by the
 * fill, so it is the same paw in Daylight and Lamplight: the keyline sits
 * outside each shape, and it is the one thing a dark room swallows.
 *
 * Keyline and shelf are sized in pixels, not with the drawing, so they stay
 * the system's weights at every size. From 40px each shape stands on a
 * `sun-edge` shelf, as a button does; from 56px each catches a highlight.
 * Below that the paw is flat, two inks, which is what a 16px tab can hold.
 *
 * `moving` is the loader's: each shape is wrapped so CSS can grow it in, and
 * each face so it can press into its shelf (`PawLoader`).
 */
export function PawGlyph({
  size,
  moving = false,
  fill = "var(--sun)",
  ink = "var(--on-sun)",
}: {
  size: number;
  moving?: boolean;
  fill?: string;
  ink?: string;
}) {
  const unit = 64 / size;
  const keyline = Math.max(1, size * 0.022) * unit;
  const shelf = size >= 40 ? hundredths(Math.max(2, size * 0.03) * unit) : 0;
  const lit = size >= 56;
  const lowered = `translate(0 ${shelf})`;

  // Every layer draws the five shapes in the same order: the beans left to right, then the heart.
  const each = (draw: (d: string, i: number) => ReactNode) =>
    SHAPES.map((d, i) =>
      moving ? (
        <g
          key={d}
          className="pk-paw__grow"
          style={{ "--i": i, transformOrigin: `${PAW.centres[i][0]}px ${PAW.centres[i][1]}px` } as CSSProperties}
        >
          {draw(d, i)}
        </g>
      ) : (
        <Fragment key={d}>{draw(d, i)}</Fragment>
      ),
    );
  const face = (d: string, i: number, shine?: string) => {
    const drawn = (
      <>
        <path d={d} />
        {shine ? <path d={shine} fill="none" stroke="var(--pet-shine)" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" /> : null}
      </>
    );
    return moving ? <g className={i < 4 ? "pk-paw__tap" : "pk-paw__beat"}>{drawn}</g> : drawn;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={moving ? ({ "--pk-shelf": `${shelf}px` } as CSSProperties) : undefined}
    >
      {/* the shelf adds depth below, so the drawing rises by half of it to stay centred */}
      <g transform={shelf ? `translate(0 ${-shelf / 2})` : undefined}>
        <g fill={ink} stroke={ink} strokeWidth={hundredths(keyline * 2)} strokeLinejoin="round">
          {each((d, i) => (
            <>
              {shelf ? <path d={d} transform={lowered} /> : null}
              {face(d, i)}
            </>
          ))}
        </g>
        {shelf ? <g fill="var(--sun-edge)">{each((d) => <path d={d} transform={lowered} />)}</g> : null}
        <g fill={fill}>{each((d, i) => face(d, i, lit ? PAW.shine[i] : undefined))}</g>
      </g>
    </svg>
  );
}

/**
 * A paw print, on a 64px grid with the same 3px outline the pets take: the
 * trail the pets leave across the front door.
 *
 * Four prints, told apart by silhouette alone: the cat's round beans, the
 * pup's broad pad with claws, the bun's long hind foot, and Pawket's own,
 * whose centre pad is a heart.
 */
export type PawPrint = "cat" | "dog" | "bun" | "heart";

const PAW_COATS: Record<PawPrint, string> = {
  cat: "var(--sun)",
  dog: "var(--trim-copper)",
  bun: "var(--bloom)",
  heart: "var(--pool)",
};

export function PawArt({ form, coat, className }: { form: PawPrint; coat?: string; className?: string }) {
  const fill = coat ?? PAW_COATS[form];
  return (
    <svg viewBox="0 0 64 64" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className={className}>
      <g stroke="var(--edge)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill={fill}>
        {form === "cat" ? (
          <>
            <path d="M32 31c6.4 0 10.4 5.2 13 9.6 2.4 4 4.6 6.2 4.6 9.4 0 4-3.3 6-6.8 6-3.6 0-6.2-1.7-10.8-1.7s-7.2 1.7-10.8 1.7c-3.5 0-6.8-2-6.8-6 0-3.2 2.2-5.4 4.6-9.4 2.6-4.4 6.6-9.6 13-9.6z" />
            <ellipse cx="12.5" cy="28" rx="5.4" ry="6.6" transform="rotate(-26 12.5 28)" />
            <ellipse cx="24" cy="16.5" rx="5.8" ry="7.2" transform="rotate(-9 24 16.5)" />
            <ellipse cx="40" cy="16.5" rx="5.8" ry="7.2" transform="rotate(9 40 16.5)" />
            <ellipse cx="51.5" cy="28" rx="5.4" ry="6.6" transform="rotate(26 51.5 28)" />
          </>
        ) : null}
        {form === "dog" ? (
          <>
            <path d="M32 28.5c8 0 14.5 7.4 16.4 13.6 1.4 4.6-.4 9.6-5.6 11-3.8 1-7-1.4-10.8-1.4s-7 2.4-10.8 1.4c-5.2-1.4-7-6.4-5.6-11C17.5 35.9 24 28.5 32 28.5z" />
            <ellipse cx="11" cy="27" rx="5.6" ry="7.4" transform="rotate(-24 11 27)" />
            <ellipse cx="23.4" cy="15" rx="6" ry="7.8" transform="rotate(-8 23.4 15)" />
            <ellipse cx="40.6" cy="15" rx="6" ry="7.8" transform="rotate(8 40.6 15)" />
            <ellipse cx="53" cy="27" rx="5.6" ry="7.4" transform="rotate(24 53 27)" />
            <path d="M7.4 18.4 5.6 14M21.4 6.6 20.6 2.4M42.6 6.6l.8-4.2M56.6 18.4 58.4 14" fill="none" strokeWidth="2.6" />
          </>
        ) : null}
        {form === "bun" ? (
          <>
            <path d="M32 24c6.6 0 9.6 6.6 9.6 15.4 0 9.4-3.6 19.6-9.6 19.6s-9.6-10.2-9.6-19.6C22.4 30.6 25.4 24 32 24z" />
            <ellipse cx="19.4" cy="17.6" rx="4.2" ry="5.4" transform="rotate(-24 19.4 17.6)" />
            <ellipse cx="27.6" cy="10.4" rx="4.4" ry="5.8" transform="rotate(-8 27.6 10.4)" />
            <ellipse cx="36.4" cy="10.4" rx="4.4" ry="5.8" transform="rotate(8 36.4 10.4)" />
            <ellipse cx="44.6" cy="17.6" rx="4.2" ry="5.4" transform="rotate(24 44.6 17.6)" />
          </>
        ) : null}
        {form === "heart" ? SHAPES.map((d) => <path key={d} d={d} />) : null}
      </g>
    </svg>
  );
}

const HATS = {
  cap: (color: string) => (
    <>
      <path d="M36 34c0-14 11-24 24-24s24 10 24 24z" fill={color} />
      <path d="M82 34h16" strokeWidth="5" />
    </>
  ),
  bow: (color: string) => (
    <path d="M60 14c-6-7-16-6-16 2s10 9 16 2M60 14c6-7 16-6 16 2s-10 9-16 2" fill={color} />
  ),
  beanie: (color: string) => (
    <>
      <path d="M34 36c0-15 11-26 26-26s26 11 26 26z" fill={color} />
      <path d="M33 36h54" strokeWidth="6" />
      <circle cx="60" cy="9" r="5.4" fill={color} />
    </>
  ),
};

export type HatName = keyof typeof HATS;

/**
 * The player is a peg doll: a wooden-cream face, one colour for the rest of
 * the figure, dot eyes, a blush and a hat. There is no skin tone and no
 * likeness, so expression comes from colour and accessory.
 */
export function PlayerArt({
  color = "var(--pool)",
  hat,
  hatColor,
  still = false,
  className,
}: {
  color?: string;
  hat?: HatName;
  hatColor?: string;
  still?: boolean;
  className?: string;
}) {
  const ink = "var(--edge)";
  const defaultHatColor = { cap: "var(--sun)", bow: "var(--bloom)", beanie: "var(--sprout)" };
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={[still ? "" : "pk-breathe", className].filter(Boolean).join(" ")}
    >
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="49" cy="116" rx="9" ry="4.6" fill={ink} />
        <ellipse cx="71" cy="116" rx="9" ry="4.6" fill={ink} />
        <path d="M34 114V86c0-15 11.6-25 26-25s26 10 26 25v28z" fill={color} />
        <ellipse cx="31" cy="92" rx="7" ry="11" fill={color} transform="rotate(14 31 92)" />
        <ellipse cx="89" cy="92" rx="7" ry="11" fill={color} transform="rotate(-14 89 92)" />
        <circle cx="60" cy="40" r="25" fill="var(--pet-cream)" />
        {hat ? HATS[hat](hatColor ?? defaultHatColor[hat]) : null}
        <ellipse cx="48" cy="49" rx="4.4" ry="2.6" fill="var(--pet-blush)" stroke="none" />
        <ellipse cx="72" cy="49" rx="4.4" ry="2.6" fill="var(--pet-blush)" stroke="none" />
        <circle cx="52" cy="42" r="3.4" fill="var(--pet-eye)" stroke="none" />
        <circle cx="68" cy="42" r="3.4" fill="var(--pet-eye)" stroke="none" />
        <circle cx="53.2" cy="40.8" r="1.2" fill="var(--pet-shine)" stroke="none" />
        <circle cx="69.2" cy="40.8" r="1.2" fill="var(--pet-shine)" stroke="none" />
        <path d="M55.6 50c2.8 2.4 6 2.4 8.8 0" stroke="var(--pet-eye)" />
      </g>
    </svg>
  );
}

/**
 * The mark: a paw print, because Pawket is named for paws. Four toe beans
 * over a centre pad that is a heart — the thing a pet leaves behind, and the
 * care it is left for, drawn once (`PAW`).
 *
 * In a bar it is two inks, `sun` with an `on-sun` keyline, and the gaps stay
 * open at 16px; drawn large it stands on its shelf and catches the light
 * (`PawGlyph`). Check 16, 24 and 96px in both rooms before changing any of it.
 */
export function Mark({
  size = 28,
  type = 22,
  glyphOnly = false,
  fill,
  ink,
  href,
  className,
}: {
  size?: number;
  type?: number;
  glyphOnly?: boolean;
  fill?: string;
  ink?: string;
  href?: string;
  className?: string;
}) {
  const glyph = <PawGlyph size={size} fill={fill} ink={ink} />;

  if (glyphOnly) return glyph;

  const inner = (
    <>
      {glyph}
      <span className="pk-mark__name" style={{ fontSize: `${type}px` }}>
        Pawket
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={["pk-mark", className].filter(Boolean).join(" ")}>
        {inner}
      </Link>
    );
  }
  return <span className={["pk-mark", className].filter(Boolean).join(" ")}>{inner}</span>;
}
