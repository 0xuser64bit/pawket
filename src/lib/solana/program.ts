import {
  CareActionType,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";

/**
 * On-chain identity. Source of truth for everything the client derives or
 * encodes against the Pawket Anchor program.
 *
 * SAFETY (from the program audit — do not weaken without a program change):
 * 1. Never change PDA seed strings or their order.
 * 2. Care signer must remain `pet.owner`.
 * 3. Names are 2–24 UTF-8 bytes, trimmed by the client before derivation.
 * 4. SKUs are 2–32 UTF-8 bytes (PDA seed cap). Never raise to 64.
 * 5. `register_item` is not admin-gated and `record_purchase` moves no
 *    tokens — neither is a store checkout. No builders are provided for them.
 */

/** Must match `declare_id!` in the Anchor program. */
export const PAWKET_PROGRAM_ID =
  "FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef";

export const PAWKET_SEEDS = {
  gameConfig: "game_config",
  pet: "pet",
  passport: "passport",
  item: "item",
  ownership: "ownership",
} as const;

export const MAX_NAME_BYTES = 24;
export const MIN_NAME_BYTES = 2;
export const MAX_SKU_BYTES = 32;
export const MIN_SKU_BYTES = 2;

/**
 * Anchor 8-byte instruction discriminators.
 * After `anchor build`, these must be re-checked against the committed IDL.
 * Builders exist only for init / adopt / care.
 */
export const PAWKET_DISCRIMINATORS = {
  initializeGameConfig: [45, 61, 80, 55, 152, 63, 158, 47],
  adoptPet: [76, 210, 131, 114, 75, 135, 64, 171],
  performCareAction: [74, 53, 41, 221, 110, 244, 231, 218],
} as const;

/** Borsh variant indexes. Only this module translates string enums to bytes. */
export const PET_SPECIES_VARIANTS: Record<PetSpecies, number> = {
  [PetSpecies.LunaCat]: 0,
  [PetSpecies.MossPup]: 1,
  [PetSpecies.CloudBun]: 2,
};

export const PET_PERSONALITY_VARIANTS: Record<PetPersonality, number> = {
  [PetPersonality.Curious]: 0,
  [PetPersonality.Cozy]: 1,
  [PetPersonality.Brave]: 2,
  [PetPersonality.Mischief]: 3,
};

export const CARE_ACTION_VARIANTS: Record<CareActionType, number> = {
  [CareActionType.Feed]: 0,
  [CareActionType.Play]: 1,
  [CareActionType.Groom]: 2,
  [CareActionType.Rest]: 3,
};

/** Anchor custom errors 6000–6005, mapped to one-sentence UX copy. */
export const PAWKET_ERROR_CODES = {
  6000: "INVALID_PET_NAME",
  6001: "NOT_PET_OWNER",
  6002: "CARE_COOLDOWN_ACTIVE",
  6003: "INVALID_SKU",
  6004: "INACTIVE_ITEM",
  6005: "INVALID_QUANTITY",
} as const;

export type PawketErrorCode =
  (typeof PAWKET_ERROR_CODES)[keyof typeof PAWKET_ERROR_CODES];
