import {
  BASE_XP_PER_LEVEL,
  CARE_COOLDOWN_SECONDS,
  INITIAL_STAT_VALUE,
  MAX_STAT,
  MIN_STAT,
  STAT_DECAY_PER_HOUR,
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

/**
 * Drains a companion's vitals for the time it spent unattended. Pure and
 * deterministic so the API can apply it lazily on read (the stored stats are the
 * value at `statsUpdatedAt`; the live value is this projection forward to `now`).
 */
export function applyStatDecay(stats: PetStats, elapsedSeconds: number): PetStats {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return { ...stats };
  }
  const hours = elapsedSeconds / 3600;
  return {
    hunger: clampStat(stats.hunger - STAT_DECAY_PER_HOUR.hunger * hours),
    happiness: clampStat(stats.happiness - STAT_DECAY_PER_HOUR.happiness * hours),
    energy: clampStat(stats.energy - STAT_DECAY_PER_HOUR.energy * hours),
    hygiene: clampStat(stats.hygiene - STAT_DECAY_PER_HOUR.hygiene * hours),
  };
}

/** Whole seconds between two instants, never negative. */
export function elapsedSecondsBetween(from: Date | string, to: Date = new Date()): number {
  const start = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((to.getTime() - start.getTime()) / 1000));
}

export function calculateLevelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / BASE_XP_PER_LEVEL) + 1;
}

export function calculateXpForNextLevel(level: number) {
  return Math.max(1, Math.floor(level)) * BASE_XP_PER_LEVEL;
}

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
): Omit<
  Pet,
  'id' | 'createdAt' | 'updatedAt' | 'statsUpdatedAt' | 'lastCaredAt' | 'lastCareActionType'
> {
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
