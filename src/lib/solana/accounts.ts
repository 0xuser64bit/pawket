import {
  addDecoderSizePrefix,
  fetchEncodedAccounts,
  fixDecoderSize,
  getAddressDecoder,
  getArrayDecoder,
  getBase58Decoder,
  getBase64Encoder,
  getBytesDecoder,
  getI64Decoder,
  getStructDecoder,
  getU16Decoder,
  getU32Decoder,
  getU8Decoder,
  getUtf8Decoder,
  type Address,
  type Base58EncodedBytes,
  type GetMultipleAccountsApi,
  type GetProgramAccountsApi,
  type Rpc,
} from "@solana/kit";
import { WEARABLES } from "@/lib/closet/catalog";
import { XP_PER_CARE_ACTION } from "@/lib/game/constants";
import { CareActionType, PetPersonality, PetSpecies, type PetStats } from "@/lib/game/enums";
import type { GuestPet } from "@/lib/guest/pet";
import { derivePassportPda, parseAddress } from "./pda";
import {
  CARE_ACTION_VARIANTS,
  PAWKET_ACCOUNTS,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  RECENT_CARES,
} from "./program";

/**
 * Reading the program's two accounts. The byte layout is the program's
 * (`programs/pawket/src/lib.rs`), locked on that side by
 * `account_layouts_are_the_contract_the_web_app_decodes` and on this side
 * by `accounts.test.ts`. Timestamps are Unix seconds; days are UTC days
 * since the epoch, 0 meaning never.
 */

export interface ChainPet {
  address: Address;
  owner: Address;
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  birthTimestamp: number;
  level: number;
  xp: number;
  stats: PetStats;
  statsUpdatedAt: number;
  lastCareAt: Record<CareActionType, number>;
  /** 0 is nothing; otherwise the wardrobe's position, from 1. */
  wearing: number;
}

export interface ChainPassport {
  address: Address;
  pet: Address;
  owner: Address;
  eventCount: number;
  careCount: number;
  plays: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: number;
  lastPlayDay: number;
  /** The last cares the Passport kept, oldest first. */
  recent: Array<{ action: CareActionType; at: number }>;
}

export interface PetOnChain {
  pet: ChainPet;
  passport: ChainPassport;
}

const discriminator = fixDecoderSize(getBytesDecoder(), 8);

const petDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["owner", getAddressDecoder()],
  ["species", getU8Decoder()],
  ["personality", getU8Decoder()],
  ["birthTimestamp", getI64Decoder()],
  ["level", getU16Decoder()],
  ["xp", getU32Decoder()],
  ["hunger", getU8Decoder()],
  ["happiness", getU8Decoder()],
  ["energy", getU8Decoder()],
  ["hygiene", getU8Decoder()],
  ["statsUpdatedAt", getI64Decoder()],
  ["lastFeedAt", getI64Decoder()],
  ["lastPlayAt", getI64Decoder()],
  ["lastGroomAt", getI64Decoder()],
  ["lastRestAt", getI64Decoder()],
  ["wearing", getU8Decoder()],
  ["bump", getU8Decoder()],
  ["name", addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
]);

const passportDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["pet", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["eventCount", getU32Decoder()],
  ["careCount", getU32Decoder()],
  ["plays", getU32Decoder()],
  ["streak", getU16Decoder()],
  ["bestStreak", getU16Decoder()],
  ["lastActiveDay", getU32Decoder()],
  ["lastPlayDay", getU32Decoder()],
  [
    "recent",
    getArrayDecoder(getStructDecoder([["action", getU8Decoder()], ["at", getI64Decoder()]]), {
      size: RECENT_CARES,
    }),
  ],
  ["bump", getU8Decoder()],
]);

function variantOf<T extends string>(table: Record<T, number>, index: number, label: string): T {
  const found = (Object.keys(table) as T[]).find((key) => table[key] === index);
  if (found === undefined) throw new Error(`Unknown ${label} variant ${index}`);
  return found;
}

function hasDiscriminator(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((byte, i) => bytes[i] === byte);
}

/** Decode a `Pet` account. Throws on bytes that are not one. */
export function decodePet(address: Address, bytes: Uint8Array): ChainPet {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.pet.discriminator)) {
    throw new Error(`${address} is not a Pawket pet`);
  }
  const raw = petDecoder.decode(bytes);
  return {
    address,
    owner: raw.owner,
    name: raw.name,
    species: variantOf(PET_SPECIES_VARIANTS, raw.species, "species"),
    personality: variantOf(PET_PERSONALITY_VARIANTS, raw.personality, "personality"),
    birthTimestamp: Number(raw.birthTimestamp),
    level: raw.level,
    xp: raw.xp,
    stats: {
      hunger: raw.hunger,
      happiness: raw.happiness,
      energy: raw.energy,
      hygiene: raw.hygiene,
    },
    statsUpdatedAt: Number(raw.statsUpdatedAt),
    lastCareAt: {
      [CareActionType.Feed]: Number(raw.lastFeedAt),
      [CareActionType.Play]: Number(raw.lastPlayAt),
      [CareActionType.Groom]: Number(raw.lastGroomAt),
      [CareActionType.Rest]: Number(raw.lastRestAt),
    },
    wearing: raw.wearing,
  };
}

/** Decode a `PetPassport` account. Throws on bytes that are not one. */
export function decodePassport(address: Address, bytes: Uint8Array): ChainPassport {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.passport.discriminator)) {
    throw new Error(`${address} is not a Pawket passport`);
  }
  const raw = passportDecoder.decode(bytes);
  // The ring is written at care_count % 8, so once full the oldest is there.
  const start = raw.careCount >= RECENT_CARES ? raw.careCount % RECENT_CARES : 0;
  const recent = Array.from({ length: RECENT_CARES }, (_, i) => raw.recent[(start + i) % RECENT_CARES])
    .filter((mark) => mark.at !== 0n)
    .map((mark) => ({
      action: variantOf(CARE_ACTION_VARIANTS, mark.action, "care action"),
      at: Number(mark.at),
    }));
  return {
    address,
    pet: raw.pet,
    owner: raw.owner,
    eventCount: raw.eventCount,
    careCount: raw.careCount,
    plays: raw.plays,
    streak: raw.streak,
    bestStreak: raw.bestStreak,
    lastActiveDay: raw.lastActiveDay,
    lastPlayDay: raw.lastPlayDay,
    recent,
  };
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const isoDay = (day: number) => (day === 0 ? null : iso(day * 86_400).slice(0, 10));

/**
 * The chain record in the shape every screen already draws. The id is the
 * pet's address; projection, cooldowns and the streak then read it with the
 * same functions as a pet kept in this browser — the program is in lockstep
 * with them (`src/lib/game/lockstep.txt`).
 */
export function toCompanionRecord({ pet, passport }: PetOnChain): GuestPet {
  const last = (action: CareActionType) => (pet.lastCareAt[action] ? iso(pet.lastCareAt[action]) : null);
  return {
    version: 2,
    id: pet.address,
    name: pet.name,
    species: pet.species,
    personality: pet.personality,
    stats: { ...pet.stats },
    xp: pet.xp,
    createdAt: iso(pet.birthTimestamp),
    statsUpdatedAt: iso(pet.statsUpdatedAt),
    lastActionAt: {
      [CareActionType.Feed]: last(CareActionType.Feed),
      [CareActionType.Play]: last(CareActionType.Play),
      [CareActionType.Groom]: last(CareActionType.Groom),
      [CareActionType.Rest]: last(CareActionType.Rest),
    },
    careLog: passport.recent.map((mark) => ({
      action: mark.action,
      at: iso(mark.at),
      xpGained: XP_PER_CARE_ACTION,
    })),
    streak: { count: passport.streak, lastDay: isoDay(passport.lastActiveDay) },
    wearing: WEARABLES[pet.wearing - 1]?.id ?? null,
    plays: passport.plays,
    lastDailyPlayDay: isoDay(passport.lastPlayDay),
  };
}

/** The wardrobe slot the program stores for a catalog id: 0 for nothing. */
export function wearableSlot(id: string | null): number {
  if (id === null) return 0;
  const index = WEARABLES.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Not in the wardrobe: ${id}`);
  return index + 1;
}

type ReadRpc = Rpc<GetMultipleAccountsApi & GetProgramAccountsApi>;

/** One pet and its Passport, or null when there is no pet at that address. */
export async function fetchPetOnChain(rpc: Rpc<GetMultipleAccountsApi>, petAddress: string | Address): Promise<PetOnChain | null> {
  const address = parseAddress(petAddress, "pet");
  const passportAddress = (await derivePassportPda(address)).address;
  const [petAccount, passportAccount] = await fetchEncodedAccounts(rpc, [address, passportAddress]);
  if (!petAccount.exists || !passportAccount.exists) return null;
  if (petAccount.programAddress !== PAWKET_PROGRAM_ID) return null;
  return {
    pet: decodePet(address, petAccount.data),
    passport: decodePassport(passportAddress, passportAccount.data),
  };
}

const base58 = getBase58Decoder();
const base64 = getBase64Encoder();

/**
 * Every pet the program holds, or only `owner`'s. Fixed offsets make the
 * filter cheap: the discriminator at 0, the owner at 8.
 */
export async function fetchPetsOnChain(rpc: ReadRpc, owner?: string | Address): Promise<PetOnChain[]> {
  const filters = [
    { dataSize: BigInt(PAWKET_ACCOUNTS.pet.size) },
    {
      memcmp: {
        offset: 0n,
        bytes: base58.decode(Uint8Array.from(PAWKET_ACCOUNTS.pet.discriminator)) as Base58EncodedBytes,
        encoding: "base58" as const,
      },
    },
    ...(owner
      ? [{ memcmp: { offset: 8n, bytes: parseAddress(owner, "owner") as unknown as Base58EncodedBytes, encoding: "base58" as const } }]
      : []),
  ];
  const accounts = await rpc
    .getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters })
    .send();
  const pets: ChainPet[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      pets.push(decodePet(pubkey, Uint8Array.from(base64.encode(account.data[0]))));
    } catch {
      // ponytail: an account that does not decode is skipped, not fatal to the list.
    }
  }
  if (pets.length === 0) return [];
  const passports = await Promise.all(pets.map(async (pet) => (await derivePassportPda(pet.address)).address));
  // getMultipleAccounts reads at most 100 at a time.
  const chunks = [];
  for (let i = 0; i < passports.length; i += 100) chunks.push(fetchEncodedAccounts(rpc, passports.slice(i, i + 100)));
  const accountsOf = (await Promise.all(chunks)).flat();
  const out: PetOnChain[] = [];
  accountsOf.forEach((account, i) => {
    if (account.exists) out.push({ pet: pets[i], passport: decodePassport(passports[i], account.data) });
  });
  return out;
}
