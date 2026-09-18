import {
  AccountRole,
  address,
  getU32Encoder,
  getU8Encoder,
  getUtf8Encoder,
  type Address,
  type Instruction,
} from "@solana/kit";
import {
  CareActionType,
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import { normalizePetName, parseAddress } from "./pda";
import {
  CARE_ACTION_VARIANTS,
  PAWKET_DISCRIMINATORS,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
} from "./program";

const SYSTEM_PROGRAM = address("11111111111111111111111111111111");

const u8 = getU8Encoder();
const u32 = getU32Encoder();
const utf8 = getUtf8Encoder();

function concatBytes(...parts: ArrayLike<number>[]): Uint8Array {
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

export interface AdoptPetInstructionInput {
  owner: string | Address;
  pet: string | Address;
  passport: string | Address;
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  programId?: string | Address;
}

export interface CareInstructionInput {
  owner: string | Address;
  pet: string | Address;
  passport: string | Address;
  action: CareActionType;
  programId?: string | Address;
}

/**
 * Builds the `adopt_pet` instruction. Returns an unsigned Kit instruction —
 * callers send it through the wallet-backed client (`client.sendTransaction`),
 * which handles blockhash, signing, simulation, and confirmation.
 */
export function getAdoptPetInstruction(
  input: AdoptPetInstructionInput,
): Instruction {
  const programAddress = parseAddress(
    input.programId ?? PAWKET_PROGRAM_ID,
    "program ID",
  );
  const owner = parseAddress(input.owner, "owner");
  const pet = parseAddress(input.pet, "pet");
  const passport = parseAddress(input.passport, "passport");
  const name = normalizePetName(input.name);

  const species = PET_SPECIES_VARIANTS[input.species];
  const personality = PET_PERSONALITY_VARIANTS[input.personality];
  if (species === undefined) throw new Error(`Unknown species: ${input.species}`);
  if (personality === undefined) {
    throw new Error(`Unknown personality: ${input.personality}`);
  }

  return {
    programAddress,
    accounts: [
      { address: owner, role: AccountRole.WRITABLE_SIGNER },
      { address: pet, role: AccountRole.WRITABLE },
      { address: passport, role: AccountRole.WRITABLE },
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

/** Builds the `perform_care_action` instruction (unsigned). */
export function getCareInstruction(input: CareInstructionInput): Instruction {
  const programAddress = parseAddress(
    input.programId ?? PAWKET_PROGRAM_ID,
    "program ID",
  );
  const owner = parseAddress(input.owner, "owner");
  const pet = parseAddress(input.pet, "pet");
  const passport = parseAddress(input.passport, "passport");

  const variant = CARE_ACTION_VARIANTS[input.action];
  if (variant === undefined) throw new Error(`Unknown action: ${input.action}`);

  return {
    programAddress,
    accounts: [
      { address: owner, role: AccountRole.READONLY_SIGNER },
      { address: pet, role: AccountRole.WRITABLE },
      { address: passport, role: AccountRole.WRITABLE },
    ],
    data: concatBytes(
      new Uint8Array(PAWKET_DISCRIMINATORS.performCareAction),
      encodeVariant(variant, "care action"),
    ),
  };
}
