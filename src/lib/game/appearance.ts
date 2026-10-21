import type { Feeling, PetForm, Sky, Temper } from "@/components/pk";
import { CareActionType, PetMood, PetPersonality, PetSpecies, type PetStats } from "./enums";

export const SPECIES_ART: Record<PetSpecies, PetForm> = {
  [PetSpecies.LunaCat]: "cat",
  [PetSpecies.MossPup]: "dog",
  [PetSpecies.CloudBun]: "bun",
};

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

export const CARE_ACTION_LABEL: Record<CareActionType, string> = {
  [CareActionType.Feed]: "Feed",
  [CareActionType.Play]: "Play",
  [CareActionType.Groom]: "Brush",
  [CareActionType.Rest]: "Rest",
};

export const CARE_DONE_LABEL: Record<CareActionType, string> = {
  [CareActionType.Feed]: "Fed",
  [CareActionType.Play]: "Played",
  [CareActionType.Groom]: "Brushed",
  [CareActionType.Rest]: "Rested",
};

export const CARE_SEEN: Record<CareActionType, (name: string) => string> = {
  [CareActionType.Feed]: (name) => `${name} was fed`,
  [CareActionType.Play]: (name) => `${name} played`,
  [CareActionType.Groom]: (name) => `${name} was brushed`,
  [CareActionType.Rest]: (name) => `${name} had a rest`,
};

export const MOOD_LABEL: Record<PetMood, string> = {
  [PetMood.Radiant]: "Radiant",
  [PetMood.Happy]: "Happy",
  [PetMood.Okay]: "Okay",
  [PetMood.Hungry]: "Hungry",
  [PetMood.Lonely]: "Lonely",
  [PetMood.Tired]: "Tired",
  [PetMood.Scruffy]: "Scruffy",
};

export const PERSONALITY_TEMPER: Record<PetPersonality, Temper> = {
  [PetPersonality.Curious]: "curious",
  [PetPersonality.Cozy]: "cozy",
  [PetPersonality.Brave]: "brave",
  [PetPersonality.Mischief]: "mischief",
};

export const MOOD_FEELING: Record<PetMood, Feeling> = {
  [PetMood.Radiant]: "radiant",
  [PetMood.Happy]: "happy",
  [PetMood.Okay]: "okay",
  [PetMood.Hungry]: "hungry",
  [PetMood.Lonely]: "lonely",
  [PetMood.Tired]: "tired",
  [PetMood.Scruffy]: "scruffy",
};

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

export const MOOD_SENTENCE: Record<PetMood, string> = {
  [PetMood.Radiant]: "is radiant. Whatever you are doing, keep doing it.",
  [PetMood.Happy]: "is happy.",
  [PetMood.Okay]: "is okay. A little care would lift them.",
  [PetMood.Hungry]: "is hungry. A meal would help.",
  [PetMood.Lonely]: "is lonely. Play with them.",
  [PetMood.Tired]: "is tired. Let them rest.",
  [PetMood.Scruffy]: "is scruffy. A brush would help.",
};

const CARE_STAT: Record<CareActionType, keyof PetStats> = {
  [CareActionType.Feed]: "hunger",
  [CareActionType.Play]: "happiness",
  [CareActionType.Groom]: "hygiene",
  [CareActionType.Rest]: "energy",
};

export function suggestCare(stats: PetStats, resting: Record<CareActionType, number>): CareActionType | null {
  let best: CareActionType | null = null;
  for (const action of [CareActionType.Feed, CareActionType.Play, CareActionType.Groom, CareActionType.Rest]) {
    if (resting[action] > 0) continue;
    if (best === null || stats[CARE_STAT[action]] < stats[CARE_STAT[best]]) best = action;
  }
  return best;
}
