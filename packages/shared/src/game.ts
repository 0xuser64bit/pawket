import {
  BASE_XP_PER_LEVEL,
  CARE_COOLDOWN_SECONDS,
  INITIAL_STAT_VALUE,
  MAX_STAT,
  MIN_STAT,
  XP_PER_CARE_ACTION,
} from './constants';
import { CareActionType, PetMood } from './enums';
import type { AdoptPetInput, Pet, PetStats } from './schemas';

export type CareCooldownResult =
  | { allowed: true }
  | { allowed: false; remainingSeconds: number; message: string };

export function clampStat(value: number) {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

export function calculateLevelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / BASE_XP_PER_LEVEL) + 1;
}

export function calculateXpForNextLevel(level: number) {
  return Math.max(1, Math.floor(level)) * BASE_XP_PER_LEVEL;
}

// Backwards-compatible alias from the foundation scaffold.
export const calculateLevel = calculateLevelFromXp;

export function calculatePetMood(stats: PetStats): PetMood {
  if (stats.hunger < 25) return PetMood.Hungry;
  if (stats.energy < 25) return PetMood.Tired;
  if (stats.hygiene < 25) return PetMood.Scruffy;
  if (stats.happiness < 25) return PetMood.Lonely;

  const average = (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4;
  if (average >= 88) return PetMood.Radiant;
  if (average >= 68) return PetMood.Happy;
  return PetMood.Okay;
}

// Backwards-compatible alias from the foundation scaffold.
export const calculateMood = calculatePetMood;

export function applyCareAction(
  currentStats: PetStats,
  actionType: CareActionType,
): { stats: PetStats; xpGained: number } {
  const stats = { ...currentStats };

  switch (actionType) {
    case CareActionType.Feed:
      stats.hunger = clampStat(stats.hunger + 23);
      stats.happiness = clampStat(stats.happiness + 2);
      break;
    case CareActionType.Play:
      stats.hunger = clampStat(stats.hunger - 6);
      stats.happiness = clampStat(stats.happiness + 23);
      stats.energy = clampStat(stats.energy - 12);
      break;
    case CareActionType.Groom:
      stats.happiness = clampStat(stats.happiness + 3);
      stats.hygiene = clampStat(stats.hygiene + 25);
      break;
    case CareActionType.Rest:
      stats.energy = clampStat(stats.energy + 28);
      break;
  }

  return { stats, xpGained: XP_PER_CARE_ACTION };
}

export function validateCareCooldown(
  lastActionAt: Date | string | null | undefined,
  actionType: CareActionType,
  now: Date = new Date(),
): CareCooldownResult {
  if (!lastActionAt) return { allowed: true };

  const last = lastActionAt instanceof Date ? lastActionAt : new Date(lastActionAt);
  const elapsedSeconds = Math.floor((now.getTime() - last.getTime()) / 1000);
  const remainingSeconds = CARE_COOLDOWN_SECONDS - elapsedSeconds;

  if (remainingSeconds <= 0) return { allowed: true };

  const label = actionType.charAt(0).toUpperCase() + actionType.slice(1);
  const minutes = Math.ceil(remainingSeconds / 60);
  return {
    allowed: false,
    remainingSeconds,
    message: `${label} is cooling down. Try again in ${minutes}m.`,
  };
}

export function generateInitialPetState(
  input: AdoptPetInput,
): Omit<Pet, 'id' | 'createdAt' | 'updatedAt' | 'lastCaredAt' | 'lastCareActionType'> {
  const stats: PetStats = {
    hunger: INITIAL_STAT_VALUE,
    happiness: INITIAL_STAT_VALUE,
    energy: INITIAL_STAT_VALUE,
    hygiene: INITIAL_STAT_VALUE,
  };

  return {
    ownerWalletAddress: input.walletAddress,
    name: input.name,
    species: input.species,
    personality: input.personality,
    stats,
    xp: 0,
    level: calculateLevelFromXp(0),
    mood: calculatePetMood(stats),
  };
}
