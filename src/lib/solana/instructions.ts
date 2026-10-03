import {
  AccountRole,
  address,
  getU32Encoder,
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
  GUILD_LIMITS,
  PAWKET_DISCRIMINATORS,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  WEARABLE_COUNT,
} from "./program";

const SYSTEM_PROGRAM = address("11111111111111111111111111111111");

const u8 = getU8Encoder();
const u32 = getU32Encoder();
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
