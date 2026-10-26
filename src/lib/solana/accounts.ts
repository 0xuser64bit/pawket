import {
  addDecoderSizePrefix,
  fetchEncodedAccounts,
  fixDecoderSize,
  getAddressDecoder,
  getArrayDecoder,
  getBase58Decoder,
  getBooleanDecoder,
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
import {
  deriveBallotPda,
  deriveClosetPda,
  deriveGuestbookPda,
  deriveGuildPda,
  deriveMemberPda,
  derivePassportPda,
  deriveWalletPda,
  parseAddress,
} from "./pda";
import {
  CARE_ACTION_VARIANTS,
  PAWKET_ACCOUNTS,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  RECENT_CARES,
  RECENT_WAVES,
} from "./program";

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
  recent: Array<{ action: CareActionType; at: number }>;
}

export interface ChainGuild {
  address: Address;
  founder: Address;
  founderPet: Address;
  createdAt: number;
  memberCount: number;
  crest: number;
  colour: number;
  slug: string;
  name: string;
  motto: string;
}

export interface ChainMember {
  address: Address;
  pet: Address;
  guild: Address;
  owner: Address;
  payer: Address;
  joinedAt: number;
}

export interface ChainWallet {
  address: Address;
  owner: Address;
  device: Address | null;
  deviceExpiresAt: number;
  dailyActions: number;
  actionsToday: number;
  actions: number;
  deposited: bigint;
  withdrawn: bigint;
  spent: bigint;
  rentPayer: Address;
  createdAt: number;
  lamports: bigint;
}

export interface PetOnChain {
  pet: ChainPet;
  passport: ChainPassport;
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

const NO_DEVICE = "11111111111111111111111111111111";

function decodeWallet(address: Address, bytes: Uint8Array, lamports: bigint, now = Date.now() / 1000): ChainWallet {
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

export async function fetchWallet(rpc: Rpc<GetMultipleAccountsApi>, owner: string | Address): Promise<ChainWallet | null> {
  const address = (await deriveWalletPda(owner)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address], { abortSignal: AbortSignal.timeout(30_000) });
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeWallet(address, account.data, account.lamports);
}

export function displayName(name: string): string {
  return cleanText(name) || "A pet";
}

function cleanText(text: string): string {
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

export function decodePassport(address: Address, bytes: Uint8Array): ChainPassport {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.passport.discriminator)) {
    throw new Error(`${address} is not a Pawket passport`);
  }
  const raw = passportDecoder.decode(bytes);
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
    motto: cleanText(raw.motto),
  };
}

export function decodeMember(address: Address, bytes: Uint8Array): ChainMember {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.member.discriminator)) {
    throw new Error(`${address} is not a Pawket guild member`);
  }
  const raw = memberDecoder.decode(bytes);
  return { address, pet: raw.pet, guild: raw.guild, owner: raw.owner, payer: raw.payer, joinedAt: Number(raw.joinedAt) };
}

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const isoDay = (day: number) => (day === 0 ? null : iso(day * 86_400).slice(0, 10));

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

export function wearableSlot(id: string | null): number {
  if (id === null) return 0;
  const index = WEARABLES.findIndex((item) => item.id === id);
  if (index < 0) throw new Error(`Not in the wardrobe: ${id}`);
  return index + 1;
}

type ReadRpc = Rpc<GetMultipleAccountsApi & GetProgramAccountsApi>;

export async function fetchPetOnChain(rpc: Rpc<GetMultipleAccountsApi>, petAddress: string | Address): Promise<PetOnChain | null> {
  const address = parseAddress(petAddress, "pet");
  const passportAddress = (await derivePassportPda(address)).address;
  const memberAddress = (await deriveMemberPda(address)).address;
  const [petAccount, passportAccount, memberAccount] = await fetchEncodedAccounts(rpc, [address, passportAddress, memberAddress]);
  if (!petAccount.exists || !passportAccount.exists) return null;
  if (petAccount.programAddress !== PAWKET_PROGRAM_ID || passportAccount.programAddress !== PAWKET_PROGRAM_ID) return null;
  return {
    pet: decodePet(address, petAccount.data),
    passport: decodePassport(passportAddress, passportAccount.data),
    member: memberAccount.exists && memberAccount.programAddress === PAWKET_PROGRAM_ID ? decodeMember(memberAddress, memberAccount.data) : null,
  };
}

async function readMany(rpc: Rpc<GetMultipleAccountsApi>, addresses: Address[]) {
  const chunks = [];
  for (let i = 0; i < addresses.length; i += 100) chunks.push(fetchEncodedAccounts(rpc, addresses.slice(i, i + 100)));
  return (await Promise.all(chunks)).flat();
}

async function withRecords(rpc: Rpc<GetMultipleAccountsApi>, pets: ChainPet[]): Promise<PetOnChain[]> {
  if (pets.length === 0) return [];
  const passports = await Promise.all(pets.map(async (pet) => (await derivePassportPda(pet.address)).address));
  const members = await Promise.all(pets.map(async (pet) => (await deriveMemberPda(pet.address)).address));
  const accounts = await readMany(rpc, [...passports, ...members]);
  const out: PetOnChain[] = [];
  pets.forEach((pet, i) => {
    const passport = accounts[i];
    const member = accounts[pets.length + i];
    if (!passport.exists || passport.programAddress !== PAWKET_PROGRAM_ID) return;
    out.push({
      pet,
      passport: decodePassport(passports[i], passport.data),
      member: member.exists && member.programAddress === PAWKET_PROGRAM_ID ? decodeMember(members[i], member.data) : null,
    });
  });
  return out;
}

const base58 = getBase58Decoder();
const base64 = getBase64Encoder();

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
    } catch {}
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

export async function fetchGuilds(rpc: ReadRpc): Promise<ChainGuild[]> {
  const accounts = await rpc
    .getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters: accountFilter(PAWKET_ACCOUNTS.guild) })
    .send();
  const guilds: ChainGuild[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      guilds.push(decodeGuild(pubkey, Uint8Array.from(base64.encode(account.data[0]))));
    } catch {}
  }
  return guilds;
}

export async function fetchGuild(rpc: Rpc<GetMultipleAccountsApi>, slug: string): Promise<ChainGuild | null> {
  const address = (await deriveGuildPda(slug)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeGuild(address, account.data);
}

export async function fetchGuildAt(rpc: Rpc<GetMultipleAccountsApi>, guild: string | Address): Promise<ChainGuild | null> {
  const address = parseAddress(guild, "guild");
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeGuild(address, account.data);
}

export async function fetchGuildPets(rpc: ReadRpc, guild: string | Address): Promise<PetOnChain[]> {
  const filters = [
    ...accountFilter(PAWKET_ACCOUNTS.member),
    { memcmp: { offset: 40n, bytes: parseAddress(guild, "guild") as unknown as Base58EncodedBytes, encoding: "base58" as const } },
  ];
  const accounts = await rpc
    .getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters })
    .send();
  const members: ChainMember[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      members.push(decodeMember(pubkey, Uint8Array.from(base64.encode(account.data[0]))));
    } catch {}
  }
  const petAccounts = await readMany(rpc, members.map((member) => member.pet));
  const pets: ChainPet[] = [];
  petAccounts.forEach((account, i) => {
    if (account.exists && account.programAddress === PAWKET_PROGRAM_ID) pets.push(decodePet(members[i].pet, account.data));
  });
  return withRecords(rpc, pets);
}

export interface ChainCloset {
  address: Address;
  owner: Address;
  items: number[];
  count: number;
  spent: bigint;
}

const closetDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["owner", getAddressDecoder()],
  ["items", fixDecoderSize(getBytesDecoder(), 32)],
  ["count", getU16Decoder()],
  ["spent", getU64Decoder()],
  ["bump", getU8Decoder()],
]);

function decodeCloset(address: Address, bytes: Uint8Array): ChainCloset {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.closet.discriminator)) throw new Error(`${address} is not a Pawket closet`);
  const raw = closetDecoder.decode(bytes);
  const items: number[] = [];
  raw.items.forEach((byte, index) => {
    for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) items.push(index * 8 + bit);
  });
  return { address, owner: raw.owner, items, count: raw.count, spent: raw.spent };
}

export async function fetchCloset(rpc: Rpc<GetMultipleAccountsApi>, owner: string | Address): Promise<ChainCloset | null> {
  const address = (await deriveClosetPda(owner)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeCloset(address, account.data);
}

export interface ChainEvent {
  address: Address;
  guild: Address;
  creator: Address;
  id: number;
  startsAt: number;
  endsAt: number;
  createdAt: number;
  going: number;
  came: number;
  title: string;
  note: string;
}

export interface ChainRsvp {
  address: Address;
  event: Address;
  pet: Address;
  owner: Address;
  payer: Address;
  at: number;
  came: boolean;
}

export interface ChainPoll {
  address: Address;
  guild: Address;
  creator: Address;
  id: number;
  createdAt: number;
  closesAt: number;
  votes: number[];
  question: string;
  options: string[];
}

export interface ChainBallot {
  address: Address;
  poll: Address;
  owner: Address;
  pet: Address;
  option: number;
  at: number;
}

const eventDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["guild", getAddressDecoder()],
  ["creator", getAddressDecoder()],
  ["id", getU32Decoder()],
  ["startsAt", getI64Decoder()],
  ["endsAt", getI64Decoder()],
  ["createdAt", getI64Decoder()],
  ["going", getU32Decoder()],
  ["came", getU32Decoder()],
  ["bump", getU8Decoder()],
  ["title", sized()],
  ["note", sized()],
]);

const rsvpDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["event", getAddressDecoder()],
  ["pet", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["payer", getAddressDecoder()],
  ["at", getI64Decoder()],
  ["came", getBooleanDecoder()],
  ["bump", getU8Decoder()],
]);

const pollDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["guild", getAddressDecoder()],
  ["creator", getAddressDecoder()],
  ["id", getU32Decoder()],
  ["createdAt", getI64Decoder()],
  ["closesAt", getI64Decoder()],
  ["votes", getArrayDecoder(getU32Decoder(), { size: 4 })],
  ["bump", getU8Decoder()],
  ["question", sized()],
  ["options", getArrayDecoder(sized(), { size: getU32Decoder() })],
]);

const ballotDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["poll", getAddressDecoder()],
  ["owner", getAddressDecoder()],
  ["pet", getAddressDecoder()],
  ["payer", getAddressDecoder()],
  ["option", getU8Decoder()],
  ["at", getI64Decoder()],
  ["bump", getU8Decoder()],
]);

function decodeEvent(address: Address, bytes: Uint8Array): ChainEvent {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.event.discriminator)) throw new Error(`${address} is not a Pawket event`);
  const raw = eventDecoder.decode(bytes);
  return {
    address,
    guild: raw.guild,
    creator: raw.creator,
    id: raw.id,
    startsAt: Number(raw.startsAt),
    endsAt: Number(raw.endsAt),
    createdAt: Number(raw.createdAt),
    going: raw.going,
    came: raw.came,
    title: cleanText(raw.title) || "An event",
    note: cleanText(raw.note),
  };
}

function decodeRsvp(address: Address, bytes: Uint8Array): ChainRsvp {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.rsvp.discriminator)) throw new Error(`${address} is not a Pawket RSVP`);
  const raw = rsvpDecoder.decode(bytes);
  return { address, event: raw.event, pet: raw.pet, owner: raw.owner, payer: raw.payer, at: Number(raw.at), came: raw.came };
}

function decodePoll(address: Address, bytes: Uint8Array): ChainPoll {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.poll.discriminator)) throw new Error(`${address} is not a Pawket poll`);
  const raw = pollDecoder.decode(bytes);
  const options = raw.options.map((option) => cleanText(option) || "…");
  return {
    address,
    guild: raw.guild,
    creator: raw.creator,
    id: raw.id,
    createdAt: Number(raw.createdAt),
    closesAt: Number(raw.closesAt),
    votes: raw.votes.slice(0, options.length),
    question: cleanText(raw.question) || "A question",
    options,
  };
}

function decodeBallot(address: Address, bytes: Uint8Array): ChainBallot {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.ballot.discriminator)) throw new Error(`${address} is not a Pawket ballot`);
  const raw = ballotDecoder.decode(bytes);
  return { address, poll: raw.poll, owner: raw.owner, pet: raw.pet, option: raw.option, at: Number(raw.at) };
}

async function scan<T>(
  rpc: ReadRpc,
  account: { discriminator: readonly number[]; size: number },
  offset: bigint,
  key: string | Address,
  decode: (address: Address, bytes: Uint8Array) => T,
): Promise<T[]> {
  const filters = [
    ...accountFilter(account),
    { memcmp: { offset, bytes: parseAddress(key, "key") as unknown as Base58EncodedBytes, encoding: "base58" as const } },
  ];
  const accounts = await rpc.getProgramAccounts(parseAddress(PAWKET_PROGRAM_ID, "program ID"), { encoding: "base64", filters }).send();
  const out: T[] = [];
  for (const { pubkey, account: found } of accounts) {
    try {
      out.push(decode(pubkey, Uint8Array.from(base64.encode(found.data[0]))));
    } catch {}
  }
  return out;
}

export async function fetchGuildEvents(rpc: ReadRpc, guild: string | Address): Promise<ChainEvent[]> {
  return (await scan(rpc, PAWKET_ACCOUNTS.event, 8n, guild, decodeEvent)).sort((a, b) => a.startsAt - b.startsAt);
}

export function fetchPetRsvps(rpc: ReadRpc, pet: string | Address): Promise<ChainRsvp[]> {
  return scan(rpc, PAWKET_ACCOUNTS.rsvp, 40n, pet, decodeRsvp);
}

export async function fetchGuildPolls(rpc: ReadRpc, guild: string | Address): Promise<ChainPoll[]> {
  return (await scan(rpc, PAWKET_ACCOUNTS.poll, 8n, guild, decodePoll)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchBallot(rpc: Rpc<GetMultipleAccountsApi>, poll: string | Address, owner: string | Address): Promise<ChainBallot | null> {
  const address = (await deriveBallotPda(poll, owner)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeBallot(address, account.data);
}

export interface ChainGuestbook {
  address: Address;
  pet: Address;
  waves: number;
  recent: Array<{ visitor: Address; at: number }>;
}

const guestbookDecoder = getStructDecoder([
  ["discriminator", discriminator],
  ["pet", getAddressDecoder()],
  ["waves", getU32Decoder()],
  ["recent", getArrayDecoder(getStructDecoder([["visitor", getAddressDecoder()], ["at", getI64Decoder()]]), { size: RECENT_WAVES })],
  ["bump", getU8Decoder()],
]);

export function decodeGuestbook(address: Address, bytes: Uint8Array): ChainGuestbook {
  if (!hasDiscriminator(bytes, PAWKET_ACCOUNTS.guestbook.discriminator)) throw new Error(`${address} is not a Pawket guestbook`);
  const raw = guestbookDecoder.decode(bytes);
  const start = raw.waves >= RECENT_WAVES ? raw.waves % RECENT_WAVES : 0;
  const recent = Array.from({ length: RECENT_WAVES }, (_, i) => raw.recent[(start + i) % RECENT_WAVES])
    .filter((mark) => mark.at !== 0n)
    .map((mark) => ({ visitor: mark.visitor, at: Number(mark.at) }))
    .reverse();
  return { address, pet: raw.pet, waves: raw.waves, recent };
}

export async function fetchGuestbook(rpc: Rpc<GetMultipleAccountsApi>, pet: string | Address): Promise<ChainGuestbook | null> {
  const address = (await deriveGuestbookPda(pet)).address;
  const [account] = await fetchEncodedAccounts(rpc, [address]);
  if (!account.exists || account.programAddress !== PAWKET_PROGRAM_ID) return null;
  return decodeGuestbook(address, account.data);
}
