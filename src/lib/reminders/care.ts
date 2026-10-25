import { MOOD_SENTENCE } from "@/lib/game/appearance";
import { PetMood, type PetStats } from "@/lib/game/enums";
import { applyStatDecay, calculatePetMood } from "@/lib/game/math";

const NEEDS: ReadonlySet<PetMood> = new Set([PetMood.Hungry, PetMood.Tired, PetMood.Scruffy, PetMood.Lonely]);
const HORIZON_SECONDS = 3 * 24 * 60 * 60;
const LEAD_MS = 60 * 60 * 1000;
// ponytail: fixed waking hours; a setting if players ask for another.
const WAKE_HOUR = 9;
const SLEEP_HOUR = 21;

export interface CareReminder {
  at: Date;
  title: string;
  text: string;
}

export function firstNeed(pet: { stats: PetStats; statsUpdatedAt: string }): { at: Date; mood: PetMood } | null {
  const from = Date.parse(pet.statsUpdatedAt);
  if (!Number.isFinite(from)) return null;
  const moodAt = (seconds: number) => calculatePetMood(applyStatDecay(pet.stats, seconds));
  if (!NEEDS.has(moodAt(HORIZON_SECONDS))) return null;
  let calm = -1;
  let needy = HORIZON_SECONDS;
  while (needy - calm > 1) {
    const mid = Math.floor((calm + needy) / 2);
    if (NEEDS.has(moodAt(mid))) needy = mid;
    else calm = mid;
  }
  return { at: new Date(from + needy * 1000), mood: moodAt(needy) };
}

export function careReminder(pets: readonly { name: string; stats: PetStats; statsUpdatedAt: string }[], now: Date): CareReminder | null {
  let first: { name: string; at: Date; mood: PetMood } | null = null;
  for (const pet of pets) {
    const need = firstNeed(pet);
    if (need && (!first || need.at < first.at)) first = { name: pet.name, ...need };
  }
  if (!first) return null;
  const at = new Date(Math.max(first.at.getTime(), now.getTime() + LEAD_MS));
  if (at.getHours() >= SLEEP_HOUR) at.setDate(at.getDate() + 1);
  if (at.getHours() >= SLEEP_HOUR || at.getHours() < WAKE_HOUR) at.setHours(WAKE_HOUR, 0, 0, 0);
  return { at, title: `${first.name} ${MOOD_SENTENCE[first.mood]}`, text: "An estimate of time away. Look in on them at home." };
}
