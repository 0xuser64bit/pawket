import Link from "next/link";
import type { CSSProperties } from "react";
import { PetArt, type Feeling, type PetForm, type Temper } from "@/components/pk";

export interface ParkPet {
  address: string;
  name: string;
  look: { form: PetForm; temper: Temper; feeling: Feeling; wearing: string | null; seed: string };
  /** Cared for today, in UTC. */
  out: boolean;
}

/**
 * Where each pet stands, front row first. Depth is scale: the back row is
 * smaller and higher up the grass, so twelve pets read as a crowd in a
 * park rather than a grid. Nothing is random — a pet's spot is its rank.
 */
const SPOTS: Array<{ x: number; y: number; s: number }> = [
  { x: 16, y: 4, s: 1 },
  { x: 40, y: 2, s: 1 },
  { x: 63, y: 5, s: 1 },
  { x: 86, y: 3, s: 1 },
  { x: 28, y: 22, s: 0.76 },
  { x: 52, y: 24, s: 0.76 },
  { x: 75, y: 21, s: 0.76 },
  { x: 6, y: 25, s: 0.72 },
  { x: 95, y: 26, s: 0.7 },
  { x: 40, y: 37, s: 0.6 },
  { x: 64, y: 38, s: 0.6 },
  { x: 18, y: 39, s: 0.58 },
];
export const PARK_CAPACITY = SPOTS.length;

/** A pet's own pace, from its address: how long a wander takes and where in it they start. */
function pace(address: string): CSSProperties {
  let h = 0;
  for (let i = 0; i < address.length; i++) h = (h * 33 + address.charCodeAt(i)) | 0;
  const n = Math.abs(h);
  return { "--pk-wander": `${7 + (n % 50) / 10}s`, "--pk-wander-delay": `-${(n % 70) / 10}s` } as CSSProperties;
}

/**
 * The park, drawn: hills, trees, a bench and a path, the sun (or the moon
 * after dark), and the pets that are out, each wandering a little on its
 * spot with its name under it. Every pet is a link to its record. Server
 * rendered from chain; the motion is CSS and stops under reduced motion.
 */
export function ParkScene({ pets }: { pets: ParkPet[] }) {
  return (
    <div className="pk-parkscene">
      <svg className="pk-parkscene__land" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <g stroke="var(--edge)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="1040" cy="96" r="44" fill="var(--sun)" stroke="none" style={{ opacity: "var(--pk-day)" }} />
          <path d="M1050 56a44 44 0 1 0 30 64 34 34 0 0 1-30-64z" fill="var(--pet-cream)" stroke="none" style={{ opacity: "var(--pk-night)" }} />
          <g fill="var(--pet-cream)" stroke="none" style={{ opacity: "var(--pk-night)" }}>
            <circle cx="140" cy="70" r="3" />
            <circle cx="420" cy="44" r="2.4" />
            <circle cx="700" cy="90" r="2.6" />
            <circle cx="880" cy="40" r="2" />
          </g>
          <g fill="var(--surface)" stroke="none" opacity="0.85">
            <path d="M180 120c0-18 16-28 32-24 6-16 30-20 42-6 16-4 30 8 28 22 12 2 16 12 14 20H192c-14 0-16-12-12-12z" />
            <path d="M640 80c0-14 12-22 26-18 5-13 24-16 34-5 13-3 24 6 22 18 10 2 13 9 11 16H650c-11 0-13-10-10-11z" />
          </g>
          <path d="M-20 300C120 220 260 220 400 280s300 40 420-20 300-40 400 10v250H-20z" fill="var(--sprout-soft)" stroke="none" />
          {/* trees */}
          <path d="M150 300v-70" strokeWidth="10" stroke="var(--trim-copper)" />
          <circle cx="150" cy="200" r="52" fill="var(--sprout)" />
          <circle cx="118" cy="226" r="34" fill="var(--sprout)" />
          <circle cx="186" cy="230" r="30" fill="var(--sprout)" />
          <path d="M1000 296v-80" strokeWidth="10" stroke="var(--trim-copper)" />
          <circle cx="1000" cy="186" r="58" fill="var(--sprout)" />
          <circle cx="962" cy="214" r="36" fill="var(--sprout)" />
          <circle cx="1040" cy="218" r="32" fill="var(--sprout)" />
          <path d="M1120 300v-44" strokeWidth="8" stroke="var(--trim-copper)" />
          <circle cx="1120" cy="236" r="34" fill="var(--sprout)" />
          {/* the lawn and the path through it */}
          <path d="M-20 300h1240v240H-20z" fill="var(--sprout-soft)" />
          <path d="M420 540c40-80 120-150 260-200 70-25 150-36 240-40" fill="none" stroke="var(--surface-sunk)" strokeWidth="64" />
          <path d="M420 540c40-80 120-150 260-200 70-25 150-36 240-40" fill="none" stroke="var(--edge-soft)" strokeWidth="2" strokeDasharray="10 22" />
          {/* a bench and a lamp post */}
          <rect x="760" y="252" width="120" height="14" rx="5" fill="var(--trim-copper)" />
          <rect x="760" y="230" width="120" height="12" rx="5" fill="var(--trim-copper)" />
          <path d="M772 266v26M868 266v26" strokeWidth="6" />
          <path d="M300 300V196" strokeWidth="6" />
          <path d="M284 196h32l-6-22h-20z" fill="var(--sun)" />
          {/* flowers */}
          <g strokeWidth="3">
            <circle cx="90" cy="420" r="7" fill="var(--sun)" />
            <circle cx="112" cy="440" r="6" fill="var(--pet-blush)" />
            <circle cx="1110" cy="430" r="7" fill="var(--pool)" />
            <circle cx="1084" cy="452" r="6" fill="var(--sun)" />
            <circle cx="560" cy="330" r="5" fill="var(--pet-blush)" />
          </g>
        </g>
      </svg>

      <ul className="pk-parkscene__pets">
        {pets.slice(0, PARK_CAPACITY).map((pet, i) => {
          const spot = SPOTS[i];
          return (
            <li
              key={pet.address}
              className="pk-parkscene__pet"
              style={{ left: `${spot.x}%`, bottom: `${spot.y}%`, "--pk-depth": spot.s, zIndex: 20 - i, ...pace(pet.address) } as CSSProperties}
            >
              <Link href={`/pet/${pet.address}`} className="pk-parkscene__link" transitionTypes={["nav-forward"]}>
                <span className="pk-parkscene__walk">
                  <PetArt {...pet.look} pose="full" />
                </span>
                <span className={["pk-parkscene__tag", pet.out ? "pk-parkscene__tag--out" : ""].join(" ")}>
                  {pet.name}
                  <span className="pk-sr">{pet.out ? ", out today" : ""}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
