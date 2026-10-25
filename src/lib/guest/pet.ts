import * as z from "@/lib/zod";
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
import { normalizePetName } from "@/lib/solana/names";

const CARE_LOG_LIMIT = 40;

const statSchema = z.int().check(z.minimum(0), z.maximum(100));
const countSchema = () => z.int().check(z.nonnegative());

const careLogEntrySchema = z.object({
  action: z.enum(CareActionType),
  at: z.string(),
  xpGained: countSchema(),
});

const streakSchema = z.object({
  count: countSchema(),
  lastDay: z.nullable(z.string()),
  best: z._default(countSchema(), 0),
});

export const guestPetSchema = z.object({
  version: z.literal(2),
  id: z.string().check(z.minLength(1)),
  name: z.string(),
  species: z.enum(PetSpecies),
  personality: z.enum(PetPersonality),
  stats: z.object({
    hunger: statSchema,
    happiness: statSchema,
    energy: statSchema,
    hygiene: statSchema,
  }),
  xp: countSchema(),
  createdAt: z.string(),
  statsUpdatedAt: z.string(),
  lastActionAt: z.record(z.enum(CareActionType), z.nullable(z.string())),
  careLog: z.array(careLogEntrySchema).check(z.maxLength(CARE_LOG_LIMIT)),
  streak: streakSchema,
  wearing: z.nullable(z.string()),
  plays: countSchema(),
  lastDailyPlayDay: z.nullable(z.string()),
});

export type GuestPet = z.infer<typeof guestPetSchema>;
type CareLogEntry = z.infer<typeof careLogEntrySchema>;

export interface AdoptGuestInput {
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  now?: Date;
}

function guestIdFrom(createdAt: string, name: string): string {
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

function nextStreak(
  streak: GuestPet["streak"],
  now: Date,
): GuestPet["streak"] {
  const today = utcDay(now);
  if (streak.lastDay === today) return streak;
  const count = streak.lastDay && streak.lastDay === previousUtcDay(today) ? streak.count + 1 : 1;
  return { count, lastDay: today, best: Math.max(streak.best, count) };
}

export function streakAsOf(
  streak: GuestPet["streak"],
  now: Date,
): { count: number; activeToday: boolean } {
  if (!streak.lastDay || streak.count === 0) return { count: 0, activeToday: false };
  const today = utcDay(now);
  if (streak.lastDay === today) return { count: streak.count, activeToday: true };
  if (streak.lastDay === previousUtcDay(today)) return { count: streak.count, activeToday: false };
  return { count: 0, activeToday: false };
}

export interface TodayGoals {
  cares: Record<CareActionType, boolean>;
  round: boolean;
  done: number;
  of: number;
}

export function todayFor(pet: Pick<GuestPet, "lastActionAt" | "lastDailyPlayDay">, now: Date = new Date()): TodayGoals {
  const today = utcDay(now);
  const cares = {} as Record<CareActionType, boolean>;
  for (const action of Object.values(CareActionType)) {
    const at = pet.lastActionAt[action];
    cares[action] = at !== null && isTimestamp(at) && utcDay(new Date(at)) === today;
  }
  const round = pet.lastDailyPlayDay === today;
  const done = Object.values(cares).filter(Boolean).length + (round ? 1 : 0);
  return { cares, round, done, of: 5 };
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
    streak: { count: 0, lastDay: null, best: 0 },
    wearing: null,
    plays: 0,
    lastDailyPlayDay: null,
  };
}

export function nameTaken(pets: readonly { name: string }[], name: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return pets.some((pet) => pet.name.trim().toLocaleLowerCase() === wanted);
}

export interface ProjectedPet {
  stats: PetStats;
  mood: PetMood;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  elapsedSeconds: number;
}

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

export function setWearing(pet: GuestPet, wearableId: string | null): GuestPet {
  if (wearableId !== null && !isWearableId(wearableId)) return pet;
  const wearing = pet.wearing === wearableId ? null : wearableId;
  return { ...pet, wearing };
}

export interface PlayRecord {
  pet: GuestPet;
  xpGained: number;
}

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
  name: z.string().check(z.minLength(1)),
  species: z.enum(PetSpecies),
  personality: z.enum(PetPersonality),
  stats: z.object({
    hunger: statSchema,
    happiness: statSchema,
    energy: statSchema,
    hygiene: statSchema,
  }),
  xp: countSchema(),
  createdAt: z.string(),
  statsUpdatedAt: z.string(),
  lastActionAt: z.optional(z.record(z.string(), z.nullable(z.string()))),
  id: z.optional(z.string().check(z.minLength(1))),
  careLog: z.optional(z.array(z.unknown())),
  streak: z.optional(streakSchema),
  wearing: z.optional(z.nullable(z.string())),
  plays: z.optional(countSchema()),
  lastDailyPlayDay: z.optional(z.nullable(z.string())),
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

export function migrateStoredPet(raw: unknown): GuestPet | null {
  const direct = guestPetSchema.safeParse(raw);
  if (direct.success) {
    const pet = direct.data;
    const wearing = pet.wearing && isWearableId(pet.wearing) ? pet.wearing : null;
    const best = Math.max(pet.streak.best, pet.streak.count);
    if (wearing === pet.wearing && best === pet.streak.best) return pet;
    return { ...pet, wearing, streak: { ...pet.streak, best } };
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
    streak: stored.streak
      ? { ...stored.streak, best: Math.max(stored.streak.best, stored.streak.count) }
      : { count: 0, lastDay: null, best: 0 },
    wearing: stored.wearing && isWearableId(stored.wearing) ? stored.wearing : null,
    plays: stored.plays ?? 0,
    lastDailyPlayDay: stored.lastDailyPlayDay ?? null,
  };
  const parsed = guestPetSchema.safeParse(pet);
  return parsed.success ? parsed.data : null;
}
