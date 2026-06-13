import { z } from 'zod';
import { CareActionType, ItemType, PaymentStatus, PetPersonality, PetSpecies } from './enums';

export const walletAddressSchema = z.string().min(32).max(44);
export const petNameSchema = z.string().trim().min(2).max(24);

export const adoptPetSchema = z.object({
  walletAddress: walletAddressSchema,
  name: petNameSchema,
  species: z.nativeEnum(PetSpecies),
  personality: z.nativeEnum(PetPersonality),
});

export const careActionSchema = z.object({
  walletAddress: walletAddressSchema,
  action: z.nativeEnum(CareActionType),
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
export type AdoptPetInput = z.infer<typeof adoptPetSchema>;
export type CareActionInput = z.infer<typeof careActionSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
