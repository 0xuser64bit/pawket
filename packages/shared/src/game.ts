import { CareActionType, PetMood } from './enums';
import { MAX_STAT, MIN_STAT } from './constants';

export type PetStats = {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  xp: number;
  level: number;
};
export function clampStat(value: number) {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}
export function calculateLevel(xp: number) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}
export function calculateMood(
  stats: Pick<PetStats, 'hunger' | 'happiness' | 'energy' | 'hygiene'>,
): PetMood {
  const score = (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4;
  if (stats.energy < 25) return PetMood.Tired;
  if (score >= 85) return PetMood.Radiant;
  if (score >= 65) return PetMood.Happy;
  if (score >= 40) return PetMood.Okay;
  return PetMood.Lonely;
}
export function applyCareAction(stats: PetStats, action: CareActionType): PetStats {
  const next = { ...stats, xp: stats.xp + 10 };
  if (action === CareActionType.Feed) next.hunger = clampStat(next.hunger + 18);
  if (action === CareActionType.Play) {
    next.happiness = clampStat(next.happiness + 18);
    next.energy = clampStat(next.energy - 8);
  }
  if (action === CareActionType.Groom) next.hygiene = clampStat(next.hygiene + 20);
  if (action === CareActionType.Rest) next.energy = clampStat(next.energy + 22);
  next.level = calculateLevel(next.xp);
  return next;
}
