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
}: {
  form: PetForm;
  coat?: string;
  patch?: string;
  /** The pocket rim the paws rest on. Drawn inside the artwork, not over it. */
  rim?: boolean;
  still?: boolean;
  className?: string;
}) {
  const base = COATS[form];
  const ink = "var(--edge)";
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
          <path d="M-10 130V94Q60 77 130 94v36z" fill="var(--surface)" stroke="none" />
          <path d="M-10 94Q60 77 130 94" fill="none" stroke={ink} strokeWidth="3" />
        </>
      ) : null}
    </svg>
  );
}

/**
 * A species' paw print, on a 64px grid with the same 3px outline the pets
 * take. A paw is a fragment, which is why it can stand in for a pet while
 * something loads without spending the pet itself.
 *
 * The four read apart by silhouette alone: a round cluster, the same cluster
 * with claws, a three-toed fan, and a long hind foot.
 */
export function PawArt({
  form,
  coat,
  className,
}: {
  form: PetForm;
  coat?: string;
  className?: string;
}) {
  const base = COATS[form];
  const fill = coat ?? base.coat;
  const ink = "var(--edge)";

  return (
    <svg viewBox="0 0 64 64" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className={className}>
      <g stroke={ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {form === "cat" ? (
          <>
            <ellipse cx="32" cy="43" rx="15" ry="11.5" fill={fill} />
            <circle cx="14.5" cy="27" r="5.6" fill={fill} />
            <circle cx="25" cy="20.5" r="6.2" fill={fill} />
            <circle cx="39" cy="20.5" r="6.2" fill={fill} />
            <circle cx="49.5" cy="27" r="5.6" fill={fill} />
          </>
        ) : null}

        {form === "dog" ? (
          <>
            <ellipse cx="32" cy="44" rx="16" ry="12" fill={fill} />
            <ellipse cx="13.5" cy="28" rx="5.2" ry="7" fill={fill} transform="rotate(-20 13.5 28)" />
            <ellipse cx="25" cy="20" rx="5.2" ry="7" fill={fill} transform="rotate(-8 25 20)" />
            <ellipse cx="39" cy="20" rx="5.2" ry="7" fill={fill} transform="rotate(8 39 20)" />
            <ellipse cx="50.5" cy="28" rx="5.2" ry="7" fill={fill} transform="rotate(20 50.5 28)" />
            <path d="M11.6 20.6 10 16.4M24 12.4 23.5 8M40 12.4 40.5 8M52.4 20.6 54 16.4" strokeWidth="2.4" />
          </>
        ) : null}

        {form === "bird" ? (
          <>
            {/* Drawn twice: the wide pass is the outline, the narrow pass the coat. */}
            <path d="M32 46 15 19M32 46 32 13M32 46 49 19" stroke={ink} strokeWidth="12.5" />
            <path d="M32 46 15 19M32 46 32 13M32 46 49 19" stroke={fill} strokeWidth="6.5" />
          </>
        ) : null}

        {form === "bun" ? (
          <>
            <ellipse cx="32" cy="37" rx="12" ry="19" fill={fill} />
            <circle cx="22" cy="17" r="4.2" fill={fill} />
            <circle cx="29" cy="12" r="4.2" fill={fill} />
            <circle cx="35" cy="12" r="4.2" fill={fill} />
            <circle cx="42" cy="17" r="4.2" fill={fill} />
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
 * The mark: a pocket with four pads arched above it, because a paw print and
 * a pocket are the same shape. The opening is worn as a collar, and the tag
 * hanging from it is a heart — the thing a pocket keeps, and the thing a paw
 * keeps at its centre, drawn once.
 *
 * The pocket is deeper than a pocket needs to be. That is what buys the two
 * units of clear space between the collar and the tag: below that the two
 * merge into one mass at 16px, which is where the first attempt at this died.
 * The ring between them is deliberately thinner than either, so it fades out
 * before it can blot.
 *
 * Two inks, so it survives a favicon. It never rotates, never takes a
 * gradient, never sits inside another shape, and never appears without the
 * pocket.
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
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* the pocket, deepened to make room for what hangs in it */}
      <rect x="2.5" y="10.8" width="27" height="19.2" rx="6.5" fill={fill} stroke={ink} strokeWidth="2.4" />
      {/* its opening, worn as a collar */}
      <path d="M5.6 14.4q10.4 2.6 20.8 0" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* the ring, thin enough to drop away before the shapes it joins do */}
      <path d="M16 17v2.6" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
      {/* the tag, hanging where a paw keeps its centre pad */}
      <path
        d="M16 27.4c-3.3-2.4-5-4-5-5.7a2.6 2.6 0 0 1 5-.9 2.6 2.6 0 0 1 5 .9c0 1.7-1.7 3.3-5 5.7z"
        fill={ink}
      />
      {/* four pads */}
      <circle cx="6.7" cy="6.1" r="2.55" fill={ink} />
      <circle cx="13.6" cy="3.1" r="2.8" fill={ink} />
      <circle cx="20.9" cy="3.5" r="2.8" fill={ink} />
      <circle cx="27.3" cy="7" r="2.4" fill={ink} />
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
