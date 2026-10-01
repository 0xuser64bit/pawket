import type { Feeling, PetForm, Sky, Temper } from "@/components/pk";
import { CareActionType, PetMood, PetPersonality, PetSpecies, type PetStats } from "./enums";

/**
 * How a domain pet is drawn. The species enum is lockstep with the on-chain
 * program (`PET_SPECIES_VARIANTS`), so it never changes shape for a picture
 * — this module is the one place that maps a record to the design system's
 * flat geometry, its sky tint and the words beside it.
 */

export const SPECIES_ART: Record<PetSpecies, PetForm> = {
  [PetSpecies.LunaCat]: "cat",
  [PetSpecies.MossPup]: "dog",
  [PetSpecies.CloudBun]: "bun",
};

/** The 3D model each species wears in the room (`public/3d/pets/`). */
export const SPECIES_MODEL: Record<PetSpecies, "cat" | "dog" | "bunny"> = {
  [PetSpecies.LunaCat]: "cat",
  [PetSpecies.MossPup]: "dog",
  [PetSpecies.CloudBun]: "bunny",
};

export const SPECIES_LABEL: Record<PetSpecies, string> = {
  [PetSpecies.LunaCat]: "Luna cat",
  [PetSpecies.MossPup]: "Moss pup",
  [PetSpecies.CloudBun]: "Cloud bun",
};

/** Backdrops behind a pet are limited to these three. Bloom means guild. */
export const SPECIES_SKY: Record<PetSpecies, Sky> = {
  [PetSpecies.LunaCat]: "warm",
  [PetSpecies.MossPup]: "plain",
  [PetSpecies.CloudBun]: "cool",
};

export const PERSONALITY_LABEL: Record<PetPersonality, string> = {
  [PetPersonality.Curious]: "Curious",
  [PetPersonality.Cozy]: "Cozy",
  [PetPersonality.Brave]: "Brave",
  [PetPersonality.Mischief]: "Mischief",
};

/** The verb on the care button. */
export const CARE_ACTION_LABEL: Record<CareActionType, string> = {
  [CareActionType.Feed]: "Feed",
  [CareActionType.Play]: "Play",
  [CareActionType.Groom]: "Brush",
  [CareActionType.Rest]: "Rest",
};

/** The verb after the care has happened. */
export const CARE_DONE_LABEL: Record<CareActionType, string> = {
  [CareActionType.Feed]: "Fed",
  [CareActionType.Play]: "Played",
  [CareActionType.Groom]: "Brushed",
  [CareActionType.Rest]: "Rested",
};

/** A care as someone else sees it happen, in the park: "Pepper was fed". */
export const CARE_SEEN: Record<CareActionType, (name: string) => string> = {
  [CareActionType.Feed]: (name) => `${name} was fed`,
  [CareActionType.Play]: (name) => `${name} played`,
  [CareActionType.Groom]: (name) => `${name} was brushed`,
  [CareActionType.Rest]: (name) => `${name} had a rest`,
};

/** A pet's mood is one word, shown on the frame. */
export const MOOD_LABEL: Record<PetMood, string> = {
  [PetMood.Radiant]: "Radiant",
  [PetMood.Happy]: "Happy",
  [PetMood.Okay]: "Okay",
  [PetMood.Hungry]: "Hungry",
  [PetMood.Lonely]: "Lonely",
  [PetMood.Tired]: "Tired",
  [PetMood.Scruffy]: "Scruffy",
};

/** The face a temperament wears when nothing is wrong. */
export const PERSONALITY_TEMPER: Record<PetPersonality, Temper> = {
  [PetPersonality.Curious]: "curious",
  [PetPersonality.Cozy]: "cozy",
  [PetPersonality.Brave]: "brave",
  [PetPersonality.Mischief]: "mischief",
};

/** The face a mood puts on. A need shows on the pet until it is met. */
export const MOOD_FEELING: Record<PetMood, Feeling> = {
  [PetMood.Radiant]: "radiant",
  [PetMood.Happy]: "happy",
  [PetMood.Okay]: "okay",
  [PetMood.Hungry]: "hungry",
  [PetMood.Lonely]: "lonely",
  [PetMood.Tired]: "tired",
  [PetMood.Scruffy]: "scruffy",
};

/**
 * Everything a drawing of this pet needs from its record: the species'
 * form, the face its temperament and mood make, and what it is wearing.
 * Spread it into a `PetFrame` or a `PetArt`.
 */
export function petLook(
  pet: { species: PetSpecies; personality: PetPersonality; wearing: string | null; name: string },
  mood?: PetMood,
) {
  return {
    form: SPECIES_ART[pet.species],
    temper: PERSONALITY_TEMPER[pet.personality],
    feeling: mood === undefined ? ("happy" as const) : MOOD_FEELING[mood],
    wearing: pet.wearing,
    seed: pet.name,
  };
}

/** What a mood sounds like in a sentence, after the pet's name. */
export const MOOD_SENTENCE: Record<PetMood, string> = {
  [PetMood.Radiant]: "is radiant. Whatever you are doing, keep doing it.",
  [PetMood.Happy]: "is happy.",
  [PetMood.Okay]: "is okay. A little care would lift them.",
  [PetMood.Hungry]: "is hungry. A meal would help.",
  [PetMood.Lonely]: "is lonely. Play with them.",
  [PetMood.Tired]: "is tired. Let them rest.",
  [PetMood.Scruffy]: "is scruffy. A brush would help.",
};

/** The vital each care looks after. */
const CARE_STAT: Record<CareActionType, keyof PetStats> = {
  [CareActionType.Feed]: "hunger",
  [CareActionType.Play]: "happiness",
  [CareActionType.Groom]: "hygiene",
  [CareActionType.Rest]: "energy",
};

/**
 * The care a pet would most like right now: the one for its lowest vital,
 * among those not resting. Null when every care is resting. Guidance only —
 * it picks which button wears sun, and changes no rule.
 */
export function suggestCare(stats: PetStats, resting: Record<CareActionType, number>): CareActionType | null {
  let best: CareActionType | null = null;
  for (const action of [CareActionType.Feed, CareActionType.Play, CareActionType.Groom, CareActionType.Rest]) {
    if (resting[action] > 0) continue;
    if (best === null || stats[CARE_STAT[action]] < stats[CARE_STAT[best]]) best = action;
  }
  return best;
}
