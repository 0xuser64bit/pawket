import type { Rarity, Sky } from "@/components/pk";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";

/**
 * Demo fixtures.
 *
 * Nothing in `src/lib/demo/` is real: no wallet, no RPC, no indexer, no
 * database. It exists so every screen in the product can be walked through
 * and reviewed end to end while the backend milestones are still open
 * (`docs/ROADMAP.md`). The shapes here are the props the screens need; when
 * a real source lands it replaces the fixture, not the screen.
 *
 * The UI marks itself as a preview wherever these are shown — see
 * `PreviewNote`. No screen may claim a demo figure is on-chain.
 */

export interface DemoPet {
  id: string;
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  rarity: Rarity;
  sky: Sky;
  level: number;
  /** Countable progress — the readout beside the meter, never a percentage. */
  xpIntoLevel: number;
  xpForNext: number;
  mood: string;
  adopted: string;
  where: string;
  traits: string[];
  care: { fed: number; played: number; brushed: number; perDay: number };
  careStreakDays: number;
  streakGoal: number;
  gamesThisWeek: number;
  gamesGoal: number;
  gamesTotal: number;
  wearing: Array<{ name: string; tone?: "sun" | "bloom" }>;
  slots: number;
  record: {
    token: string;
    mint: string;
    owner: string;
    minted: string;
    standard: string;
    verified: string;
  };
}

export const DEMO_PETS: DemoPet[] = [
  {
    id: "pepper",
    name: "Pepper",
    species: PetSpecies.LunaCat,
    personality: PetPersonality.Curious,
    rarity: "foil",
    sky: "warm",
    level: 7,
    xpIntoLevel: 740,
    xpForNext: 1000,
    mood: "Playful",
    adopted: "12 March",
    where: "at home",
    traits: ["Curious", "Night owl", "Long coat", "Left ear nick"],
    care: { fed: 2, played: 1, brushed: 3, perDay: 3 },
    careStreakDays: 5,
    streakGoal: 7,
    gamesThisWeek: 8,
    gamesGoal: 10,
    gamesTotal: 34,
    wearing: [
      { name: "Paper crown", tone: "sun" },
      { name: "Wool scarf" },
      { name: "Clover badge", tone: "bloom" },
    ],
    slots: 6,
    record: {
      token: "Pawket Pet #04182",
      mint: "PeT4…8kQz",
      owner: "7xKq…4Bd2",
      minted: "12 Mar 2026",
      standard: "Metaplex Core",
      verified: "2m ago",
    },
  },
  {
    id: "juniper",
    name: "Juniper",
    species: PetSpecies.CloudBun,
    personality: PetPersonality.Cozy,
    rarity: "glass",
    sky: "cool",
    level: 1,
    xpIntoLevel: 60,
    xpForNext: 100,
    mood: "Sleepy",
    adopted: "2 April",
    where: "resting",
    traits: ["Quiet", "Long ears", "Pale coat"],
    care: { fed: 3, played: 0, brushed: 1, perDay: 3 },
    careStreakDays: 1,
    streakGoal: 7,
    gamesThisWeek: 1,
    gamesGoal: 10,
    gamesTotal: 3,
    wearing: [],
    slots: 6,
    record: {
      token: "Pawket Pet #04206",
      mint: "JuN9…2wRt",
      owner: "7xKq…4Bd2",
      minted: "2 Apr 2026",
      standard: "Metaplex Core",
      verified: "2m ago",
    },
  },
];

export function findDemoPet(id: string): DemoPet | undefined {
  return DEMO_PETS.find((pet) => pet.id === id);
}

/** The pet whose room Home shows. */
export const ACTIVE_PET = DEMO_PETS[0];

/** The player, as a peg doll: one colour, dot eyes, a hat. */
export const PLAYER = {
  name: "Wren",
  placeName: "Your place",
  color: "var(--pool)",
  hat: "beanie" as const,
  balance: "2.41",
};

export const PRESENCE = [
  { name: "Tobi" },
  { name: "Ada" },
  { name: "Ines", note: "in the meadow" },
  { name: "Juno", away: true, note: "away 2h" },
];
