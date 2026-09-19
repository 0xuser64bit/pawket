import { z } from "zod";
import {
  BASE_XP_PER_LEVEL,
  CARE_COOLDOWN_SECONDS,
} from "@/lib/game/constants";
import {
  applyCareAction,
  applyStatDecay,
  calculateLevelFromXp,
  calculatePetMood,
  elapsedSecondsBetween,
  initialStats,
  validateCareCooldown,
  xpForNextLevel,
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
 * Wallet-free guest companion. Same locked game math as the on-chain loop
 * (`src/lib/game/`), persisted to localStorage — the P0 gate from PRODUCT.md:
 * the full care loop must work with no wallet installed. A guest pet can
 * graduate to an on-chain adoption later because names already follow the
 * on-chain rule (`normalizePetName`) and stats follow the on-chain deltas.
 */

const statSchema = z.number().int().min(0).max(100);

export const guestPetSchema = z.object({
  version: z.literal(1),
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
});

export type GuestPet = z.infer<typeof guestPetSchema>;

export interface AdoptGuestInput {
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  now?: Date;
}

/** Create a fresh guest pet. Throws `SolanaValidationError` on a bad name. */
export function createGuestPet(input: AdoptGuestInput): GuestPet {
  const now = (input.now ?? new Date()).toISOString();
  return {
    version: 1,
    name: normalizePetName(input.name),
    species: input.species,
    personality: input.personality,
    stats: initialStats(),
    xp: 0,
    createdAt: now,
    statsUpdatedAt: now,
    lastActionAt: {
      [CareActionType.Feed]: null,
      [CareActionType.Play]: null,
      [CareActionType.Groom]: null,
      [CareActionType.Rest]: null,
    },
  };
}

export interface ProjectedPet {
  /** Live stats: stored value decayed forward to `now`. Labeled estimate in UI. */
  stats: PetStats;
  mood: PetMood;
  level: number;
  xpIntoLevel: number;
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
    xpForNext: xpForNextLevel(level),
    elapsedSeconds,
  };
}

export type GuestCareResult =
  | { ok: true; pet: GuestPet; xpGained: number }
  | { ok: false; message: string };

/**
 * Apply one care action: decay forward, enforce cooldown, apply deltas, +XP.
 * Pure — callers persist the returned pet.
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
