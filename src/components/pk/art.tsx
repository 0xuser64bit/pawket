import Link from "next/link";

/**
 * Flat geometry, 3px outline, built from the palette. There is no photography
 * in Pawket and no gradients. Every drawing is composed for the pocket rim:
 * the head sits in the upper half, the paws land at y≈82 where the rim
 * crests, and everything below y≈94 is hidden inside a frame.
 */

export type PetForm = "cat" | "dog" | "bird" | "bun";

const COATS: Record<PetForm, { coat: string; patch: string }> = {
  cat: { coat: "var(--sun)", patch: "var(--sun-edge)" },
  dog: { coat: "var(--trim-copper)", patch: "var(--trim-cloth)" },
  bird: { coat: "var(--pool)", patch: "var(--pool-edge)" },
  bun: { coat: "var(--bloom)", patch: "var(--bloom-edge)" },
};

function paws(lx: number, rx: number, y: number, coat: string) {
  return [lx, rx].map((x) => (
    <g key={x}>
      <ellipse cx={x} cy={y} rx="9" ry="6" fill={coat} />
      <path
        d={`M${x - 3.5} ${y - 3}v2.4M${x} ${y - 4}v2.6M${x + 3.5} ${y - 3}v2.4`}
        strokeWidth="2"
      />
    </g>
  ));
}

function body(form: PetForm, coat: string, patch: string, ink: string) {
  if (form === "dog") {
    return (
      <>
        <path d="M24 120V78a36 36 0 0 1 72 0v42z" fill={coat} />
        <path d="M36 16c-13 3-16 16-12 28 3 9 10 11 15 8z" fill={patch} />
        <path d="M84 16c13 3 16 16 12 28-3 9-10 11-15 8z" fill={patch} />
        <circle cx="60" cy="38" r="25" fill={coat} />
        <ellipse cx="60" cy="50" rx="15" ry="10.5" fill={patch} />
        <circle cx="50" cy="33" r="3.6" fill={ink} stroke="none" />
        <circle cx="70" cy="33" r="3.6" fill={ink} stroke="none" />
        <ellipse cx="60" cy="45" rx="5" ry="3.6" fill={ink} stroke="none" />
        <path d="M60 49v3.5M60 52.5c-2.5 3-6 3-8 .5M60 52.5c2.5 3 6 3 8 .5" />
        {paws(38, 82, 82, coat)}
      </>
    );
  }
  if (form === "bird") {
    return (
      <>
        <path d="M88 52c10 1 17 7 19 17-9 5-19 3-25-4z" fill={patch} />
        <ellipse cx="60" cy="54" rx="30" ry="32" fill={coat} />
        <path
          d="M74 34c9 5 13 16 12 27-2 9-9 14-16 14-6 0-9-4-9-9 0-12 5-25 13-32z"
          fill={patch}
        />
        <circle cx="60" cy="28" r="20" fill={coat} />
        <path d="M60 9c-2-7 1-9 5-9-2 4-1 6 1 8z" fill={patch} />
        <path d="M79 24 95 29 79 34z" fill="var(--trim-foil)" />
        <circle cx="52" cy="27" r="3.6" fill={ink} stroke="none" />
        <circle cx="68" cy="27" r="3.6" fill={ink} stroke="none" />
        <path d="M30 46c-7 4-10 10-10 17" strokeWidth="2.6" />
      </>
    );
  }
  if (form === "bun") {
    return (
      <>
        <path d="M26 120V84a34 34 0 0 1 68 0v36z" fill={coat} />
        <path d="M47 30c-7-13-9-26-4-29s11 6 13 24z" fill={coat} />
        <path d="M73 30c7-13 9-26 4-29s-11 6-13 24z" fill={coat} />
        <path d="M49 27c-4-9-6-18-3-20s6 5 7 17z" fill={patch} />
        <path d="M71 27c4-9 6-18 3-20s-6 5-7 17z" fill={patch} />
        <circle cx="60" cy="46" r="25" fill={coat} />
        <circle cx="51" cy="44" r="3.6" fill={ink} stroke="none" />
        <circle cx="69" cy="44" r="3.6" fill={ink} stroke="none" />
        <path d="M56 53h8l-4 4z" fill={ink} stroke="none" />
        <path d="M60 57v3M60 60c-2.5 3-6 3-8 .5M60 60c2.5 3 6 3 8 .5" />
        <path d="M94 70c8-1 12 3 12 7s-4 7-12 6" fill={patch} />
        {paws(39, 81, 83, coat)}
      </>
    );
  }
  return (
    <>
      <path
        d="M80 70c14-1 22-8 22-20"
        strokeWidth="9"
        stroke={coat}
        fill="none"
        strokeLinecap="round"
      />
      <path d="M26 120V76a34 34 0 0 1 68 0v44z" fill={coat} />
      <path d="M36 24 39 3l21 13z" fill={coat} />
      <path d="M84 24 81 3 60 16z" fill={coat} />
      <path d="M42 21 44 9l12 8z" fill={patch} strokeWidth="2" />
      <path d="M78 21 76 9 64 17z" fill={patch} strokeWidth="2" />
      <circle cx="60" cy="38" r="25" fill={coat} />
      <circle cx="50" cy="36" r="3.6" fill={ink} stroke="none" />
      <circle cx="70" cy="36" r="3.6" fill={ink} stroke="none" />
      <path d="M56 45h8l-4 4z" fill={ink} stroke="none" />
      <path d="M60 49v3M60 52c-2.5 3-6 3-8 .5M60 52c2.5 3 6 3 8 .5" />
      <path d="M35 41 19 37M35 47 19 48M85 41l16-4M85 47l16 1" strokeWidth="2" />
      {paws(38, 82, 82, coat)}
    </>
  );
}

export function PetArt({
  form,
  coat,
  patch,
  rim = false,
  still = false,
  className,
  colours,
}: {
  form: PetForm;
  coat?: string;
  patch?: string;
  /** The pocket rim the paws rest on. Drawn inside the artwork, not over it. */
  rim?: boolean;
  still?: boolean;
  className?: string;
  /** Resolved ink and rim, for a drawing made where no stylesheet applies (a share card). */
  colours?: { ink: string; rim: string };
}) {
  const base = COATS[form];
  const ink = colours?.ink ?? "var(--edge)";
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
    >
      {/* A pet breathes on a 3.6s loop from a 50% 100% origin, so it settles
          on its feet. It is the only looping animation in the product. */}
      <g
        className={still ? undefined : "pk-breathe"}
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {body(form, coat ?? base.coat, patch ?? base.patch, ink)}
      </g>
      {rim ? (
        <>
          <path d="M-10 130V94Q60 77 130 94v36z" fill={colours?.rim ?? "var(--surface)"} stroke="none" />
          <path d="M-10 94Q60 77 130 94" fill="none" stroke={ink} strokeWidth="3" />
        </>
      ) : null}
    </svg>
  );
}

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
      <path d="M40 30c0-11 9-19 20-19s20 8 20 19z" fill={color} />
      <path d="M80 30h16" strokeWidth="5" />
    </>
  ),
  bow: (color: string) => (
    <path
      d="M60 14c-6-7-16-6-16 2s10 9 16 2M60 14c6-7 16-6 16 2s-10 9-16 2"
      fill={color}
    />
  ),
  beanie: (color: string) => (
    <>
      <path d="M38 32c0-13 10-22 22-22s22 9 22 22z" fill={color} />
      <path d="M36 32h48" strokeWidth="5" />
    </>
  ),
};

export type HatName = keyof typeof HATS;

/**
 * The player is a peg doll: one colour for the whole figure, dot eyes and a
 * hat. There is no skin tone and no face beyond the eyes and mouth, so
 * expression comes from colour and accessory rather than from likeness.
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
        <path d="M30 120V78c0-17 13-28 30-28s30 11 30 28v42z" fill={color} />
        <path d="M30 92c-6 6-8 14-7 22M90 92c6 6 8 14 7 22" strokeWidth="9" stroke={color} />
        <circle cx="60" cy="34" r="22" fill={color} />
        {hat ? HATS[hat](hatColor ?? defaultHatColor[hat]) : null}
        <circle cx="52" cy="34" r="3.2" fill={ink} stroke="none" />
        <circle cx="68" cy="34" r="3.2" fill={ink} stroke="none" />
        <path d="M55 43c3 2.5 7 2.5 10 0" />
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
