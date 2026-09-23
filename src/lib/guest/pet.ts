import { z } from "zod";
import { isWearableId } from "@/lib/closet/catalog";
import {
  BASE_XP_PER_LEVEL,
  CARE_COOLDOWN_SECONDS,
  DAILY_GOAL_REWARD_XP,
} from "@/lib/game/constants";
import {
  applyCareAction,
  applyStatDecay,
  calculateLevelFromXp,
  calculatePetMood,
  elapsedSecondsBetween,
  initialStats,
  validateCareCooldown,
  type CareCooldownResult,
} from "@/lib/game/math";
import {
  CareActionType,
  PetMood,
  PetPersonality,
  PetSpecies,
  type PetStats,
} from "@/lib/game/enums";
import { normalizePetName } from "@/lib/solana/pda";

/**
 * Wallet-free companion kept in this browser. Same locked care math as the
 * on-chain loop (`src/lib/game/`). A guest pet can graduate later because
 * names already follow `normalizePetName` and care deltas match the program.
 *
 * Version 2 adds the record a player can actually see: a care log, a UTC
 * streak, one wearable, and a once-a-day play bonus. Version 1 blobs still
 * load — see `migrateStoredPet`.
 */

const CARE_LOG_LIMIT = 40;

const statSchema = z.number().int().min(0).max(100);

const careLogEntrySchema = z.object({
  action: z.nativeEnum(CareActionType),
  at: z.string(),
  xpGained: z.number().int().nonnegative(),
});

const streakSchema = z.object({
  count: z.number().int().nonnegative(),
  /** UTC day `YYYY-MM-DD` of the last care or finished round. */
  lastDay: z.string().nullable(),
});

export const guestPetSchema = z.object({
  version: z.literal(2),
  id: z.string().min(1),
  name: z.string(),
  species: z.nativeEnum(PetSpecies),
  personality: z.nativeEnum(PetPersonality),
  stats: z.object({
    hunger: statSchema,
    happiness: statSchema,
    energy: statSchema,
    hygiene: statSchema,
  }),
  xp: z.number().int().nonnegative(),
  createdAt: z.string(),
  statsUpdatedAt: z.string(),
  lastActionAt: z.record(z.nativeEnum(CareActionType), z.string().nullable()),
  careLog: z.array(careLogEntrySchema).max(CARE_LOG_LIMIT),
  streak: streakSchema,
  wearing: z.string().nullable(),
  plays: z.number().int().nonnegative(),
  /** UTC day the daily play bonus was last granted, if ever. */
  lastDailyPlayDay: z.string().nullable(),
});

export type GuestPet = z.infer<typeof guestPetSchema>;
export type CareLogEntry = z.infer<typeof careLogEntrySchema>;

export interface AdoptGuestInput {
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  now?: Date;
}

/** Stable id so a migrated pet keeps the same profile URL across reloads. */
export function guestIdFrom(createdAt: string, name: string): string {
  let hash = 2166136261;
  const input = `${createdAt}\0${name}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousUtcDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, date));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

export function nextStreak(
  streak: GuestPet["streak"],
  now: Date,
): GuestPet["streak"] {
  const today = utcDay(now);
  if (streak.lastDay === today) return streak;
  if (streak.lastDay && streak.lastDay === previousUtcDay(today)) {
    return { count: streak.count + 1, lastDay: today };
  }
  return { count: 1, lastDay: today };
}

function emptyLastAction(): GuestPet["lastActionAt"] {
  return {
    [CareActionType.Feed]: null,
    [CareActionType.Play]: null,
    [CareActionType.Groom]: null,
    [CareActionType.Rest]: null,
  };
}

function isTimestamp(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/** Create a fresh guest pet. Throws `SolanaValidationError` on a bad name. */
export function createGuestPet(input: AdoptGuestInput): GuestPet {
  const now = (input.now ?? new Date()).toISOString();
  const name = normalizePetName(input.name);
  return {
    version: 2,
    id: guestIdFrom(now, name),
    name,
    species: input.species,
    personality: input.personality,
    stats: initialStats(),
    xp: 0,
    createdAt: now,
    statsUpdatedAt: now,
    lastActionAt: emptyLastAction(),
    careLog: [],
    streak: { count: 0, lastDay: null },
    wearing: null,
    plays: 0,
    lastDailyPlayDay: null,
  };
}

export interface ProjectedPet {
  /** Live stats: stored value decayed forward to `now`. Labeled estimate in UI. */
  stats: PetStats;
  mood: PetMood;
  level: number;
  /** XP earned since the current level started. */
  xpIntoLevel: number;
  /** XP that fills the current level. Always one level wide, not cumulative. */
  xpForNext: number;
  elapsedSeconds: number;
}

/** Pure projection — stored stats are the value at `statsUpdatedAt`. */
export function projectGuestPet(pet: GuestPet, now: Date = new Date()): ProjectedPet {
  const elapsedSeconds = elapsedSecondsBetween(pet.statsUpdatedAt, now);
  const stats = applyStatDecay(pet.stats, elapsedSeconds);
  const level = calculateLevelFromXp(pet.xp);
  return {
    stats,
    mood: calculatePetMood(stats),
    level,
    xpIntoLevel: pet.xp % BASE_XP_PER_LEVEL,
    xpForNext: BASE_XP_PER_LEVEL,
    elapsedSeconds,
  };
}

export type GuestCareResult =
  | { ok: true; pet: GuestPet; xpGained: number }
  | { ok: false; message: string };

/**
 * Apply one care action: decay forward, enforce cooldown, apply deltas, +XP,
 * append the log, and move the UTC streak. Pure — callers persist the pet.
 */
export function applyGuestCare(
  pet: GuestPet,
  action: CareActionType,
  now: Date = new Date(),
): GuestCareResult {
  const cooldown: CareCooldownResult = validateCareCooldown(
    pet.lastActionAt[action],
    action,
    now,
  );
  if (!cooldown.allowed) return { ok: false, message: cooldown.message };

  const elapsed = elapsedSecondsBetween(pet.statsUpdatedAt, now);
  const { stats, xpGained } = applyCareAction(
    applyStatDecay(pet.stats, elapsed),
    action,
  );
  const stamped = now.toISOString();
  return {
    ok: true,
    pet: {
      ...pet,
      stats,
      xp: pet.xp + xpGained,
      statsUpdatedAt: stamped,
      lastActionAt: { ...pet.lastActionAt, [action]: stamped },
      careLog: [...pet.careLog, { action, at: stamped, xpGained }].slice(-CARE_LOG_LIMIT),
      streak: nextStreak(pet.streak, now),
    },
    xpGained,
  };
}

/** Remaining cooldown per action in seconds (0 = ready). For countdown UI. */
export function cooldownsFor(
  pet: GuestPet,
  now: Date = new Date(),
): Record<CareActionType, number> {
  const out = {} as Record<CareActionType, number>;
  for (const action of Object.values(CareActionType)) {
    const result = validateCareCooldown(pet.lastActionAt[action], action, now);
    out[action] =
      result.allowed ? 0 : Math.min(result.remainingSeconds, CARE_COOLDOWN_SECONDS);
  }
  return out;
}

/**
 * Wear or take off one item. An unknown id is ignored. Wearing the item
 * that is already on takes it off. Looks only — stats are not copied.
 */
export function setWearing(pet: GuestPet, wearableId: string | null): GuestPet {
  if (wearableId !== null && !isWearableId(wearableId)) return pet;
  const wearing = pet.wearing === wearableId ? null : wearableId;
  return { ...pet, wearing };
}

export interface PlayRecord {
  pet: GuestPet;
  /** Daily bonus granted by this finish. Zero when today was already claimed. */
  xpGained: number;
}

/**
 * A finished playground round. The first finish of a UTC day grants
 * `DAILY_GOAL_REWARD_XP` and nothing else — stats, cooldowns, and wearables
 * stay put. Later finishes the same day still count as plays.
 */
export function recordPlay(pet: GuestPet, now: Date = new Date()): PlayRecord {
  const day = utcDay(now);
  const xpGained = pet.lastDailyPlayDay === day ? 0 : DAILY_GOAL_REWARD_XP;
  return {
    xpGained,
    pet: {
      ...pet,
      xp: pet.xp + xpGained,
      plays: pet.plays + 1,
      lastDailyPlayDay: day,
      streak: nextStreak(pet.streak, now),
    },
  };
}

const looseSchema = z.object({
  name: z.string().min(1),
  species: z.nativeEnum(PetSpecies),
  personality: z.nativeEnum(PetPersonality),
  stats: z.object({
    hunger: statSchema,
    happiness: statSchema,
    energy: statSchema,
    hygiene: statSchema,
  }),
  xp: z.number().int().nonnegative(),
  createdAt: z.string(),
  statsUpdatedAt: z.string(),
  lastActionAt: z.record(z.string(), z.string().nullable()).optional(),
  id: z.string().min(1).optional(),
  careLog: z.array(z.unknown()).optional(),
  streak: streakSchema.optional(),
  wearing: z.string().nullable().optional(),
  plays: z.number().int().nonnegative().optional(),
  lastDailyPlayDay: z.string().nullable().optional(),
});

function lastActionFrom(
  raw: Record<string, string | null> | undefined,
): GuestPet["lastActionAt"] {
  const out = emptyLastAction();
  if (!raw) return out;
  for (const action of Object.values(CareActionType)) {
    const value = raw[action];
    if (typeof value === "string" && isTimestamp(value)) out[action] = value;
  }
  return out;
}

function careLogFrom(raw: unknown[] | undefined): CareLogEntry[] {
  if (!raw) return [];
  const entries: CareLogEntry[] = [];
  for (const item of raw) {
    const parsed = careLogEntrySchema.safeParse(item);
    if (parsed.success && isTimestamp(parsed.data.at)) entries.push(parsed.data);
  }
  return entries.slice(-CARE_LOG_LIMIT);
}

/**
 * Read a stored blob as a version-2 pet. Version 1 records, and version 2
 * records with a damaged log entry, come back with defaults instead of
 * being thrown away. Garbage returns null.
 */
export function migrateStoredPet(raw: unknown): GuestPet | null {
  const direct = guestPetSchema.safeParse(raw);
  if (direct.success) {
    const wearing = direct.data.wearing && isWearableId(direct.data.wearing)
      ? direct.data.wearing
      : null;
    return wearing === direct.data.wearing ? direct.data : { ...direct.data, wearing };
  }

  const loose = looseSchema.safeParse(raw);
  if (!loose.success) return null;
  const stored = loose.data;
  if (!isTimestamp(stored.createdAt) || !isTimestamp(stored.statsUpdatedAt)) return null;

  const pet: GuestPet = {
    version: 2,
    id: stored.id ?? guestIdFrom(stored.createdAt, stored.name),
    name: stored.name,
    species: stored.species,
    personality: stored.personality,
    stats: stored.stats,
    xp: stored.xp,
    createdAt: stored.createdAt,
    statsUpdatedAt: stored.statsUpdatedAt,
    lastActionAt: lastActionFrom(stored.lastActionAt),
    careLog: careLogFrom(stored.careLog),
    streak: stored.streak ?? { count: 0, lastDay: null },
    wearing: stored.wearing && isWearableId(stored.wearing) ? stored.wearing : null,
    plays: stored.plays ?? 0,
    lastDailyPlayDay: stored.lastDailyPlayDay ?? null,
  };
  const parsed = guestPetSchema.safeParse(pet);
  return parsed.success ? parsed.data : null;
}
