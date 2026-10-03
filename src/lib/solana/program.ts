import {
  CareActionType,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";

/**
 * On-chain identity. Source of truth for everything the client derives,
 * encodes or decodes against the Pawket program (`programs/pawket/`), whose
 * IDL is committed at `./idl/pawket.json` — `program.test.ts` holds every
 * number below to it.
 *
 * SAFETY (do not weaken without a program change):
 * 1. Never change PDA seed strings or their order.
 * 2. Care, a round, dressing and a pet's guild are signed by `pet.owner` —
 *    or, for care, a round and dressing only, by the device the owner linked
 *    to their Pawket Wallet, inside its end date and daily limit.
 * 3. Names are 2–24 UTF-8 bytes, trimmed by the client before derivation.
 * 4. Nothing in the program moves value except rent, which `payer` covers on
 *    adoption, founding, joining and opening a Pawket Wallet — the owner, or
 *    the sponsor in `app/api/sponsor` — and which leaving or closing hands
 *    back to that payer; and a player's own Pawket Wallet, which only its
 *    owner fills or empties, and which refills a linked device by at most
 *    one fee per action it takes.
 */

/** Must match `declare_id!` in `programs/pawket/src/lib.rs`. */
export const PAWKET_PROGRAM_ID = "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74";

export const PAWKET_SEEDS = {
  pet: "pet",
  passport: "passport",
  guild: "guild",
  member: "member",
  wallet: "wallet",
} as const;

export const MAX_NAME_BYTES = 24;
export const MIN_NAME_BYTES = 2;

/** The program's `WEARABLE_COUNT`: wearables are numbered from 1 in catalog order. */
export const WEARABLE_COUNT = 18;

/** Cares the Passport keeps, newest overwriting oldest. */
export const RECENT_CARES = 8;

/** The program's guild limits: a slug is the guild's seed, a name and a motto are UTF-8 bytes. */
export const GUILD_LIMITS = {
  minSlug: 3,
  maxSlug: 24,
  minName: 3,
  maxName: 32,
  maxMotto: 80,
  /** Glyphs and colours a crest is drawn from (`src/lib/guilds/guild.ts`). */
  crests: 8,
  colours: 6,
} as const;

/** The program's Pawket Wallet limits, in seconds, actions and lamports. */
export const WALLET_LIMITS = {
  /** A device is linked for this long at most. */
  maxDeviceSeconds: 30 * 86_400,
  /** The most actions a device may take in one UTC day. */
  maxDailyActions: 500,
  /** What a device keeps on hand for its own fees. */
  deviceFloat: 1_000_000n,
  /** One signature's fee: a device's action is refilled by at most this much. */
  feePerSignature: 5_000n,
} as const;

/** Anchor 8-byte instruction discriminators. */
export const PAWKET_DISCRIMINATORS = {
  adoptPet: [76, 210, 131, 114, 75, 135, 64, 171],
  performCareAction: [74, 53, 41, 221, 110, 244, 231, 218],
  finishRound: [23, 104, 163, 186, 110, 225, 11, 242],
  dress: [131, 60, 37, 18, 58, 57, 110, 230],
  foundGuild: [251, 141, 105, 159, 238, 125, 44, 36],
  joinGuild: [242, 159, 183, 21, 140, 65, 110, 73],
  leaveGuild: [32, 129, 72, 117, 154, 8, 115, 245],
  openWallet: [201, 7, 112, 216, 203, 79, 88, 251],
  deposit: [242, 35, 198, 137, 82, 225, 242, 182],
  withdraw: [183, 18, 70, 156, 148, 109, 161, 34],
  linkDevice: [36, 224, 86, 186, 249, 32, 181, 136],
  unlinkDevice: [27, 24, 152, 248, 166, 199, 213, 128],
  closeWallet: [35, 212, 234, 224, 244, 208, 31, 204],
  careByDevice: [254, 225, 207, 10, 39, 224, 20, 95],
  finishRoundByDevice: [34, 205, 191, 224, 189, 124, 153, 227],
  dressByDevice: [10, 67, 181, 210, 10, 49, 167, 98],
} as const;

/** Anchor 8-byte account discriminators, and each account's size on chain. */
export const PAWKET_ACCOUNTS = {
  pet: { discriminator: [180, 195, 178, 241, 61, 123, 238, 32], size: 130 },
  passport: { discriminator: [197, 235, 164, 111, 43, 33, 153, 145], size: 169 },
  guild: { discriminator: [74, 176, 57, 164, 195, 188, 156, 237], size: 235 },
  member: { discriminator: [255, 176, 230, 246, 44, 246, 114, 56], size: 145 },
  wallet: { discriminator: [249, 205, 13, 235, 241, 145, 240, 173], size: 157 },
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

/** Anchor custom errors 6000–6015, mapped to one-sentence UX copy in `transactions.ts`. */
export const PAWKET_ERROR_CODES = {
  6000: "INVALID_PET_NAME",
  6001: "NOT_PET_OWNER",
  6002: "CARE_COOLDOWN_ACTIVE",
  6003: "UNKNOWN_WEARABLE",
  6004: "INVALID_GUILD_SLUG",
  6005: "INVALID_GUILD_NAME",
  6006: "INVALID_GUILD_MOTTO",
  6007: "UNKNOWN_CREST",
  6008: "INVALID_AMOUNT",
  6009: "INSUFFICIENT_BALANCE",
  6010: "INVALID_DEVICE_LINK",
  6011: "NOT_THIS_DEVICE",
  6012: "DEVICE_EXPIRED",
  6013: "DAILY_LIMIT_REACHED",
  6014: "NO_DEVICE_LINKED",
  6015: "DEVICE_STILL_LINKED",
} as const;

export type PawketErrorCode =
  (typeof PAWKET_ERROR_CODES)[keyof typeof PAWKET_ERROR_CODES];
