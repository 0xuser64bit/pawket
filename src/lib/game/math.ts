import {
  BASE_XP_PER_LEVEL,
  CARE_COOLDOWN_SECONDS,
  INITIAL_STAT_VALUE,
  MAX_STAT,
  MIN_STAT,
  STAT_DECAY_PER_HOUR,
  XP_PER_CARE_ACTION,
} from "./constants";
import { CareActionType, PetMood, type PetStats } from "./enums";

export type CareCooldownResult =
  | { allowed: true }
  | { allowed: false; remainingSeconds: number; message: string };

export function clampStat(value: number): number {
  return Math.max(MIN_STAT, Math.min(MAX_STAT, Math.round(value)));
}

/**
 * `round(value − rate × hours)`, clamped. Round half up is floor(x + ½); in
 * 36000ths of a point (rate in tenths per hour, time in whole seconds) every
 * term is an integer, so this is exact — and identical to `decayed` in the
 * program (`programs/pawket/src/lib.rs`).
 */
function decayStat(value: number, perHour: number, seconds: number): number {
  const scaled = value * 36_000 - Math.round(perHour * 10) * seconds + 18_000;
  return scaled <= 0 ? MIN_STAT : Math.min(MAX_STAT, Math.floor(scaled / 36_000));
}

/**
 * Drains vitals for time spent unattended. Pure and deterministic so callers
 * can project lazily: stored stats are the value at `statsUpdatedAt`, and the
 * live value is this function applied forward to now.
 */
export function applyStatDecay(
  stats: PetStats,
  elapsedSeconds: number,
): PetStats {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return { ...stats };
  }
  const seconds = Math.floor(elapsedSeconds);
  return {
    hunger: decayStat(stats.hunger, STAT_DECAY_PER_HOUR.hunger, seconds),
    happiness: decayStat(stats.happiness, STAT_DECAY_PER_HOUR.happiness, seconds),
    energy: decayStat(stats.energy, STAT_DECAY_PER_HOUR.energy, seconds),
    hygiene: decayStat(stats.hygiene, STAT_DECAY_PER_HOUR.hygiene, seconds),
  };
}

/** Whole seconds between two instants, never negative. */
export function elapsedSecondsBetween(
  from: Date | string,
  to: Date = new Date(),
): number {
  const start = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((to.getTime() - start.getTime()) / 1000));
}

export function calculateLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor(safeXp / BASE_XP_PER_LEVEL) + 1;
}

export function calculatePetMood(stats: PetStats): PetMood {
  if (stats.hunger < 25) return PetMood.Hungry;
  if (stats.energy < 25) return PetMood.Tired;
  if (stats.hygiene < 25) return PetMood.Scruffy;
  if (stats.happiness < 25) return PetMood.Lonely;

  const average =
    (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4;
  if (average >= 88) return PetMood.Radiant;
  if (average >= 68) return PetMood.Happy;
  return PetMood.Okay;
}

/**
 * Applies one care action to stats. Mirrors the on-chain deltas exactly;
 * `pnpm test` locks this (see `math.test.ts`).
 */
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
  // Clamp: a future timestamp (clock skew, restored state) must not extend
  // the cooldown past its full length.
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - last.getTime()) / 1000),
  );
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

export function initialStats(): PetStats {
  return {
    hunger: INITIAL_STAT_VALUE,
    happiness: INITIAL_STAT_VALUE,
    energy: INITIAL_STAT_VALUE,
    hygiene: INITIAL_STAT_VALUE,
  };
}
