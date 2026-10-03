import type { CSSProperties, ReactNode } from "react";

/**
 * The pets. Flat shapes, one outline weight, no gradients — and drawn to be
 * held: a big head on a small body, eyes set low and wide with a shine in
 * each, a blush, small paws resting on the rim.
 *
 * Every drawing is composed for the pocket rim: the head sits in the upper
 * two thirds, the paws land at y≈88 where the rim crests at 92, and
 * everything below y≈100 is hidden inside a frame.
 *
 * A pet's face is its record, not decoration. Temperament sets the face it
 * wears when all is well; a need (hungry, lonely, tired, scruffy) replaces
 * it until it is cared for; radiant adds a few sparks. What it wears is
 * drawn on it. None of this is randomised, so a pet looks the same on every
 * screen that draws it.
 *
 * Hook-free on purpose: the share card renders this tree as plain SVG.
 */

export type PetForm = "cat" | "dog" | "bun";
/** How a pet holds its face when nothing is wrong. */
export type Temper = "curious" | "cozy" | "brave" | "mischief";
/** What the pet's record says it feels, in the art's terms. */
export type Feeling = "radiant" | "happy" | "okay" | "hungry" | "lonely" | "tired" | "scruffy";

/** Every colour a pet is drawn in. Tokens by default; hex for a card drawn with no stylesheet. */
export interface PetPaint {
  ink: string;
  rim: string;
  coat: string;
  patch: string;
  eye: string;
  shine: string;
  blush: string;
  cream: string;
  cocoa: string;
  cloud: string;
  cloudShade: string;
  pool: string;
  poolEdge: string;
  sun: string;
  sunEdge: string;
  sprout: string;
  sproutEdge: string;
  foil: string;
  glass: string;
  surface: string;
}

const TOKENS: PetPaint = {
  ink: "var(--edge)",
  rim: "var(--surface)",
  coat: "",
  patch: "",
  eye: "var(--pet-eye)",
  shine: "var(--pet-shine)",
  blush: "var(--pet-blush)",
  cream: "var(--pet-cream)",
  cocoa: "var(--pet-cocoa)",
  cloud: "var(--pet-cloud)",
  cloudShade: "var(--pet-cloud-shade)",
  pool: "var(--pool)",
  poolEdge: "var(--pool-edge)",
  sun: "var(--sun)",
  sunEdge: "var(--sun-edge)",
  sprout: "var(--sprout)",
  sproutEdge: "var(--sprout-edge)",
  foil: "var(--trim-foil)",
  glass: "var(--trim-glass)",
  surface: "var(--surface)",
};

/** Each species' coat and patch, as token names in the paint. */
export const PET_COATS: Record<PetForm, { coat: string; patch: string }> = {
  cat: { coat: "var(--sun)", patch: "var(--sun-edge)" },
  dog: { coat: "var(--trim-copper)", patch: "var(--pet-cocoa)" },
  bun: { coat: "var(--pet-cloud)", patch: "var(--pet-cloud-shade)" },
};

/* ------------------------------------------------------------ geometry */

/** Where the face sits on each species, so faces and clothes are drawn once. */
const FACE: Record<PetForm, { eyeY: number; eyeL: number; eyeR: number; mouthY: number; cheekY: number; top: number; neck: number }> = {
  cat: { eyeY: 48, eyeL: 46, eyeR: 74, mouthY: 57.6, cheekY: 58, top: 19, neck: 72 },
  dog: { eyeY: 46, eyeL: 46, eyeR: 74, mouthY: 58, cheekY: 58, top: 21, neck: 72 },
  bun: { eyeY: 50, eyeL: 47.5, eyeR: 72.5, mouthY: 58.6, cheekY: 60, top: 25, neck: 74 },
};

function paws(lx: number, rx: number, y: number, coat: string, small = false) {
  const rxPaw = small ? 8.4 : 9.6;
  return [lx, rx].map((x) => (
    <g key={x}>
      <ellipse cx={x} cy={y} rx={rxPaw} ry={6.6} fill={coat} />
      <path d={`M${x - 3.4} ${y - 3.4}v2.6M${x} ${y - 4.4}v2.8M${x + 3.4} ${y - 3.4}v2.6`} strokeWidth="2" />
    </g>
  ));
}

/** A tail is drawn twice: a wide pass in ink, then the coat inside it. */
function tail(d: string, coat: string, ink: string, width = 8) {
  return (
    <g className="pk-pet-tail">
      <path d={d} stroke={ink} strokeWidth={width + 6} fill="none" />
      <path d={d} stroke={coat} strokeWidth={width} fill="none" />
    </g>
  );
}

/* ---------------------------------------------------------------- faces */

type EyeKind = "open" | "sparkle" | "smile" | "sleepy" | "wink";
type Brow = "none" | "brave" | "sad";
type Mouth = "species" | "grin" | "smirk" | "o" | "frown" | "drool";

interface Face {
  eyes: EyeKind;
  brow: Brow;
  mouth: Mouth;
  tilt: number;
  blush: number;
  extra?: "sparks" | "zzz" | "tear" | "tufts" | "drop";
}

/**
 * Temperament is the face at ease; a need overrides it until it is met.
 * Radiant is the face at ease with sparks around it.
 */
export function faceFor(temper: Temper, feeling: Feeling): Face {
  if (feeling === "hungry") return { eyes: "open", brow: "sad", mouth: "drool", tilt: 0, blush: 0.6, extra: "drop" };
  if (feeling === "lonely") return { eyes: "open", brow: "sad", mouth: "frown", tilt: 4, blush: 0.4, extra: "tear" };
  if (feeling === "tired") return { eyes: "sleepy", brow: "none", mouth: "o", tilt: 5, blush: 0.5, extra: "zzz" };
  if (feeling === "scruffy") return { eyes: "open", brow: "sad", mouth: "species", tilt: 0, blush: 0.4, extra: "tufts" };
  const base: Record<Temper, Face> = {
    curious: { eyes: "sparkle", brow: "none", mouth: "species", tilt: -7, blush: 0.85 },
    cozy: { eyes: "smile", brow: "none", mouth: "species", tilt: 3, blush: 1 },
    brave: { eyes: "open", brow: "brave", mouth: "grin", tilt: 0, blush: 0.7 },
    mischief: { eyes: "wink", brow: "none", mouth: "smirk", tilt: -3, blush: 0.85 },
  };
  const face = base[temper];
  return feeling === "radiant" ? { ...face, extra: "sparks", blush: 1 } : face;
}

function eye(kind: EyeKind, cx: number, cy: number, side: "l" | "r", p: PetPaint) {
  if (kind === "smile" || (kind === "wink" && side === "r")) {
    return <path d={`M${cx - 5.6} ${cy + 1.6}q5.6-7.4 11.2 0`} strokeWidth="3" fill="none" stroke={p.eye} />;
  }
  if (kind === "sleepy") {
    return <path d={`M${cx - 5.6} ${cy - 0.6}q5.6 5.6 11.2 0`} strokeWidth="3" fill="none" stroke={p.eye} />;
  }
  return (
    <>
      <ellipse cx={cx} cy={cy} rx="5.6" ry="6.8" fill={p.eye} stroke="none" />
      <circle cx={cx + 1.9} cy={cy - 2.5} r="2.3" fill={p.shine} stroke="none" />
      <circle cx={cx - 1.9} cy={cy + 2.4} r="1.1" fill={p.shine} stroke="none" />
      {kind === "sparkle" ? (
        <path
          d={`M${cx - 2.2} ${cy - 4.6}l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z`}
          fill={p.shine}
          stroke="none"
        />
      ) : null}
    </>
  );
}

function brows(kind: Brow, f: (typeof FACE)[PetForm], p: PetPaint) {
  if (kind === "none") return null;
  const y = f.eyeY - 11;
  const d =
    kind === "brave"
      ? `M${f.eyeL - 6} ${y - 1.5}l10.5 3.5M${f.eyeR + 6} ${y - 1.5}l-10.5 3.5`
      : `M${f.eyeL - 5.5} ${y + 1.5}l10-3.2M${f.eyeR + 5.5} ${y + 1.5}l-10-3.2`;
  return <path d={d} strokeWidth="2.6" stroke={p.eye} />;
}

function nose(form: PetForm, y: number, p: PetPaint) {
  if (form === "dog") {
    return (
      <>
        <ellipse cx="60" cy={y - 3.6} rx="5.8" ry="4.2" fill={p.eye} stroke="none" />
        <ellipse cx="58.4" cy={y - 5} rx="1.8" ry="1" fill={p.shine} stroke="none" />
      </>
    );
  }
  return <path d={`M56.8 ${y - 4}h6.4l-3.2 3.4z`} fill={p.blush} strokeWidth="1.8" />;
}

function mouth(kind: Mouth, form: PetForm, y: number, p: PetPaint) {
  const w = 2.2;
  if (kind === "grin") {
    return (
      <>
        <path d={`M52.6 ${y + 0.4}q7.4 9.4 14.8 0z`} fill={p.eye} strokeWidth={w} />
        <path d={`M55.6 ${y + 4.4}q4.4-2.6 8.8 0q-4.4 3.2-8.8 0z`} fill={p.blush} stroke="none" />
      </>
    );
  }
  if (kind === "smirk") {
    return (
      <>
        <path d={`M53.4 ${y + 1.6}c3.8 2.6 8.6 2.6 13.4-2.2`} strokeWidth={w} fill="none" />
        <path d={`M60.8 ${y + 2.4}c.2 3.4 1.6 5 3.2 5s2.6-1.8 2.2-5.4`} fill={p.blush} strokeWidth="1.8" />
      </>
    );
  }
  if (kind === "o") return <ellipse cx="60" cy={y + 2.4} rx="2.4" ry="2.8" fill={p.eye} stroke="none" />;
  if (kind === "frown") return <path d={`M55 ${y + 4}q5-4.6 10 0`} strokeWidth={w} fill="none" />;
  if (kind === "drool") {
    return (
      <>
        <ellipse cx="60" cy={y + 2.6} rx="3.6" ry="3.4" fill={p.eye} stroke="none" />
        <path d={`M64.6 ${y + 2.4}c1.2 1.8 1.6 3.4 1.6 4.6a1.6 1.6 0 0 1-3.2 0c0-1.2.4-2.8 1.6-4.6z`} fill={p.pool} strokeWidth="1.6" />
      </>
    );
  }
  // The species' own resting mouth.
  if (form === "dog") {
    return (
      <>
        <path d={`M60 ${y}v2.6M53.4 ${y + 1.4}c2 3.2 5.2 3.6 6.6 1.2 1.4 2.4 4.6 2 6.6-1.2`} strokeWidth={w} fill="none" />
        <path d={`M57.2 ${y + 3.4}c0 4.2 1.2 6.4 2.8 6.4s2.8-2.2 2.8-6.4z`} fill={p.blush} strokeWidth="1.8" />
      </>
    );
  }
  if (form === "bun") {
    return (
      <>
        <path d={`M60 ${y - 0.6}v2.2M56.4 ${y + 1.6}c1.2 1.8 2.8 1.8 3.6 0 .8 1.8 2.4 1.8 3.6 0`} strokeWidth={w} fill="none" />
        <path d={`M58.2 ${y + 1.8}h3.6v3.4h-3.6z`} fill={p.shine} strokeWidth="1.6" />
      </>
    );
  }
  return <path d={`M60 ${y - 0.6}v1.8M54 ${y + 1.2}c1.6 2.6 4.6 2.6 6 0 1.4 2.6 4.4 2.6 6 0`} strokeWidth={w} fill="none" />;
}

function extras(kind: Face["extra"], form: PetForm, p: PetPaint) {
  const f = FACE[form];
  if (kind === "sparks") {
    const spark = (x: number, y: number, s: number) =>
      `M${x} ${y - s}l${s * 0.3} ${s * 0.7} ${s * 0.7} ${s * 0.3}-${s * 0.7} ${s * 0.3}-${s * 0.3} ${s * 0.7}-${s * 0.3}-${s * 0.7}-${s * 0.7}-${s * 0.3} ${s * 0.7}-${s * 0.3}z`;
    return (
      <g className="pk-pet-sparks" fill={p.foil} strokeWidth="1.6">
        <path d={spark(14, 26, 6)} />
        <path d={spark(106, 18, 5)} />
        <path d={spark(104, 54, 3.6)} />
      </g>
    );
  }
  if (kind === "zzz") {
    return (
      <path
        className="pk-pet-zzz"
        d="M93 14h7l-7 8h7M103 4h5l-5 6h5"
        strokeWidth="2.2"
        fill="none"
        stroke={p.ink}
      />
    );
  }
  if (kind === "tear") {
    return (
      <path
        d={`M${f.eyeL - 3} ${f.eyeY + 7}c1.6 2.4 2.2 4.4 2.2 5.6a2.2 2.2 0 0 1-4.4 0c0-1.2.6-3.2 2.2-5.6z`}
        fill={p.pool}
        strokeWidth="1.6"
      />
    );
  }
  if (kind === "tufts") {
    return (
      <g fill="none" strokeWidth="2.2">
        <path d={`M48 ${f.top + 3}l3-6 2 5 3-6 2 6`} />
        <path d={`M86 ${f.eyeY + 2}l6-2-3 5 6-1`} />
        <ellipse cx="38" cy={f.cheekY + 8} rx="3.4" ry="2.2" fill={p.cocoa} stroke="none" opacity="0.55" />
        <ellipse cx="80" cy={f.top + 12} rx="2.6" ry="1.8" fill={p.cocoa} stroke="none" opacity="0.55" />
      </g>
    );
  }
  return null;
}

/* ------------------------------------------------------------- species */

function catBack(coat: string, p: PetPaint) {
  return tail("M86 88c13-1 20-9 20-21 0-6-3-10-7.6-10.4", coat, p.ink);
}
function catEars(coat: string, p: PetPaint) {
  return (
    <>
      <path d="M30.4 38 32.6 9.6c.2-2.6 2.6-3.6 4.6-2L57 22z" fill={coat} />
      <path d="M89.6 38 87.4 9.6c-.2-2.6-2.6-3.6-4.6-2L63 22z" fill={coat} />
      <path d="M35.6 30.4 37 15.4l11.4 8.6z" fill={p.blush} stroke="none" />
      <path d="M84.4 30.4 83 15.4l-11.4 8.6z" fill={p.blush} stroke="none" />
    </>
  );
}
function catHead(coat: string, patch: string, p: PetPaint) {
  return (
    <>
      <path d="M60 18c20 0 34 11.6 34 28.4 0 16.4-15.2 27.6-34 27.6S26 62.8 26 46.4C26 29.6 40 18 60 18z" fill={coat} />
      <path d="M60 20.4v7.4M51.6 22l1.8 6M68.4 22l-1.8 6" stroke={patch} strokeWidth="3.2" />
      <ellipse cx="54" cy="59.4" rx="7.2" ry="5.6" fill={p.cream} stroke="none" />
      <ellipse cx="66" cy="59.4" rx="7.2" ry="5.6" fill={p.cream} stroke="none" />
      <path d="M26.6 52.4 15 50M26.6 57.4 15.4 58.6M93.4 52.4 105 50M93.4 57.4l11.2 1.2" strokeWidth="1.9" />
    </>
  );
}

function dogBack(coat: string, p: PetPaint) {
  return tail("M86 86c10-3 15-11 14.6-21.4", coat, p.ink);
}
function dogHead(coat: string, patch: string, p: PetPaint) {
  return (
    <>
      <path d="M60 20c19 0 32 11.6 32 27.6S78.4 74 60 74 28 63.6 28 47.6 41 20 60 20z" fill={coat} />
      <ellipse cx="74.6" cy="45" rx="9.4" ry="9.8" fill={patch} stroke="none" />
      <path d="M60 50.6c8.4 0 15.4 4 15.4 9.6S68.6 70.6 60 70.6s-15.4-4.6-15.4-10.4 7-9.6 15.4-9.6z" fill={p.cream} stroke="none" />
    </>
  );
}
function dogEars(patch: string) {
  return (
    <g className="pk-pet-ears">
      <path d="M35.4 25.6C24.6 25 16.4 32.6 15 44.4c-1 8.6.8 17.6 6 20.4 4.2 2.2 8.4-.6 10.6-6.4 2.8-7.2 4.6-17.6 8.4-26.4-.6-4.2-1.8-6.4-4.6-6.4z" fill={patch} />
      <path d="M84.6 25.6c10.8-.6 19 7 20.4 18.8 1 8.6-.8 17.6-6 20.4-4.2 2.2-8.4-.6-10.6-6.4-2.8-7.2-4.6-17.6-8.4-26.4.6-4.2 1.8-6.4 4.6-6.4z" fill={patch} />
    </g>
  );
}

function bunBack(coat: string, full: boolean) {
  return <circle cx={full ? 89 : 91} cy={full ? 100 : 82} r="7.6" fill={coat} />;
}
function bunEars(coat: string, p: PetPaint) {
  return (
    <g className="pk-pet-ears">
      <path d="M44.6 31C37.6 19 35.4 6.4 40.2 3.4c5-3 11.6 7.4 14.6 25z" fill={coat} />
      <path d="M75.4 31C82.4 19 84.6 6.4 79.8 3.4c-5-3-11.6 7.4-14.6 25z" fill={coat} />
      <path d="M45.6 26.4c-4-8.4-5-15.6-2.6-17.2 2.6-1.4 6.2 5 8.4 16.6z" fill={p.blush} stroke="none" />
      <path d="M74.4 26.4c4-8.4 5-15.6 2.6-17.2-2.6-1.4-6.2 5-8.4 16.6z" fill={p.blush} stroke="none" />
    </g>
  );
}
function bunHead(coat: string, patch: string) {
  return (
    <>
      <path d="M60 25c18.4 0 31.4 11 31.4 26.8 0 14-13.6 24-31.4 24S28.6 65.8 28.6 51.8C28.6 36 41.6 25 60 25z" fill={coat} />
      <path d="M53.4 28.6c-.6-3.4 2.6-5.4 5-3.6 1.4-2.6 5.4-2.4 6 .6 2.6-.6 4 2.4 2.4 4.2" fill={patch} strokeWidth="2.2" />
    </>
  );
}

/* --------------------------------------------------------- clothes */

/**
 * A wearable drawn on the pet. Ids are `src/lib/closet/catalog.ts`'s; an id
 * this does not know draws nothing, which is the honest failure.
 */
function worn(id: string | null | undefined, form: PetForm, p: PetPaint, layer: "back" | "front") {
  if (!id) return null;
  const f = FACE[form];
  const n = f.neck;
  if (layer === "back") {
    if (id === "rain-cape") return <path d={`M30 ${n - 4}c-10 12-14 26-16 46h92c-2-20-6-34-16-46z`} fill={p.glass} />;
    if (id === "bee-wings") {
      const wing = (side: 1 | -1) => {
        const x = (v: number) => 60 + side * (v - 60);
        return (
          <g key={side}>
            <path d={`M${x(42)} ${n - 4}C${x(24)} ${n - 26} ${x(4)} ${n - 14} ${x(12)} ${n + 2}C${x(18)} ${n + 12} ${x(32)} ${n + 8} ${x(42)} ${n}z`} fill={p.cloud} />
            <path d={`M${x(40)} ${n - 2}C${x(30)} ${n - 6} ${x(22)} ${n - 10} ${x(16)} ${n - 8}`} stroke={p.cloudShade} strokeWidth="2" fill="none" />
          </g>
        );
      };
      return <g>{[wing(-1), wing(1)]}</g>;
    }
    if (id === "little-backpack") {
      return (
        <g>
          <rect x="74" y={n - 8} width="26" height="30" rx="8" fill={p.sun} />
          <path d={`M78 ${n + 4}h18`} stroke={p.sunEdge} strokeWidth="2.4" />
          <rect x="82" y={n + 8} width="10" height="7" rx="2" fill={p.sunEdge} strokeWidth="2" />
        </g>
      );
    }
    return null;
  }
  switch (id) {
    case "wool-scarf":
      return (
        <g>
          <path d={`M72 ${n + 1}c3 7 3.4 13 1.6 19l9.6-1.2c.8-6.6-.6-12.4-3.8-18.6z`} fill={p.pool} />
          <path d={`M75.2 ${n + 8.4}l6.2-.8M75.6 ${n + 13.6}l6.4-.8`} stroke={p.surface} strokeWidth="2.2" />
          <path d={`M33 ${n - 6}c17 8.6 37 8.6 54 0l1.6 8.4c-18 9-38.6 9-57.2 0z`} fill={p.pool} />
          <path d={`M42 ${n - 0.6}v6.6M52 ${n + 1.6}v6.8M62 ${n + 2}v6.8M72 ${n + 0.6}v6.8`} stroke={p.surface} strokeWidth="2.2" />
        </g>
      );
    case "red-collar":
      return (
        <g>
          <path d={`M36 ${n - 4}c15.6 6.4 32.4 6.4 48 0l1 5.4c-16.4 7-33.6 7-50 0z`} fill={p.sunEdge} />
          <path d={`M60 ${n + 3.4}v2.6`} strokeWidth="2" />
          <path
            d={`M60 ${n + 15}c-4.4-3-6.8-5.2-6.8-7.8a3.4 3.4 0 0 1 6.8-1.2 3.4 3.4 0 0 1 6.8 1.2c0 2.6-2.4 4.8-6.8 7.8z`}
            fill={p.foil}
            strokeWidth="2"
          />
        </g>
      );
    case "star-pin": {
      const x = form === "bun" ? 44 : 40;
      const y = form === "bun" ? f.top + 9 : f.top + 12;
      return (
        <path
          d={`M${x} ${y - 6.4}l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z`}
          fill={p.foil}
          strokeWidth="2"
        />
      );
    }
    case "rain-cape":
      return (
        <g>
          <path d={`M34 ${n - 6}c16.8 7.6 35.2 7.6 52 0l2 6.4c-18 8.6-38 8.6-56 0z`} fill={p.glass} />
          <circle cx="60" cy={n + 2.6} r="3.6" fill={p.foil} strokeWidth="2" />
        </g>
      );
    case "paper-crown": {
      const t = f.top + (form === "cat" ? 1 : form === "bun" ? 1 : -1);
      return (
        <g className="pk-pet-crown">
          <path d={`M45 ${t + 4}l-2-15 8.6 7.4L60 ${t - 13}l8.4 9.4 8.6-7.4-2 15c-10 2.6-20 2.6-30 0z`} fill={p.foil} />
          <circle cx="60" cy={t - 3} r="2" fill={p.sun} strokeWidth="1.6" />
        </g>
      );
    }
    case "nap-ribbon": {
      const x = form === "bun" ? 70 : 76;
      const y = form === "bun" ? 28 : f.top + 6;
      return (
        <g>
          <path d={`M${x} ${y}c-4-6-12-6-12 0s8 6 12 0zM${x} ${y}c4-6 12-6 12 0s-8 6-12 0z`} fill={p.sprout} />
          <circle cx={x} cy={y} r="3.2" fill={p.sproutEdge} strokeWidth="2" />
        </g>
      );
    }
    case "bow-tie":
      return (
        <g>
          <path d={`M60 ${n + 3}L46 ${n - 4}v14zM60 ${n + 3}l14-7v14z`} fill={p.pool} />
          <rect x="56" y={n - 0.6} width="8" height="7.4" rx="2.4" fill={p.poolEdge} strokeWidth="2.2" />
        </g>
      );
    case "bandana":
      return (
        <g>
          <path d={`M36 ${n - 4}Q60 ${n + 5} 84 ${n - 4}L60 ${n + 20}z`} fill={p.sprout} />
          <g fill={p.surface} stroke="none">
            <circle cx="51" cy={n + 3} r="1.8" />
            <circle cx="68" cy={n + 3} r="1.8" />
            <circle cx="60" cy={n + 10} r="1.8" />
          </g>
        </g>
      );
    case "bell-collar":
      return (
        <g>
          <path d={`M36 ${n - 4}c15.6 6.4 32.4 6.4 48 0l1 5.4c-16.4 7-33.6 7-50 0z`} fill={p.pool} />
          <circle cx="60" cy={n + 9.4} r="6" fill={p.foil} strokeWidth="2.2" />
          <path d={`M57 ${n + 11.6}h6`} strokeWidth="2" />
        </g>
      );
    case "little-backpack":
      // The straps, over the shoulders; the pack itself is drawn behind.
      return <path d={`M43 ${n - 4}c-2 8-2 16 0 24M77 ${n - 4}c2 8 2 16 0 24`} stroke={p.sunEdge} strokeWidth="4" fill="none" />;
    case "round-glasses": {
      const { eyeL: l, eyeR: r, eyeY: y } = f;
      return (
        <g fill="none" strokeWidth="2.6">
          <circle cx={l} cy={y} r="9.6" fill={p.shine} fillOpacity="0.22" />
          <circle cx={r} cy={y} r="9.6" fill={p.shine} fillOpacity="0.22" />
          <path d={`M${l + 9.6} ${y - 1}q${(r - l - 19.2) / 2} -4 ${r - l - 19.2} 0M${l - 9.6} ${y - 2}l-7-2.4M${r + 9.6} ${y - 2}l7-2.4`} />
        </g>
      );
    }
    case "heart-glasses": {
      const { eyeL: l, eyeR: r, eyeY: y } = f;
      const heart = (cx: number) =>
        `M${cx} ${y + 8}C${cx - 13} ${y} ${cx - 8} ${y - 10} ${cx} ${y - 3.4}C${cx + 8} ${y - 10} ${cx + 13} ${y} ${cx} ${y + 8}z`;
      return (
        <g strokeWidth="2.4">
          <path d={heart(l)} fill={p.blush} fillOpacity="0.62" />
          <path d={heart(r)} fill={p.blush} fillOpacity="0.62" />
          <path d={`M${l + 8} ${y - 2}q${(r - l - 16) / 2} -3.4 ${r - l - 16} 0`} fill="none" />
        </g>
      );
    }
    case "party-hat": {
      const t = f.top;
      return (
        <g>
          <path d={`M46 ${t + 6}L63 ${t - 25}l16 29c-11 4-22 4-33 0z`} fill={p.sun} />
          <path d={`M52 ${t - 3}l18 4M57 ${t - 13}l11 2.4`} stroke={p.sunEdge} strokeWidth="2.4" />
          <circle cx="63" cy={t - 26} r="4.4" fill={p.foil} strokeWidth="2.2" />
        </g>
      );
    }
    case "knit-beanie": {
      const t = f.top;
      return (
        <g>
          <path d={`M40 ${t + 8}C40 ${t - 13} 80 ${t - 13} 80 ${t + 8}z`} fill={p.pool} />
          <path d={`M50 ${t - 4}v9M60 ${t - 6}v11M70 ${t - 4}v9`} stroke={p.poolEdge} strokeWidth="2" />
          <rect x="37" y={t + 3} width="46" height="9" rx="4.5" fill={p.poolEdge} />
          <circle cx="60" cy={t - 11} r="5.4" fill={p.surface} strokeWidth="2.2" />
        </g>
      );
    }
    case "strawberry-hat": {
      const t = f.top;
      return (
        <g>
          <path d={`M41 ${t + 6}C41 ${t - 14} 79 ${t - 14} 79 ${t + 6}Q60 ${t + 13} 41 ${t + 6}z`} fill={p.blush} />
          <g fill={p.cream} stroke="none">
            <ellipse cx="50" cy={t} rx="1.4" ry="2" />
            <ellipse cx="60" cy={t + 3} rx="1.4" ry="2" />
            <ellipse cx="70" cy={t} rx="1.4" ry="2" />
            <ellipse cx="55" cy={t - 6} rx="1.4" ry="2" />
            <ellipse cx="65" cy={t - 6} rx="1.4" ry="2" />
          </g>
          <path d={`M60 ${t - 9}l-10-4 5 8zM60 ${t - 9}l10-4-5 8zM60 ${t - 9}l-3-8h6z`} fill={p.sprout} strokeWidth="2" />
        </g>
      );
    }
    case "flower-crown": {
      const t = f.top + 4;
      const flower = (x: number, y: number, fill: string) => (
        <g key={x}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={x + Math.cos((a * Math.PI) / 180) * 3.4}
              cy={y + Math.sin((a * Math.PI) / 180) * 3.4}
              r="3"
              fill={fill}
              strokeWidth="1.6"
            />
          ))}
          <circle cx={x} cy={y} r="2" fill={p.foil} strokeWidth="1.4" />
        </g>
      );
      return (
        <g>
          <path d={`M36 ${t + 4}Q60 ${t - 12} 84 ${t + 4}`} stroke={p.sproutEdge} strokeWidth="2.6" fill="none" />
          {flower(39, t + 2, p.blush)}
          {flower(50, t - 4, p.surface)}
          {flower(61, t - 6, p.blush)}
          {flower(72, t - 4, p.surface)}
          {flower(82, t + 2, p.blush)}
        </g>
      );
    }
    case "leaf-sprout": {
      const t = f.top;
      return (
        <g>
          <path d={`M60 ${t + 2}V${t - 10}`} stroke={p.sproutEdge} strokeWidth="2.8" fill="none" />
          <path d={`M60 ${t - 8}C52 ${t - 18} 43 ${t - 13} 45 ${t - 6}C49 ${t - 3} 56 ${t - 5} 60 ${t - 8}z`} fill={p.sprout} />
          <path d={`M60 ${t - 10}C67 ${t - 21} 77 ${t - 17} 76 ${t - 9}C72 ${t - 6} 65 ${t - 7} 60 ${t - 10}z`} fill={p.sprout} />
        </g>
      );
    }
    default:
      return null;
  }
}

/** Worn on the head, so they tilt with it; the rest hang from the neck. */
const ON_HEAD = new Set([
  "paper-crown",
  "nap-ribbon",
  "star-pin",
  "round-glasses",
  "heart-glasses",
  "party-hat",
  "knit-beanie",
  "strawberry-hat",
  "flower-crown",
  "leaf-sprout",
]);

/* ---------------------------------------------------------------- PetArt */

/** A small, stable offset from a name, so a park full of pets does not blink in step. */
function phase(seed: string | undefined): string | undefined {
  if (!seed) return undefined;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `-${(Math.abs(h) % 40) / 10}s`;
}

export function PetArt({
  form,
  temper = "curious",
  feeling = "happy",
  wearing,
  coat,
  patch,
  rim = false,
  pose = "rim",
  still = false,
  seed,
  className,
  colours,
}: {
  form: PetForm;
  /** `rim` peeks over a pocket or a basket; `full` is the whole pet, sitting, for the playground. */
  pose?: "rim" | "full";
  temper?: Temper;
  feeling?: Feeling;
  /** A wardrobe id; drawn on the pet. */
  wearing?: string | null;
  coat?: string;
  patch?: string;
  /** The pocket rim the paws rest on. Drawn inside the artwork, not over it. */
  rim?: boolean;
  still?: boolean;
  /** Anything stable about this pet (its name), to offset its blink from its neighbours'. */
  seed?: string;
  className?: string;
  /** Resolved colours, for a drawing made where no stylesheet applies (a share card). */
  colours?: Partial<PetPaint>;
}) {
  const p: PetPaint = { ...TOKENS, ...colours };
  const c = coat ?? colours?.coat ?? PET_COATS[form].coat;
  const pt = patch ?? colours?.patch ?? PET_COATS[form].patch;
  const face = faceFor(temper, feeling);
  const f = FACE[form];
  const life = still ? undefined : ({ "--pk-phase": phase(seed) } as CSSProperties);

  let back: ReactNode;
  let head: ReactNode;
  if (form === "cat") {
    back = catBack(c, p);
    head = (
      <>
        {catEars(c, p)}
        {catHead(c, pt, p)}
      </>
    );
  } else if (form === "dog") {
    back = dogBack(c, p);
    head = (
      <>
        {dogHead(c, pt, p)}
        {dogEars(pt)}
      </>
    );
  } else {
    back = bunBack(c, pose === "full");
    head = (
      <>
        {bunEars(c, p)}
        {bunHead(c, pt)}
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={className}
      style={life}
    >
      {/* A pet breathes on a 3.6s loop from a 50% 100% origin, so it
          settles on its feet; its eyes blink and its tail sways on the same
          life. All of it stops under reduced motion. */}
      <g transform={pose === "full" ? "translate(0 -2)" : "translate(0 4)"}>
      <g
        className={still ? undefined : "pk-breathe"}
        stroke={p.ink}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {worn(wearing, form, p, "back")}
        {back}
        {pose === "full" ? (
          <>
            <path d="M30 108c-2-24 11-41 30-41s32 17 30 41c-.5 6-6 10-12 10H42c-6 0-11.5-4-12-10z" fill={c} />
            {form === "bun" ? null : <ellipse cx="60" cy="100" rx="13" ry="11" fill={p.cream} stroke="none" />}
          </>
        ) : (
          <path d="M27 124V90c0-14.4 14.6-23 33-23s33 8.6 33 23v34z" fill={c} />
        )}
        <g transform={face.tilt ? `rotate(${face.tilt} 60 74)` : undefined}>
          {head}
          <ellipse cx={f.eyeL - 8.6} cy={f.cheekY} rx="5.2" ry="3.2" fill={p.blush} stroke="none" opacity={face.blush} />
          <ellipse cx={f.eyeR + 8.6} cy={f.cheekY} rx="5.2" ry="3.2" fill={p.blush} stroke="none" opacity={face.blush} />
          <g className="pk-pet-eyes">
            <g className={still || face.eyes === "smile" || face.eyes === "sleepy" ? undefined : "pk-blink"}>
              {eye(face.eyes, f.eyeL, f.eyeY, "l", p)}
              {eye(face.eyes, f.eyeR, f.eyeY, "r", p)}
            </g>
          </g>
          {brows(face.brow, f, p)}
          {nose(form, f.mouthY, p)}
          {mouth(face.mouth, form, f.mouthY, p)}
          {wearing && ON_HEAD.has(wearing) ? worn(wearing, form, p, "front") : null}
        </g>
        {wearing && !ON_HEAD.has(wearing) ? worn(wearing, form, p, "front") : null}
        {pose === "full" ? (
          <g className="pk-pet-feet">
            <ellipse cx="46" cy="115" rx="9" ry="5.6" fill={c} />
            <ellipse cx="74" cy="115" rx="9" ry="5.6" fill={c} />
          </g>
        ) : (
          paws(45, 75, 84, c, form === "bun")
        )}
        {extras(face.extra, form, p)}
      </g>
      </g>
      {rim ? (
        <>
          <path d="M-10 130V101Q60 83 130 101v29z" fill={p.rim} stroke="none" />
          <path d="M-10 101Q60 83 130 101" fill="none" stroke={p.ink} strokeWidth="3" />
        </>
      ) : null}
    </svg>
  );
}

/* ------------------------------------------------------------ WearableArt */

/**
 * A wearable on its own, for a tile on the shelf: the same piece the pet
 * wears, laid flat on a 64px grid.
 */
export function WearableArt({ id, className }: { id: string; className?: string }) {
  const p = TOKENS;
  let art: ReactNode = null;
  switch (id) {
    case "wool-scarf":
      art = (
        <>
          <path d="M8 20c15 8 33 8 48 0l2 9c-17 9-35 9-52 0z" fill={p.pool} />
          <path d="M40 27c3 9 3 18 .6 26l10.4-1.4c1.2-8.6-.6-16.8-4.4-25.4z" fill={p.pool} />
          <path d="M43.2 37l7-1M43.6 44l7.4-1M17 24.6v7.4M26 26.6v7.4M35 26.6v7.4" stroke={p.surface} strokeWidth="2.4" />
          <path d="M42 53l-1.6 5M46 52.4l-.4 5.2M50 51.6l.8 5" strokeWidth="2.2" />
        </>
      );
      break;
    case "paper-crown":
      art = (
        <>
          <path d="M12 46l-3-28 13 11 10-17 10 17 13-11-3 28c-13 4-27 4-40 0z" fill={p.foil} />
          <path d="M14 40c12 3 24 3 36 0" strokeWidth="2.2" />
          <circle cx="32" cy="34" r="3.4" fill={p.sun} strokeWidth="2" />
          <circle cx="20" cy="37" r="2" fill={p.surface} strokeWidth="1.6" />
          <circle cx="44" cy="37" r="2" fill={p.surface} strokeWidth="1.6" />
        </>
      );
      break;
    case "red-collar":
      art = (
        <>
          <ellipse cx="32" cy="24" rx="23" ry="10" fill="none" stroke={p.ink} strokeWidth="10" />
          <ellipse cx="32" cy="24" rx="23" ry="10" fill="none" stroke={p.sunEdge} strokeWidth="5" />
          <path d="M32 34v4" strokeWidth="2.2" />
          <path d="M32 56c-6.6-4.6-10.2-7.8-10.2-11.6a5 5 0 0 1 10.2-1.8 5 5 0 0 1 10.2 1.8c0 3.8-3.6 7-10.2 11.6z" fill={p.foil} />
        </>
      );
      break;
    case "star-pin":
      art = (
        <>
          <path d="M32 8l6.6 13.4 14.8 2.2-10.7 10.4 2.5 14.7L32 41.8l-13.2 6.9 2.5-14.7L10.6 23.6l14.8-2.2z" fill={p.foil} />
          <path d="M32 18.6v6M26.6 27.4h0" stroke={p.surface} strokeWidth="2.4" />
          <path d="M32 50v8" strokeWidth="2.2" />
        </>
      );
      break;
    case "rain-cape":
      art = (
        <>
          <path d="M20 12c-6 14-10 28-12 44h48c-2-16-6-30-12-44-8 4-16 4-24 0z" fill={p.glass} />
          <path d="M20 12c8 5 16 5 24 0" strokeWidth="2.4" />
          <path d="M22 34c-1 6-1.6 12-1.6 18M42 34c1 6 1.6 12 1.6 18" stroke={p.surface} strokeWidth="2.2" />
          <circle cx="32" cy="16" r="4" fill={p.foil} strokeWidth="2.2" />
        </>
      );
      break;
    case "nap-ribbon":
      art = (
        <>
          <path d="M32 30c-8-12-22-12-22 0s14 12 22 0zM32 30c8-12 22-12 22 0s-14 12-22 0z" fill={p.sprout} />
          <path d="M28 33l-6 20 7-4 3 7 1-22M36 33l6 20-7-4-3 7-1-22" fill={p.sprout} />
          <circle cx="32" cy="30" r="5" fill={p.sproutEdge} strokeWidth="2.2" />
        </>
      );
      break;
    case "bow-tie":
      art = (
        <>
          <path d="M32 32L10 20v24zM32 32l22-12v24z" fill={p.pool} />
          <path d="M16 26l6 6-6 6M48 26l-6 6 6 6" stroke={p.poolEdge} strokeWidth="2.2" fill="none" />
          <rect x="26" y="26" width="12" height="12" rx="4" fill={p.poolEdge} />
        </>
      );
      break;
    case "round-glasses":
      art = (
        <>
          <circle cx="19" cy="32" r="11" fill={p.glass} fillOpacity="0.25" strokeWidth="3.4" />
          <circle cx="45" cy="32" r="11" fill={p.glass} fillOpacity="0.25" strokeWidth="3.4" />
          <path d="M30 31q2-3 4 0M8 30l-4-3M56 30l4-3" strokeWidth="3" fill="none" />
          <path d="M14 27l3-3M40 27l3-3" stroke={p.surface} strokeWidth="2.2" />
        </>
      );
      break;
    case "party-hat":
      art = (
        <>
          <path d="M14 52L32 10l18 42c-12 4-24 4-36 0z" fill={p.sun} />
          <path d="M20 38l22 5M25 26l13 3" stroke={p.sunEdge} strokeWidth="2.6" />
          <circle cx="32" cy="9" r="5" fill={p.foil} />
        </>
      );
      break;
    case "bandana":
      art = (
        <>
          <path d="M6 18Q32 30 58 18L32 56z" fill={p.sprout} />
          <g fill={p.surface} stroke="none">
            <circle cx="22" cy="26" r="2.4" />
            <circle cx="42" cy="26" r="2.4" />
            <circle cx="32" cy="38" r="2.4" />
          </g>
        </>
      );
      break;
    case "knit-beanie":
      art = (
        <>
          <path d="M10 44C10 16 54 16 54 44z" fill={p.pool} />
          <path d="M22 28v14M32 24v18M42 28v14" stroke={p.poolEdge} strokeWidth="2.4" />
          <rect x="7" y="40" width="50" height="12" rx="6" fill={p.poolEdge} />
          <circle cx="32" cy="14" r="7" fill={p.surface} />
        </>
      );
      break;
    case "heart-glasses":
      art = (
        <>
          <path d="M19 44C5 34 8 20 19 27C30 20 33 34 19 44z" fill={p.blush} fillOpacity="0.7" strokeWidth="3" />
          <path d="M45 44C31 34 34 20 45 27C56 20 59 34 45 44z" fill={p.blush} fillOpacity="0.7" strokeWidth="3" />
          <path d="M28 29q4-3 8 0" strokeWidth="3" fill="none" />
        </>
      );
      break;
    case "bee-wings":
      art = (
        <>
          <path d="M32 34C26 14 8 10 6 22c-2 10 12 16 26 12zM32 34c6-20 24-24 26-12 2 10-12 16-26 12z" fill={p.cloud} />
          <path d="M32 34c-8 6-14 14-10 18 4 3 9-4 10-14M32 34c8 6 14 14 10 18-4 3-9-4-10-14" fill={p.cloud} />
          <path d="M28 30C22 24 16 20 12 21M36 30c6-6 12-10 16-9" stroke={p.cloudShade} strokeWidth="2.2" fill="none" />
        </>
      );
      break;
    case "little-backpack":
      art = (
        <>
          <path d="M24 12v-3a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" fill="none" strokeWidth="3" />
          <rect x="12" y="12" width="40" height="44" rx="12" fill={p.sun} />
          <rect x="20" y="34" width="24" height="14" rx="4" fill={p.sunEdge} />
          <path d="M20 26h24" stroke={p.sunEdge} strokeWidth="2.6" />
        </>
      );
      break;
    case "strawberry-hat":
      art = (
        <>
          <path d="M8 46C8 18 56 18 56 46Q32 56 8 46z" fill={p.blush} />
          <g fill={p.cream} stroke="none">
            <ellipse cx="20" cy="38" rx="2" ry="3" />
            <ellipse cx="32" cy="44" rx="2" ry="3" />
            <ellipse cx="44" cy="38" rx="2" ry="3" />
            <ellipse cx="26" cy="29" rx="2" ry="3" />
            <ellipse cx="38" cy="29" rx="2" ry="3" />
          </g>
          <path d="M32 20l-14-6 7 12zM32 20l14-6-7 12zM32 20l-4-12h8z" fill={p.sprout} strokeWidth="2.4" />
        </>
      );
      break;
    case "bell-collar":
      art = (
        <>
          <ellipse cx="32" cy="22" rx="23" ry="10" fill="none" stroke={p.ink} strokeWidth="10" />
          <ellipse cx="32" cy="22" rx="23" ry="10" fill="none" stroke={p.pool} strokeWidth="5" />
          <path d="M32 32v4" strokeWidth="2.2" />
          <circle cx="32" cy="46" r="10" fill={p.foil} />
          <path d="M26 50h12M32 50v6" strokeWidth="2.4" />
        </>
      );
      break;
    case "flower-crown":
      art = (
        <>
          <path d="M6 40Q32 18 58 40" stroke={p.sproutEdge} strokeWidth="3.4" fill="none" />
          {[
            [10, 36, p.blush],
            [21, 28, p.surface],
            [32, 25, p.blush],
            [43, 28, p.surface],
            [54, 36, p.blush],
          ].map(([x, y, fill]) => (
            <g key={`${x}`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle
                  key={a}
                  cx={(x as number) + Math.cos((a * Math.PI) / 180) * 4.4}
                  cy={(y as number) + Math.sin((a * Math.PI) / 180) * 4.4}
                  r="3.8"
                  fill={fill as string}
                  strokeWidth="2"
                />
              ))}
              <circle cx={x as number} cy={y as number} r="2.6" fill={p.foil} strokeWidth="1.8" />
            </g>
          ))}
        </>
      );
      break;
    case "leaf-sprout":
      art = (
        <>
          <path d="M32 58V30" stroke={p.sproutEdge} strokeWidth="4" fill="none" />
          <path d="M32 34C22 18 8 22 10 34c6 6 16 4 22 0z" fill={p.sprout} />
          <path d="M32 30C40 12 56 14 56 28c-6 7-17 6-24 2z" fill={p.sprout} />
          <path d="M16 31c5-2 10-1 14 2M38 26c5-3 10-4 14-2" stroke={p.sproutEdge} strokeWidth="2" fill="none" />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <g stroke={p.ink} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {art}
      </g>
    </svg>
  );
}
