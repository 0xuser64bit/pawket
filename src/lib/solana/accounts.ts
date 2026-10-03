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
  getU64Decoder,
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
import { deriveGuildPda, deriveMemberPda, derivePassportPda, deriveWalletPda, parseAddress } from "./pda";
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
  /** For display (`displayName`). The address, not the name, identifies the pet. */
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

/** A guild, as the program keeps it (`Guild` in `programs/pawket/src/lib.rs`). */
export interface ChainGuild {
  address: Address;
  founder: Address;
  founderPet: Address;
  createdAt: number;
  memberCount: number;
  /** Index into `CREST_GLYPHS` and `CREST_COLOURS` (`src/lib/guilds/guild.ts`). */
  crest: number;
  colour: number;
  slug: string;
  name: string;
  motto: string;
}

/** One pet's place in a guild. */
export interface ChainMember {
  address: Address;
  pet: Address;
  guild: Address;
  owner: Address;
  /** Who paid this account's rent, and gets it back when the pet leaves. */
  payer: Address;
  joinedAt: number;
}

/** A player's Pawket Wallet, as read from chain. Lamports are bigint; times are Unix seconds. */
export interface ChainWallet {
  address: Address;
  owner: Address;
  /** The linked device, or null when none is. */
  device: Address | null;
  deviceExpiresAt: number;
  dailyActions: number;
  /** Actions the device has taken today (UTC), already reset when the day has turned. */
  actionsToday: number;
  actions: number;
  deposited: bigint;
  withdrawn: bigint;
  /** Moved onto a device for its fees, less what came back. */
  spent: bigint;
  rentPayer: Address;
  createdAt: number;
  /** All the account holds; the balance is this less its rent, which the caller knows. */
  lamports: bigint;
}

export interface PetOnChain {
  pet: ChainPet;
  passport: ChainPassport;
  /** The pet's place in a guild, or null when it is in none. */
  member: ChainMember | null;
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

const sized = () => addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder());

const guildDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["founder", getAddressDecoder()],
  ["founderPet", getAddressDecoder()],
  ["createdAt", getI64Decoder()],
  ["memberCount", getU32Decoder()],
  ["crest", getU8Decoder()],
  ["colour", getU8Decoder()],
  ["bump", getU8Decoder()],
  ["slug", sized()],
  ["name", sized()],
  ["motto", sized()],
]);

const memberDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["pet", getAddressDecoder()],
  ["guild", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["payer", getAddressDecoder()],
  ["joinedAt", getI64Decoder()],
  ["bump", getU8Decoder()],
]);

const walletDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["owner", getAddressDecoder()],
  ["device", getAddressDecoder()],
  ["deviceExpiresAt", getI64Decoder()],
  ["dailyActions", getU16Decoder()],
  ["day", getU32Decoder()],
  ["actionsToday", getU16Decoder()],
  ["actions", getU32Decoder()],
  ["deposited", getU64Decoder()],
  ["withdrawn", getU64Decoder()],
  ["spent", getU64Decoder()],
  ["rentPayer", getAddressDecoder()],
  ["createdAt", getI64Decoder()],
  ["bump", getU8Decoder()],
]);

/** The default key the program leaves where no device is linked. */
const NO_DEVICE = "11111111111111111111111111111111";

/**
 * Decode a `PawketWallet` account holding `lamports`. Throws on bytes that
 * are not one. `now` (seconds) decides whether today's count still stands.
 */
export function decodeWallet(address: Address, bytes: Uint8Array, lamports: bigint, now = Date.now() / 1000): ChainWallet {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.wallet.discriminator)) {
    throw new Error(`${address} is not a Pawket Wallet`);
  }
  const raw = walletDecoder.decode(bytes);
  const today = Math.floor(now / 86_400);
  return {
    address,
    owner: raw.owner,
    device: raw.device === NO_DEVICE ? null : raw.device,
    deviceExpiresAt: Number(raw.deviceExpiresAt),
    dailyActions: raw.dailyActions,
    actionsToday: raw.day === today ? raw.actionsToday : 0,
    actions: raw.actions,
    deposited: raw.deposited,
    withdrawn: raw.withdrawn,
    spent: raw.spent,
    rentPayer: raw.rentPayer,
    createdAt: Number(raw.createdAt),
    lamports,
  };
}

/** The Pawket Wallet `owner` keeps, or null when they have not opened one. */
export async function fetchWallet(rpc: Rpc<GetMultipleAccountsApi>, owner: string | Address): Promise<ChainWallet | null> {
  const address = (await deriveWalletPda(owner)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeWallet(address, account.data, account.lamports);
}

/**
 * A name as it is shown. Names are chosen by strangers and shown to everyone
 * in the park, so bidi overrides and control characters are dropped from the
 * drawn copy. The stored name is the PDA seed: never derive from this one.
 */
export function displayName(name: string): string {
  return cleanText(name) || "A pet";
}

/** A stranger's words with bidi overrides and control characters dropped. */
export function cleanText(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").trim();
}

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
    name: displayName(raw.name),
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

/** Decode a `Guild` account. Throws on bytes that are not one. */
export function decodeGuild(address: Address, bytes: Uint8Array): ChainGuild {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.guild.discriminator)) {
    throw new Error(`${address} is not a Pawket guild`);
  }
  const raw = guildDecoder.decode(bytes);
  return {
    address,
    founder: raw.founder,
    founderPet: raw.founderPet,
    createdAt: Number(raw.createdAt),
    memberCount: raw.memberCount,
    crest: raw.crest,
    colour: raw.colour,
    slug: raw.slug,
    name: cleanText(raw.name) || "A guild",
    // A motto is a stranger's sentence too: shown without control characters.
    motto: cleanText(raw.motto),
  };
}

/** Decode a `GuildMember` account. Throws on bytes that are not one. */
export function decodeMember(address: Address, bytes: Uint8Array): ChainMember {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.member.discriminator)) {
    throw new Error(`${address} is not a Pawket guild member`);
  }
  const raw = memberDecoder.decode(bytes);
  return { address, pet: raw.pet, guild: raw.guild, owner: raw.owner, payer: raw.payer, joinedAt: Number(raw.joinedAt) };
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
    streak: { count: passport.streak, lastDay: isoDay(passport.lastActiveDay), best: passport.bestStreak },
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

/** One pet, its Passport and its place in a guild, or null when there is no pet at that address. */
export async function fetchPetOnChain(rpc: Rpc<GetMultipleAccountsApi>, petAddress: string | Address): Promise<PetOnChain | null> {
  const address = parseAddress(petAddress, "pet");
  const passportAddress = (await derivePassportPda(address)).address;
  const memberAddress = (await deriveMemberPda(address)).address;
  const [petAccount, passportAccount, memberAccount] = await fetchEncodedAccounts(rpc, [address, passportAddress, memberAddress]);
  if (!petAccount.exists || !passportAccount.exists) return null;
  if (petAccount.programAddress !== PAWKET_PROGRAM_ID) return null;
  return {
    pet: decodePet(address, petAccount.data),
    passport: decodePassport(passportAddress, passportAccount.data),
    member: memberAccount.exists ? decodeMember(memberAddress, memberAccount.data) : null,
  };
}

/** Accounts at `addresses`, read 100 at a time (getMultipleAccounts' limit). */
async function readMany(rpc: Rpc<GetMultipleAccountsApi>, addresses: Address[]) {
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 100) chunks.push(fetchEncodedAccounts(rpc, addresses.slice(i, i + 100)));
  return (await Promise.all(chunks)).flat();
}

/** Every pet's Passport and guild place, for pets already read. */
async function withRecords(rpc: Rpc<GetMultipleAccountsApi>, pets: ChainPet[]): Promise<PetOnChain[]> {
  if (pets.length === 0) return [];
  const passports = await Promise.all(pets.map(async (pet) => (await derivePassportPda(pet.address)).address));
  const members = await Promise.all(pets.map(async (pet) => (await deriveMemberPda(pet.address)).address));
  const accounts = await readMany(rpc, [...passports, ...members]);
  const out: PetOnChain[] = [];
  pets.forEach((pet, i) => {
    const passport = accounts[i];
    const member = accounts[pets.length + i];
    if (!passport.exists) return;
    out.push({
      pet,
      passport: decodePassport(passports[i], passport.data),
      member: member.exists ? decodeMember(members[i], member.data) : null,
    });
  });
  return out;
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
  return withRecords(rpc, pets);
}

const accountFilter = (account: { discriminator: readonly number[]; size: number }) => [
  { dataSize: BigInt(account.size) },
  {
    memcmp: {
      offset: 0n,
      bytes: base58.decode(Uint8Array.from(account.discriminator)) as Base58EncodedBytes,
      encoding: "base58" as const,
    },
  },
];

/** Every guild the program keeps. */
export async function fetchGuilds(rpc: ReadRpc): Promise<ChainGuild[]> {
  const accounts = await rpc
    .getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters: accountFilter(PAWKET_ACCOUNTS.guild) })
    .send();
  const guilds: ChainGuild[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      guilds.push(decodeGuild(pubkey, Uint8Array.from(base64.encode(account.data[0]))));
    } catch {
      // ponytail: an account that does not decode is skipped, not fatal to the list.
    }
  }
  return guilds;
}

/** The guild at `slug`, or null when no guild has it. */
export async function fetchGuild(rpc: Rpc<GetMultipleAccountsApi>, slug: string): Promise<ChainGuild | null> {
  const address = (await deriveGuildPda(slug)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeGuild(address, account.data);
}

/** The guild at an address (a member's `guild`), or null when none is there. */
export async function fetchGuildAt(rpc: Rpc<GetMultipleAccountsApi>, guild: string | Address): Promise<ChainGuild | null> {
  const address = parseAddress(guild, "guild");
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeGuild(address, account.data);
}

/** Every pet in a guild, with its Passport — read from the members' accounts, then the pets'. */
export async function fetchGuildPets(rpc: ReadRpc, guild: string | Address): Promise<PetOnChain[]> {
  const filters = [
    ...accountFilter(PAWKET_ACCOUNTS.member),
    // The member's guild sits after the discriminator and the pet.
    { memcmp: { offset: 40n, bytes: parseAddress(guild, "guild") as unknown as Base58EncodedBytes, encoding: "base58" as const } },
  ];
  const accounts = await rpc
    .getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters })
    .send();
  const members: ChainMember[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      members.push(decodeMember(pubkey, Uint8Array.from(base64.encode(account.data[0]))));
    } catch {
      // ponytail: skipped, as above.
    }
  }
  const petAccounts = await readMany(rpc, members.map((member) => member.pet));
  const pets: ChainPet[] = [];
  petAccounts.forEach((account, i) => {
    if (account.exists && account.programAddress === PAWKET_PROGRAM_ID) pets.push(decodePet(members[i].pet, account.data));
  });
  return withRecords(rpc, pets);
}
