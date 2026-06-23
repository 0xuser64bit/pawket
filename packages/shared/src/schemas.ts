import { z } from 'zod';
import {
  CareActionType,
  ItemType,
  PassportEventType,
  PaymentStatus,
  PetMood,
  PetPersonality,
  PetSpecies,
} from './enums';

export const walletAddressSchema = z.string().trim().min(32).max(64);
export const petNameSchema = z.string().trim().min(2).max(24);
export const isoDateStringSchema = z.string().datetime();
export const utcDateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const petStatsSchema = z.object({
  hunger: z.number().int().min(0).max(100),
  happiness: z.number().int().min(0).max(100),
  energy: z.number().int().min(0).max(100),
  hygiene: z.number().int().min(0).max(100),
});

export const adoptPetRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  name: petNameSchema,
  species: z.nativeEnum(PetSpecies),
  personality: z.nativeEnum(PetPersonality),
});

export const carePetRequestSchema = z.object({
  walletAddress: walletAddressSchema,
  actionType: z.nativeEnum(CareActionType),
});

export const petSchema = z.object({
  id: z.string(),
  ownerWalletAddress: walletAddressSchema,
  name: petNameSchema,
  species: z.nativeEnum(PetSpecies),
  personality: z.nativeEnum(PetPersonality),
  stats: petStatsSchema,
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  mood: z.nativeEnum(PetMood),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
  // Instant the stored stats were last written. Clients can show "as of" / decay
  // context; the API uses it to project current vitals forward from rest.
  statsUpdatedAt: isoDateStringSchema,
  lastCaredAt: isoDateStringSchema.nullable(),
  lastCareActionType: z.nativeEnum(CareActionType).nullable(),
});

export const petResponseSchema = z.object({
  pet: petSchema.nullable(),
});

export const adoptPetResponseSchema = z.object({
  pet: petSchema,
});

export const carePetResponseSchema = z.object({
  pet: petSchema,
  passportEvent: z
    .object({
      id: z.string(),
      petId: z.string(),
      type: z.nativeEnum(PassportEventType),
      title: z.string(),
      description: z.string().nullable(),
      metadata: z.record(z.unknown()).nullable(),
      createdAt: isoDateStringSchema,
    })
    .optional(),
});

export const petPassportEventSchema = z.object({
  id: z.string(),
  petId: z.string(),
  type: z.nativeEnum(PassportEventType),
  title: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: isoDateStringSchema,
});

export const dailyGoalSchema = z.object({
  actionType: z.nativeEnum(CareActionType),
  title: z.string(),
  completed: z.boolean(),
  completedAt: isoDateStringSchema.nullable(),
});

export const dailyGoalRewardSchema = z.object({
  type: z.literal('bonus_xp'),
  xp: z.number().int().positive(),
  claimed: z.boolean(),
  claimedAt: isoDateStringSchema.nullable(),
});

export const dailyGoalsQuerySchema = z.object({
  walletAddress: walletAddressSchema,
});

export const claimDailyRewardRequestSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const dailyGoalsResponseSchema = z.object({
  today: utcDateKeySchema,
  walletAddress: walletAddressSchema,
  petId: z.string(),
  goals: z.array(dailyGoalSchema),
  completedGoals: z.number().int().min(0),
  totalGoals: z.number().int().min(0),
  allGoalsCompleted: z.boolean(),
  currentStreakDays: z.number().int().min(0),
  reward: dailyGoalRewardSchema.optional(),
});

export const claimDailyRewardResponseSchema = z.object({
  pet: petSchema,
  dailyGoals: dailyGoalsResponseSchema,
  passportEvent: petPassportEventSchema,
});

export const passportResponseSchema = z.object({
  petId: z.string(),
  events: z.array(petPassportEventSchema),
});

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const paymentIntentSchema = z.object({
  walletAddress: walletAddressSchema,
  sku: z.string().min(2).max(64),
  token: z.enum(['SOL', 'USDC']),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
});

export const itemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  type: z.nativeEnum(ItemType),
  price: z.string().optional(),
});

export const paymentStatusSchema = z.nativeEnum(PaymentStatus);

export type PetStats = z.infer<typeof petStatsSchema>;
export type Pet = z.infer<typeof petSchema>;
export type PetPassportEvent = z.infer<typeof petPassportEventSchema>;
export type DailyGoal = z.infer<typeof dailyGoalSchema>;
export type DailyGoalReward = z.infer<typeof dailyGoalRewardSchema>;
export type DailyGoalsQuery = z.infer<typeof dailyGoalsQuerySchema>;
export type ClaimDailyRewardInput = z.infer<typeof claimDailyRewardRequestSchema>;
export type DailyGoalsResponse = z.infer<typeof dailyGoalsResponseSchema>;
export type ClaimDailyRewardResponse = z.infer<typeof claimDailyRewardResponseSchema>;
export type AdoptPetInput = z.infer<typeof adoptPetRequestSchema>;
export type CarePetInput = z.infer<typeof carePetRequestSchema>;
export type AdoptPetResponse = z.infer<typeof adoptPetResponseSchema>;
export type PetResponse = z.infer<typeof petResponseSchema>;
export type CarePetResponse = z.infer<typeof carePetResponseSchema>;
export type PassportResponse = z.infer<typeof passportResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
