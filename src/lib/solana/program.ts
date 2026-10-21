import {
  CareActionType,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";

export const PAWKET_PROGRAM_ID = "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74";

export const PAWKET_SEEDS = {
  pet: "pet",
  passport: "passport",
  guild: "guild",
  member: "member",
  wallet: "wallet",
  closet: "closet",
  event: "event",
  rsvp: "rsvp",
  poll: "poll",
  ballot: "ballot",
  guestbook: "guestbook",
} as const;

export const MAX_NAME_BYTES = 24;
export const MIN_NAME_BYTES = 2;

export const WEARABLE_COUNT = 3;

export const MARKET = {
  wearables: 25,
  classicWearables: 15,
  firstRoom: 64,
  rooms: 12,
  firstFrame: 80,
  frames: 8,
  classicPrice: 20_000_000n,
  framePrice: 25_000_000n,
  wearablePrice: 50_000_000n,
  roomPrice: 100_000_000n,
  treasury: "SEpAw5iTAXf4j5YUsgpLD8UTKLCT6xqUAkecnvJvWfw",
} as const;

export const GATHERING_LIMITS = {
  minTitle: 3,
  maxTitle: 48,
  maxNote: 120,
  maxEventSeconds: 7 * 86_400,
  maxEventLeadSeconds: 60 * 86_400,
  checkInEarlySeconds: 15 * 60,
  minQuestion: 3,
  maxQuestion: 80,
  maxOption: 24,
  minOptions: 2,
  maxOptions: 4,
  minPollSeconds: 10 * 60,
  maxPollSeconds: 14 * 86_400,
} as const;

export const RECENT_WAVES = 8;

export const RECENT_CARES = 8;

export const GUILD_LIMITS = {
  minSlug: 3,
  maxSlug: 24,
  minName: 3,
  maxName: 32,
  maxMotto: 80,
  crests: 8,
  colours: 6,
} as const;

export const WALLET_LIMITS = {
  maxDeviceSeconds: 30 * 86_400,
  maxDailyActions: 500,
  deviceFloat: 1_000_000n,
  feePerSignature: 5_000n,
} as const;

export const PAWKET_DISCRIMINATORS = {
  settleWalletSpend: [50, 123, 140, 252, 104, 133, 31, 99],
  fundWalletSpend: [185, 137, 98, 107, 255, 123, 154, 87],
  buyWithWallet: [153, 110, 66, 10, 90, 11, 135, 96],
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
  buy: [102, 6, 61, 18, 1, 218, 235, 234],
  dressOwned: [149, 84, 132, 118, 14, 67, 69, 195],
  dressOwnedByDevice: [27, 170, 211, 215, 172, 224, 211, 8],
  createEvent: [49, 219, 29, 203, 22, 98, 100, 87],
  rsvp: [134, 164, 221, 33, 183, 12, 73, 32],
  checkIn: [209, 253, 4, 217, 250, 241, 207, 50],
  createPoll: [182, 171, 112, 238, 6, 219, 14, 110],
  vote: [227, 110, 155, 23, 136, 126, 172, 25],
  wave: [225, 175, 48, 85, 221, 5, 244, 230],
  adoptPetByDevice: [199, 69, 64, 219, 74, 193, 42, 154],
  foundGuildByDevice: [171, 76, 208, 79, 212, 231, 149, 101],
  joinGuildByDevice: [19, 229, 151, 50, 203, 115, 249, 143],
  leaveGuildByDevice: [101, 182, 35, 198, 122, 92, 19, 215],
  createEventByDevice: [146, 126, 209, 238, 114, 7, 180, 181],
  rsvpByDevice: [165, 218, 28, 216, 244, 210, 167, 162],
  checkInByDevice: [177, 77, 184, 79, 173, 33, 113, 248],
  createPollByDevice: [239, 171, 242, 247, 40, 167, 59, 36],
  voteByDevice: [130, 220, 233, 16, 25, 255, 183, 223],
  waveByDevice: [59, 133, 219, 166, 15, 126, 96, 176],
} as const;

export type PawketInstructionName = keyof typeof PAWKET_DISCRIMINATORS;

export const DEVICE_VARIANTS = {
  adoptPet: "adoptPetByDevice",
  performCareAction: "careByDevice",
  finishRound: "finishRoundByDevice",
  dress: "dressByDevice",
  dressOwned: "dressOwnedByDevice",
  foundGuild: "foundGuildByDevice",
  joinGuild: "joinGuildByDevice",
  leaveGuild: "leaveGuildByDevice",
  createEvent: "createEventByDevice",
  rsvp: "rsvpByDevice",
  checkIn: "checkInByDevice",
  createPoll: "createPollByDevice",
  vote: "voteByDevice",
  wave: "waveByDevice",
} as const satisfies Partial<Record<PawketInstructionName, PawketInstructionName>>;

export const PAWKET_ACCOUNTS = {
  pet: { discriminator: [180, 195, 178, 241, 61, 123, 238, 32], size: 130 },
  passport: { discriminator: [197, 235, 164, 111, 43, 33, 153, 145], size: 169 },
  guild: { discriminator: [74, 176, 57, 164, 195, 188, 156, 237], size: 235 },
  member: { discriminator: [255, 176, 230, 246, 44, 246, 114, 56], size: 145 },
  wallet: { discriminator: [249, 205, 13, 235, 241, 145, 240, 173], size: 157 },
  closet: { discriminator: [58, 79, 142, 213, 43, 92, 178, 238], size: 83 },
  event: { discriminator: [247, 127, 149, 223, 57, 6, 65, 113], size: 285 },
  rsvp: { discriminator: [16, 57, 171, 182, 186, 29, 16, 226], size: 146 },
  poll: { discriminator: [26, 56, 142, 38, 138, 216, 3, 65], size: 309 },
  ballot: { discriminator: [3, 232, 121, 204, 232, 137, 138, 164], size: 146 },
  guestbook: { discriminator: [24, 45, 253, 91, 214, 23, 198, 188], size: 365 },
} as const;

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
  6016: "UNKNOWN_ITEM",
  6017: "ALREADY_OWNED",
  6018: "NOT_IN_CLOSET",
  6019: "INVALID_EVENT",
  6020: "NOT_GUILD_FOUNDER",
  6021: "NOT_IN_GUILD",
  6022: "EVENT_OVER",
  6023: "NOT_CHECK_IN_TIME",
  6024: "ALREADY_CHECKED_IN",
  6025: "INVALID_POLL",
  6026: "POLL_CLOSED",
  6027: "UNKNOWN_OPTION",
  6028: "CANNOT_WAVE_AT_OWN_PET",
  6029: "ALREADY_WAVED_TODAY",
} as const;

