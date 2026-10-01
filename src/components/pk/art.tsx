import Link from "next/link";

/**
 * Flat geometry, 3px outline, built from the palette. There is no
 * photography in Pawket and no gradients. The pets themselves are in
 * `pet-art.tsx`; this file is the paw, the player and the mark.
 */

/**
 * A paw print, on a 64px grid with the same 3px outline the pets take. A
 * paw is a fragment, which is why it can stand in for a pet while something
 * loads without spending the pet itself — and it is the mark, since the paw
 * is what Pawket is named for.
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
        {form === "heart" ? (
          <>
            <path d="M32 56.5C22.4 50 15.6 44.7 15.6 37.6c0-5 3.8-8.6 8.4-8.6 3.6 0 6.2 1.9 8 4.8 1.8-2.9 4.4-4.8 8-4.8 4.6 0 8.4 3.6 8.4 8.6 0 7.1-6.8 12.4-16.4 18.9z" />
            <ellipse cx="11.6" cy="27.4" rx="5.4" ry="6.6" transform="rotate(-26 11.6 27.4)" />
            <ellipse cx="23.6" cy="16" rx="5.8" ry="7.2" transform="rotate(-9 23.6 16)" />
            <ellipse cx="40.4" cy="16" rx="5.8" ry="7.2" transform="rotate(9 40.4 16)" />
            <ellipse cx="52.4" cy="27.4" rx="5.4" ry="6.6" transform="rotate(26 52.4 27.4)" />
          </>
        ) : null}
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
 * care it is left for, drawn once.
 *
 * Two inks, so it survives a 16px favicon: `sun` beans with an `on-sun`
 * outline. The beans sit far enough apart that the gaps stay open at 16px;
 * check 16, 20 and 24px before changing any of it.
 */
export function Mark({
  size = 28,
  type = 22,
  glyphOnly = false,
  fill = "var(--sun)",
  ink = "var(--on-sun)",
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
  const glyph = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="pk-mark__glyph">
      <g fill={fill} stroke={ink} strokeWidth="2.2" strokeLinejoin="round">
        {/* the centre pad, which is a heart */}
        <path d="M16 29.6c-5.1-3.3-8.6-6.1-8.6-9.9 0-2.7 2-4.6 4.5-4.6 1.9 0 3.2 1 4.1 2.5.9-1.5 2.2-2.5 4.1-2.5 2.5 0 4.5 1.9 4.5 4.6 0 3.8-3.5 6.6-8.6 9.9z" />
        {/* four beans, arched */}
        <ellipse cx="4.7" cy="13.6" rx="2.9" ry="3.6" transform="rotate(-26 4.7 13.6)" />
        <ellipse cx="11.2" cy="6.9" rx="3.1" ry="3.9" transform="rotate(-9 11.2 6.9)" />
        <ellipse cx="20.8" cy="6.9" rx="3.1" ry="3.9" transform="rotate(9 20.8 6.9)" />
        <ellipse cx="27.3" cy="13.6" rx="2.9" ry="3.6" transform="rotate(26 27.3 13.6)" />
      </g>
    </svg>
  );

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
