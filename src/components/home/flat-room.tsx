import { useId, useState } from "react";
import { PetArt, PlayerArt, type Feeling, type GlassesName, type HatName, type PetForm, type Temper } from "@/components/pk";
import type { RoomDecor } from "@/lib/room/decor";
import { BedBack, BedFront, FlatDecor } from "./decor-art";

/** Day things show in Daylight, night things in Lamplight (`--pk-day` / `--pk-night`). */
const DAY = { opacity: "var(--pk-day)" };
const NIGHT = { opacity: "var(--pk-night)" };
const GLOW = { opacity: "calc(var(--pk-night) * 0.24)" };

export type FlatPet = { form: PetForm; temper: Temper; feeling: Feeling; wearing: string | null; seed: string; coat?: string; patch?: string };

/**
 * The room drawn flat: what shows before the 3D room is ready, and instead
 * of it when this device cannot draw it, when it fails, or when the player
 * asks for it. It is a place in its own right — a window with the day (or
 * the moon) in it, a lamp that is lit after dark, a shelf, a rug, and the
 * pet in its basket — so nothing in it is ever a cut-off shape.
 *
 * Three layers: the room (sliced to fill whatever width the frame has), the
 * player, and the pet in its bed, which is one unit so the bed always tucks
 * the pet in. The drawing is twice as wide as a phone shows: a phone sees
 * its middle, and a wide frame sees the door and the far side too, rather
 * than a close-up of the rug. The player's things stand in their places
 * (`decor-art.tsx`): a picture on the wall, a plant on the sill, the rug,
 * the bed, and something by the bed where the room is wide enough.
 */
export function FlatRoom({
  pet,
  colour,
  hop,
  hat,
  hatColour,
  glasses,
  decor,
}: {
  pet: FlatPet | null;
  colour: string;
  hop: number;
  /** What the player wears on the head, if anything; the peg doll wears the same. */
  hat?: HatName;
  hatColour?: string;
  glasses?: GlassesName;
  decor: RoomDecor;
}) {
  const id = useId().replace(/:/g, "");
  // The doll changing clothes squashes and stretches once; arriving, it does not.
  const dress = `${colour}|${hat ?? ""}|${hatColour ?? ""}|${glasses ?? ""}`;
  const [arrived] = useState(dress);
  return (
    <>
      <svg className="pk-room__scene" viewBox="-300 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <pattern id={`${id}-paper`} width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="9" cy="9" r="2.2" fill="var(--edge)" opacity="0.07" />
            <circle cx="27" cy="27" r="2.2" fill="var(--edge)" opacity="0.07" />
          </pattern>
        </defs>
        <g stroke="var(--edge)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <rect x="-320" y="-20" width="1240" height="340" fill={`url(#${id}-paper)`} stroke="none" />

          {/* the door, for a frame wide enough to show it */}
          <path d="M-262 300V96c0-22 14-34 34-34h56c20 0 34 12 34 34v204" fill="var(--trim-copper)" />
          <path d="M-246 300V108c0-14 8-24 22-24h48c14 0 22 10 22 24v192" fill="var(--surface)" strokeWidth="3" />
          <circle cx="-166" cy="200" r="6" fill="var(--sun)" strokeWidth="3" />

          {/* the window: the day, or the moon after dark */}
          <rect x="66" y="56" width="180" height="168" rx="20" fill="var(--pool-soft)" />
          <g stroke="none">
            <circle cx="206" cy="98" r="18" fill="var(--sun)" style={DAY} />
            <path d="M210 82a18 18 0 1 0 12 26 14 14 0 0 1-12-26z" fill="var(--pet-cream)" style={NIGHT} />
            <g fill="var(--pet-cream)" style={NIGHT}>
              <circle cx="104" cy="88" r="2.4" />
              <circle cx="150" cy="74" r="1.8" />
              <circle cx="128" cy="118" r="1.6" />
            </g>
            <path d="M92 160c0-10 9-16 18-14 4-9 17-11 23-3 9-2 16 5 15 13 7 1 10 6 9 11H92c-6 0-7-6 0-7z" fill="var(--surface)" style={DAY} />
          </g>
          <path d="M156 58v164M68 140h176" strokeWidth="5" />
          <rect x="66" y="56" width="180" height="168" rx="20" fill="none" />
          {/* curtains, tied back */}
          <path d="M44 44c10 50 30 84 40 112-10 30-24 52-36 76h-6V44z" fill="var(--surface)" />
          <path d="M268 44c-10 50-30 84-40 112 10 30 24 52 36 76h6V44z" fill="var(--surface)" />
          <path d="M70 150c6 4 12 8 18 8M242 150c-6 4-12 8-18 8" stroke="var(--sun-edge)" strokeWidth="5" />
          <path d="M30 44h252" strokeWidth="6" />
          {/* the sill, and a plant on it */}
          <rect x="52" y="222" width="208" height="16" rx="7" fill="var(--surface)" />
          <FlatDecor slot="corner" id={decor.corner} />

          {/* the lamp, lit after dark, over the far side */}
          <path d="M650 -10v70" strokeWidth="3" />
          <path d="M596 300l54-200 54 200z" fill="var(--sun)" stroke="none" style={GLOW} />
          <path d="M622 100c0-22 12-38 28-38s28 16 28 38z" fill="var(--sun)" />
          <path d="M642 100a8 8 0 0 0 16 0" fill="var(--pet-cream)" />

          {/* the picture on the wall, between the window and the shelf */}
          <FlatDecor slot="wall" id={decor.wall} />

          {/* a high shelf, clear of the pet's ears: three books and a plant */}
          <rect x="420" y="98" width="16" height="40" rx="3" fill="var(--pool)" />
          <rect x="438" y="92" width="18" height="46" rx="3" fill="var(--sun)" />
          <rect x="460" y="104" width="15" height="34" rx="3" fill="var(--sprout)" transform="rotate(10 467 138)" />
          <path d="M512 138l-3-20h26l-3 20z" fill="var(--trim-copper)" />
          <path d="M522 118c-6 8-8 22-6 34M524 118c6 6 10 18 10 30" fill="none" stroke="var(--sprout-edge)" strokeWidth="3" />
          <path d="M516 152c-6 0-10 4-10 8 6 0 10-3 10-8zM534 148c6-1 10 2 10 6-6 1-10-1-10-6zM522 120c-4-8-12-10-18-6 4 6 10 8 18 6zM526 118c2-8 10-12 16-8-2 6-8 10-16 8z" fill="var(--sprout)" strokeWidth="3" />
          <rect x="404" y="138" width="156" height="12" rx="5" fill="var(--trim-copper)" />
          <path d="M418 150l8 12M546 150l-8 12" strokeWidth="4" />

          {/* the floor */}
          <path d="M-320 300h1240v140H-320z" fill="var(--surface-sunk)" />
          <path d="M-320 340h1240M-320 384h1240M-130 300v40M90 300v40M310 300v40M520 300v40M740 300v40M-20 340v44M200 340v44M420 340v44M640 340v44M-160 384v40M60 384v40M340 384v40M620 384v40M840 384v40" stroke="var(--edge-soft)" strokeWidth="3" />
          <path d="M-320 300h1240" />
          <FlatDecor slot="side" id={decor.side} />
          <FlatDecor slot="rug" id={decor.rug} />
        </g>
      </svg>

      <div key={dress} className={dress === arrived ? "pk-room__who" : "pk-room__who pk-room__who--dressed"}>
        <PlayerArt color={colour} hat={hat} hatColor={hatColour} glasses={glasses} />
      </div>

      {/* The basket is there before the pet is: an empty one is waiting. */}
      <div className="pk-room__nook">
          <svg className="pk-room__bed" viewBox="0 0 120 120" aria-hidden="true">
            <BedBack id={decor.bed ?? "basket"} />
          </svg>
          {pet ? (
            <div key={hop} className={["pk-room__pet", hop ? "pk-room__pet--hop" : ""].join(" ")}>
              <PetArt {...pet} />
            </div>
          ) : null}
          <svg className="pk-room__bed" viewBox="0 0 120 120" aria-hidden="true">
            <BedFront id={decor.bed ?? "basket"} />
          </svg>
        </div>
    </>
  );
}
