import {
  AccountRole,
  address,
  getI64Encoder,
  getU16Encoder,
  getU32Encoder,
  getU64Encoder,
  getU8Encoder,
  getUtf8Encoder,
  isTransactionSigner,
  type AccountMeta,
  type AccountSignerMeta,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import {
  CareActionType,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import { normalizePetName, parseAddress } from "./pda";
import {
  CARE_ACTION_VARIANTS,
  DEVICE_VARIANTS,
  GATHERING_LIMITS,
  GUILD_LIMITS,
  MARKET,
  WALLET_LIMITS,
  PAWKET_DISCRIMINATORS,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  WEARABLE_COUNT,
} from "./program";

const SYSTEM_PROGRAM = address("11111111111111111111111111111111");

const u8 = getU8Encoder();
const u16 = getU16Encoder();
const u32 = getU32Encoder();
const u64 = getU64Encoder();
const i64 = getI64Encoder();
const utf8 = getUtf8Encoder();

/**
 * An account that signs: a plain address when the caller signs some other
 * way, or a Kit signer — the wallet, or a sponsor's no-op stand-in — which
 * `partiallySignTransactionMessageWithSigners` then finds on the meta.
 */
export type SignerInput = string | Address | TransactionSigner;

export function concatBytes(...parts: ArrayLike<number>[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Anchor `string` = u32 LE length prefix + UTF-8 bytes. */
export function encodeAnchorString(value: string): Uint8Array {
  const bytes = utf8.encode(value);
  return concatBytes(u32.encode(bytes.length), bytes);
}

function encodeVariant(
  value: number,
  label: string,
): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`Invalid ${label} variant: ${value}`);
  }
  return Uint8Array.from(u8.encode(value));
}

export function signerMeta(
  value: SignerInput,
  role: AccountRole.READONLY_SIGNER | AccountRole.WRITABLE_SIGNER,
  label: string,
): AccountMeta | AccountSignerMeta {
  if (typeof value === "object" && isTransactionSigner(value)) {
    return { address: value.address, role, signer: value };
  }
  return { address: parseAddress(value, label), role };
}

function programAddress(programId?: string | Address): Address {
  return parseAddress(programId ?? PAWKET_PROGRAM_ID, "program ID");
}

export interface AdoptPetInstructionInput {
  owner: SignerInput;
  /** Who pays rent: the owner, or a sponsor. Defaults to the owner. */
  payer?: SignerInput;
  pet: string | Address;
  passport: string | Address;
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  programId?: string | Address;
}

export interface PetInstructionInput {
  owner: SignerInput;
  pet: string | Address;
  passport: string | Address;
  programId?: string | Address;
}

export interface CareInstructionInput extends PetInstructionInput {
  action: CareActionType;
}

export interface DressInstructionInput {
  owner: SignerInput;
  pet: string | Address;
  /** 0 takes everything off; 1–18 is the wardrobe in catalog order. */
  wearing: number;
  programId?: string | Address;
}

/**
 * Builds the `adopt_pet` instruction. Returns an unsigned Kit instruction:
 * the owner signs for the name, the payer for the rent.
 */
export function getAdoptPetInstruction(
  input: AdoptPetInstructionInput,
): Instruction {
  const name = normalizePetName(input.name);
  const species = PET_SPECIES_VARIANTS[input.species];
  const personality = PET_PERSONALITY_VARIANTS[input.personality];
  if (species === undefined) throw new Error(`Unknown species: ${input.species}`);
  if (personality === undefined) {
    throw new Error(`Unknown personality: ${input.personality}`);
  }

  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.passport, "passport"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(
      new Uint8Array(PAWKET_DISCRIMINATORS.adoptPet),
      encodeAnchorString(name),
      encodeVariant(species, "species"),
      encodeVariant(personality, "personality"),
    ),
  };
}

function petAccounts(input: PetInstructionInput) {
  return [
    signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
    { address: parseAddress(input.pet, "pet"), role: AccountRole.WRITABLE },
    { address: parseAddress(input.passport, "passport"), role: AccountRole.WRITABLE },
  ];
}

/** Builds the `perform_care_action` instruction (unsigned). */
export function getCareInstruction(input: CareInstructionInput): Instruction {
  const variant = CARE_ACTION_VARIANTS[input.action];
  if (variant === undefined) throw new Error(`Unknown action: ${input.action}`);

  return {
    programAddress: programAddress(input.programId),
    accounts: petAccounts(input),
    data: concatBytes(
      new Uint8Array(PAWKET_DISCRIMINATORS.performCareAction),
      encodeVariant(variant, "care action"),
    ),
  };
}

/** Builds the `finish_round` instruction (unsigned): a playground round, finished. */
export function getFinishRoundInstruction(input: PetInstructionInput): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: petAccounts(input),
    data: new Uint8Array(PAWKET_DISCRIMINATORS.finishRound),
  };
}

/** Builds the `dress` instruction (unsigned). */
export function getDressInstruction(input: DressInstructionInput): Instruction {
  if (!Number.isInteger(input.wearing) || input.wearing < 0 || input.wearing > WEARABLE_COUNT) {
    throw new Error(`Nothing to wear at ${input.wearing}`);
  }
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.WRITABLE },
    ],
    data: concatBytes(
      new Uint8Array(PAWKET_DISCRIMINATORS.dress),
      encodeVariant(input.wearing, "wearable"),
    ),
  };
}

export interface FoundGuildInstructionInput {
  owner: SignerInput;
  /** Who pays the rent of the guild and the founder's place in it. Defaults to the owner. */
  payer?: SignerInput;
  /** The founding pet, which becomes the first member. */
  pet: string | Address;
  guild: string | Address;
  member: string | Address;
  slug: string;
  name: string;
  motto: string;
  crest: number;
  colour: number;
  programId?: string | Address;
}

export interface JoinGuildInstructionInput {
  owner: SignerInput;
  /** Who pays the rent of the pet's place in the guild. Defaults to the owner. */
  payer?: SignerInput;
  pet: string | Address;
  guild: string | Address;
  member: string | Address;
  programId?: string | Address;
}

export interface LeaveGuildInstructionInput {
  owner: SignerInput;
  pet: string | Address;
  member: string | Address;
  guild: string | Address;
  /** Whoever paid the member account's rent, as the member records it: it goes back to them. */
  payer: string | Address;
  programId?: string | Address;
}

/**
 * Builds `found_guild` (unsigned). The program checks every field again;
 * these checks only refuse a send that could never land.
 */
export function getFoundGuildInstruction(input: FoundGuildInstructionInput): Instruction {
  const { crest, colour } = input;
  if (!Number.isInteger(crest) || crest < 0 || crest >= GUILD_LIMITS.crests) throw new Error(`No crest at ${crest}`);
  if (!Number.isInteger(colour) || colour < 0 || colour >= GUILD_LIMITS.colours) throw new Error(`No colour at ${colour}`);
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.guild, "guild"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.member, "member"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(
      new Uint8Array(PAWKET_DISCRIMINATORS.foundGuild),
      encodeAnchorString(input.slug),
      encodeAnchorString(input.name.trim()),
      encodeAnchorString(input.motto.trim()),
      encodeVariant(crest, "crest"),
      encodeVariant(colour, "colour"),
    ),
  };
}

/** Builds `join_guild` (unsigned). */
export function getJoinGuildInstruction(input: JoinGuildInstructionInput): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.guild, "guild"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.member, "member"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.joinGuild),
  };
}

/** Builds `leave_guild` (unsigned). */
export function getLeaveGuildInstruction(input: LeaveGuildInstructionInput): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.member, "member"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.guild, "guild"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.payer, "payer"), role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.leaveGuild),
  };
}

/* ------------------------------------------------------ the Pawket Wallet */

export interface WalletInstructionInput {
  owner: SignerInput;
  /** The owner's Pawket Wallet (`deriveWalletPda`). */
  wallet: string | Address;
  programId?: string | Address;
}

/** `open_wallet`: the owner's Pawket Wallet, its rent paid by `payer` (the owner or the sponsor). */
export function getOpenWalletInstruction(input: WalletInstructionInput & { payer?: SignerInput }): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.openWallet),
  };
}

function lamports(amount: bigint): Uint8Array {
  if (amount <= 0n || amount > 0xffff_ffff_ffff_ffffn) throw new Error("An amount is more than nothing.");
  return Uint8Array.from(u64.encode(amount));
}

/** `deposit`: `amount` lamports from the owner into their Pawket Wallet. */
export function getDepositInstruction(input: WalletInstructionInput & { amount: bigint }): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.deposit, lamports(input.amount)),
  };
}

/** `withdraw`: `amount` lamports from the Pawket Wallet back to its owner, the only place they can go. */
export function getWithdrawInstruction(input: WalletInstructionInput & { amount: bigint }): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.withdraw, lamports(input.amount)),
  };
}

/**
 * `link_device`: the device acts for the owner until `expiresAt` (unix
 * seconds), at most `dailyActions` times a UTC day. Both sign: the owner,
 * and the device, to show it is really there.
 */
export function getLinkDeviceInstruction(
  input: WalletInstructionInput & { device: SignerInput; expiresAt: number; dailyActions: number },
): Instruction {
  if (!Number.isInteger(input.dailyActions) || input.dailyActions < 1 || input.dailyActions > WALLET_LIMITS.maxDailyActions) {
    throw new Error(`A device takes 1 to ${WALLET_LIMITS.maxDailyActions} actions a day.`);
  }
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      signerMeta(input.device, AccountRole.WRITABLE_SIGNER, "device"),
    ],
    data: concatBytes(
      PAWKET_DISCRIMINATORS.linkDevice,
      i64.encode(BigInt(Math.floor(input.expiresAt))),
      u16.encode(input.dailyActions),
    ),
  };
}

/**
 * `unlink_device`: `authority` — the owner, or the device itself — ends the
 * link. When the device signs (`deviceSigns`), what it holds comes back.
 */
export function getUnlinkDeviceInstruction(input: {
  authority: SignerInput;
  wallet: string | Address;
  device: SignerInput;
  deviceSigns: boolean;
  programId?: string | Address;
}): Instruction {
  const sameKey =
    (typeof input.authority === "object" ? input.authority.address : input.authority) ===
    (typeof input.device === "object" ? input.device.address : input.device);
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.authority, AccountRole.READONLY_SIGNER, "authority"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      input.deviceSigns || sameKey
        ? signerMeta(input.device, AccountRole.WRITABLE_SIGNER, "device")
        : { address: parseAddress(typeof input.device === "object" ? input.device.address : input.device, "device"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.unlinkDevice),
  };
}

/** `close_wallet`: the balance to the owner, the rent to `rentPayer`, which paid it. */
export function getCloseWalletInstruction(input: WalletInstructionInput & { rentPayer: string | Address }): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.rentPayer, "rent payer"), role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.closeWallet),
  };
}

/**
 * `instruction`, as the owner's linked device signs it: its `*_by_device`
 * twin (`DEVICE_VARIANTS`), with the device and the owner's Pawket Wallet in
 * the owner's place and every other account and argument as they were. Build
 * the owner's instruction for the owner's address, then hand it here. Throws
 * for anything a device may not sign: whatever moves money.
 */
export function asDeviceInstruction(
  instruction: Instruction,
  linked: { device: SignerInput; wallet: string | Address },
): Instruction {
  const data = instruction.data ?? new Uint8Array();
  const name = (Object.keys(DEVICE_VARIANTS) as Array<keyof typeof DEVICE_VARIANTS>).find((key) =>
    PAWKET_DISCRIMINATORS[key].every((byte, i) => data[i] === byte),
  );
  if (!name) throw new Error("A linked device cannot sign that. Nothing was sent.");
  const [, ...rest] = instruction.accounts ?? [];
  return {
    programAddress: instruction.programAddress,
    accounts: [
      signerMeta(linked.device, AccountRole.WRITABLE_SIGNER, "device"),
      { address: parseAddress(linked.wallet, "wallet"), role: AccountRole.WRITABLE },
      ...rest,
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS[DEVICE_VARIANTS[name]], data.slice(8)),
  };
}

/* ------------------------------------------------------------- the Market */

/** Whether the program sells `item` (`item_price` in `programs/pawket/src/lib.rs`). */
export function isMarketItem(item: number): boolean {
  if (!Number.isInteger(item)) return false;
  return (
    (item > WEARABLE_COUNT && item <= WEARABLE_COUNT + MARKET.wearables) ||
    (item >= MARKET.firstRoom && item < MARKET.firstRoom + MARKET.rooms) ||
    (item >= MARKET.firstFrame && item < MARKET.firstFrame + MARKET.frames)
  );
}

/** What `item` costs in the Market, in lamports, or null where nothing is sold. */
export function marketPrice(item: number): bigint | null {
  if (!isMarketItem(item)) return null;
  return item <= WEARABLE_COUNT + MARKET.wearables ? MARKET.wearablePrice : item < MARKET.firstFrame ? MARKET.roomPrice : MARKET.framePrice;
}

/**
 * `buy`: one Market item at its fixed price, from the owner straight to the
 * treasury. The payer covers the closet's rent the first time.
 */
export function getBuyInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  /** The owner's closet (`deriveClosetPda`). */
  closet: string | Address;
  item: number;
  programId?: string | Address;
}): Instruction {
  if (!isMarketItem(input.item)) throw new Error(`The Market sells nothing at ${input.item}`);
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.closet, "closet"), role: AccountRole.WRITABLE },
      { address: parseAddress(MARKET.treasury, "treasury"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.buy, u8.encode(input.item)),
  };
}

export function getBuyWithWalletInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  /** The owner's closet (`deriveClosetPda`). */
  closet: string | Address;
  item: number;
  wallet: string | Address;
  programId?: string | Address;
}): Instruction {
  if (!isMarketItem(input.item)) throw new Error(`The Market sells nothing at ${input.item}`);
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.closet, "closet"), role: AccountRole.WRITABLE },
      { address: parseAddress(MARKET.treasury, "treasury"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.buyWithWallet, u8.encode(input.item)),
  };
}

function wearableSlotFor(wearing: number): number {
  if (!Number.isInteger(wearing) || wearing < 0 || wearing > WEARABLE_COUNT + MARKET.wearables) {
    throw new Error(`Nothing to wear at ${wearing}`);
  }
  return wearing;
}

/** `dress_owned`: one of the eighteen, or a Market piece the owner's closet holds. */
export function getDressOwnedInstruction(input: {
  owner: SignerInput;
  pet: string | Address;
  closet: string | Address;
  wearing: number;
  programId?: string | Address;
}): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.closet, "closet"), role: AccountRole.READONLY },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.dressOwned, u8.encode(wearableSlotFor(input.wearing))),
  };
}

/* ------------------------------------------------- a guild's events and polls */

const utf8Length = (value: string) => utf8.encode(value).length;

/** `create_event`: the founder plans an event. The program checks every field again. */
export function getCreateEventInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  guild: string | Address;
  /** `deriveEventPda(guild, id)`. */
  event: string | Address;
  id: number;
  title: string;
  note: string;
  startsAt: number;
  endsAt: number;
  programId?: string | Address;
}): Instruction {
  const title = input.title.trim();
  const note = input.note.trim();
  if (utf8Length(title) < GATHERING_LIMITS.minTitle || utf8Length(title) > GATHERING_LIMITS.maxTitle) {
    throw new Error("An event's title is 3 to 48 bytes");
  }
  if (utf8Length(note) > GATHERING_LIMITS.maxNote) throw new Error("An event's note is at most 120 bytes");
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.guild, "guild"), role: AccountRole.READONLY },
      { address: parseAddress(input.event, "event"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(
      PAWKET_DISCRIMINATORS.createEvent,
      u32.encode(input.id),
      encodeAnchorString(title),
      encodeAnchorString(note),
      i64.encode(BigInt(input.startsAt)),
      i64.encode(BigInt(input.endsAt)),
    ),
  };
}

/** `rsvp`: a pet in the guild is going. */
export function getRsvpInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  pet: string | Address;
  /** The pet's place in the guild (`deriveMemberPda`). */
  member: string | Address;
  event: string | Address;
  /** `deriveRsvpPda(event, pet)`. */
  rsvp: string | Address;
  programId?: string | Address;
}): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.member, "member"), role: AccountRole.READONLY },
      { address: parseAddress(input.event, "event"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.rsvp, "rsvp"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.rsvp),
  };
}

/** `check_in`: a pet that said it was going is at the event. */
export function getCheckInInstruction(input: {
  owner: SignerInput;
  pet: string | Address;
  event: string | Address;
  rsvp: string | Address;
  programId?: string | Address;
}): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.event, "event"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.rsvp, "rsvp"), role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.checkIn),
  };
}

/** `create_poll`: the founder asks the guild something, with two to four options. */
export function getCreatePollInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  guild: string | Address;
  /** `derivePollPda(guild, id)`. */
  poll: string | Address;
  id: number;
  question: string;
  options: string[];
  closesAt: number;
  programId?: string | Address;
}): Instruction {
  const question = input.question.trim();
  const options = input.options.map((option) => option.trim());
  if (utf8Length(question) < GATHERING_LIMITS.minQuestion || utf8Length(question) > GATHERING_LIMITS.maxQuestion) {
    throw new Error("A poll's question is 3 to 80 bytes");
  }
  if (
    options.length < GATHERING_LIMITS.minOptions ||
    options.length > GATHERING_LIMITS.maxOptions ||
    options.some((option) => utf8Length(option) < 1 || utf8Length(option) > GATHERING_LIMITS.maxOption)
  ) {
    throw new Error("A poll has 2 to 4 options of 1 to 24 bytes");
  }
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.guild, "guild"), role: AccountRole.READONLY },
      { address: parseAddress(input.poll, "poll"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(
      PAWKET_DISCRIMINATORS.createPoll,
      u32.encode(input.id),
      encodeAnchorString(question),
      u32.encode(options.length),
      ...options.map(encodeAnchorString),
      i64.encode(BigInt(input.closesAt)),
    ),
  };
}

/** `vote`: one ballot per wallet, for a wallet with a pet in the guild. */
export function getVoteInstruction(input: {
  owner: SignerInput;
  payer?: SignerInput;
  pet: string | Address;
  member: string | Address;
  poll: string | Address;
  /** `deriveBallotPda(poll, owner)`. */
  ballot: string | Address;
  option: number;
  programId?: string | Address;
}): Instruction {
  if (!Number.isInteger(input.option) || input.option < 0 || input.option >= GATHERING_LIMITS.maxOptions) {
    throw new Error(`No option ${input.option}`);
  }
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.owner, AccountRole.READONLY_SIGNER, "owner"),
      signerMeta(input.payer ?? input.owner, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.member, "member"), role: AccountRole.READONLY },
      { address: parseAddress(input.poll, "poll"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.ballot, "ballot"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: concatBytes(PAWKET_DISCRIMINATORS.vote, u8.encode(input.option)),
  };
}

/* ------------------------------------------------------------- the guestbook */

/** `wave`: anyone but its owner waves at a pet, once a UTC day. The payer covers the guestbook's rent the first time. */
export function getWaveInstruction(input: {
  visitor: SignerInput;
  payer?: SignerInput;
  pet: string | Address;
  /** `deriveGuestbookPda(pet)`. */
  guestbook: string | Address;
  programId?: string | Address;
}): Instruction {
  return {
    programAddress: programAddress(input.programId),
    accounts: [
      signerMeta(input.visitor, AccountRole.READONLY_SIGNER, "visitor"),
      signerMeta(input.payer ?? input.visitor, AccountRole.WRITABLE_SIGNER, "payer"),
      { address: parseAddress(input.pet, "pet"), role: AccountRole.READONLY },
      { address: parseAddress(input.guestbook, "guestbook"), role: AccountRole.WRITABLE },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(PAWKET_DISCRIMINATORS.wave),
  };
}

/** Owner-approved funding brackets; keep the owner's existing SOL unchanged and return all change. */
export function getWalletSpendInstruction(input: {
  owner: SignerInput; wallet: string | Address; device: string | Address;
  keep: bigint; amount?: bigint;
}): Instruction {
  if (input.keep < 0n || (input.amount !== undefined && input.amount < 0n)) throw new Error("Choose a nonnegative amount");
  return {
    programAddress: programAddress(),
    accounts: [
      signerMeta(input.owner, AccountRole.WRITABLE_SIGNER, "owner"),
      { address: parseAddress(input.wallet, "wallet"), role: AccountRole.WRITABLE },
      { address: parseAddress(input.device, "device"), role: AccountRole.WRITABLE },
      { address: parseAddress("Sysvar1nstructions1111111111111111111111111", "instructions"), role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM, role: AccountRole.READONLY },
    ],
    data: input.amount === undefined
      ? concatBytes(PAWKET_DISCRIMINATORS.settleWalletSpend, u64.encode(input.keep))
      : concatBytes(PAWKET_DISCRIMINATORS.fundWalletSpend, u64.encode(input.amount), u64.encode(input.keep)),
  };
}
