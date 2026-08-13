import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { CareActionType, PetPersonality, PetSpecies } from '@pawket/shared';
import { PawketError } from './errors';

/** Must match `declare_id!` in programs/pawket and programs/pawket/idl/pawket.json. */
export const PAWKET_PROGRAM_ID = 'FQwe9LUPMTrhYyr32mHPpX87tcpjr98Eamz9wJQDaSef';
export const PAWKET_DEFAULT_CLUSTER = 'devnet';
export const PAWKET_DEVNET_RPC_URL = 'https://api.devnet.solana.com';

/**
 * Anchor 8-byte instruction discriminators.
 * Source of truth after `anchor build`: programs/pawket/idl/pawket.json
 * (`pnpm invariants` checks these against the committed IDL).
 * There are no builders yet for `register_item` / `record_purchase`.
 */
export const PAWKET_INSTRUCTION_DISCRIMINATORS = {
  adoptPet: [76, 210, 131, 114, 75, 135, 64, 171],
  initializeGameConfig: [45, 61, 80, 55, 152, 63, 158, 47],
  performCareAction: [74, 53, 41, 221, 110, 244, 231, 218],
} as const;

export type PawketProgramConfig = { rpcUrl: string; programId?: string };
export type PublicKeyInput = PublicKey | string;
export type PawketPda = { publicKey: PublicKey; bump: number };
type TransactionInstructionData = NonNullable<
  ConstructorParameters<typeof TransactionInstruction>[0]['data']
>;

export type BuildAdoptPetTransactionInput = {
  owner: PublicKeyInput;
  name: string;
  species: PetSpecies;
  personality: PetPersonality;
  recentBlockhash?: string;
  feePayer?: PublicKeyInput;
  programId?: PublicKeyInput;
};

export type BuildCareTransactionInput = {
  owner: PublicKeyInput;
  petName: string;
  action: CareActionType;
  recentBlockhash?: string;
  feePayer?: PublicKeyInput;
  programId?: PublicKeyInput;
};

export type BuildInitializeGameConfigTransactionInput = {
  authority: PublicKeyInput;
  treasury: PublicKeyInput;
  recentBlockhash?: string;
  feePayer?: PublicKeyInput;
  programId?: PublicKeyInput;
};

export class PawketSolanaValidationError extends PawketError {
  constructor(message: string) {
    super(message, 'SOLANA_VALIDATION_ERROR');
  }
}

const textEncoder = new TextEncoder();

const petSpeciesVariants: Record<PetSpecies, number> = {
  [PetSpecies.LunaCat]: 0,
  [PetSpecies.MossPup]: 1,
  [PetSpecies.CloudBun]: 2,
};

const petPersonalityVariants: Record<PetPersonality, number> = {
  [PetPersonality.Curious]: 0,
  [PetPersonality.Cozy]: 1,
  [PetPersonality.Brave]: 2,
  [PetPersonality.Mischief]: 3,
};

const careActionVariants: Record<CareActionType, number> = {
  [CareActionType.Feed]: 0,
  [CareActionType.Play]: 1,
  [CareActionType.Groom]: 2,
  [CareActionType.Rest]: 3,
};

export function encodePetSpeciesVariant(species: PetSpecies): number {
  return encodeEnumVariant(species, petSpeciesVariants, 'species');
}

export function encodePetPersonalityVariant(personality: PetPersonality): number {
  return encodeEnumVariant(personality, petPersonalityVariants, 'personality');
}

export function encodeCareActionVariant(action: CareActionType): number {
  return encodeEnumVariant(action, careActionVariants, 'care action');
}

export function deriveGameConfigPda(programId: PublicKeyInput = PAWKET_PROGRAM_ID): PawketPda {
  return findPda([encodeSeed('game_config')], parsePublicKey(programId, 'programId'));
}

export function derivePetPda(
  owner: PublicKeyInput,
  name: string,
  programId: PublicKeyInput = PAWKET_PROGRAM_ID,
): PawketPda {
  const ownerKey = parsePublicKey(owner, 'owner');
  const normalizedName = normalizePetName(name, 'name');
  return findPda(
    [encodeSeed('pet'), ownerKey.toBuffer(), encodeSeed(normalizedName)],
    parsePublicKey(programId, 'programId'),
  );
}

export function derivePassportPda(
  pet: PublicKeyInput,
  programId: PublicKeyInput = PAWKET_PROGRAM_ID,
): PawketPda {
  const petKey = parsePublicKey(pet, 'pet');
  return findPda(
    [encodeSeed('passport'), petKey.toBuffer()],
    parsePublicKey(programId, 'programId'),
  );
}

export function deriveItemPda(
  sku: string,
  programId: PublicKeyInput = PAWKET_PROGRAM_ID,
): PawketPda {
  const normalizedSku = normalizeSeedString(sku, 'sku', 2, 32);
  return findPda(
    [encodeSeed('item'), encodeSeed(normalizedSku)],
    parsePublicKey(programId, 'programId'),
  );
}

export function deriveOwnershipPda(
  owner: PublicKeyInput,
  item: PublicKeyInput,
  programId: PublicKeyInput = PAWKET_PROGRAM_ID,
): PawketPda {
  const ownerKey = parsePublicKey(owner, 'owner');
  const itemKey = parsePublicKey(item, 'item');
  return findPda(
    [encodeSeed('ownership'), ownerKey.toBuffer(), itemKey.toBuffer()],
    parsePublicKey(programId, 'programId'),
  );
}

export function buildAdoptPetTransaction(input: BuildAdoptPetTransactionInput): Transaction {
  const programId = parsePublicKey(input.programId ?? PAWKET_PROGRAM_ID, 'programId');
  const owner = parsePublicKey(input.owner, 'owner');
  const feePayer = parsePublicKey(input.feePayer ?? owner, 'feePayer');
  const name = normalizePetName(input.name, 'name');
  const pet = derivePetPda(owner, name, programId).publicKey;
  const passport = derivePassportPda(pet, programId).publicKey;

  return transactionWithInstruction({
    feePayer,
    recentBlockhash: input.recentBlockhash,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: pet, isSigner: false, isWritable: true },
        { pubkey: passport, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData(
        concatBytes(
          PAWKET_INSTRUCTION_DISCRIMINATORS.adoptPet,
          encodeString(name),
          [encodePetSpeciesVariant(input.species)],
          [encodePetPersonalityVariant(input.personality)],
        ),
      ),
    }),
  });
}

export function buildCareTransaction(input: BuildCareTransactionInput): Transaction {
  const programId = parsePublicKey(input.programId ?? PAWKET_PROGRAM_ID, 'programId');
  const owner = parsePublicKey(input.owner, 'owner');
  const feePayer = parsePublicKey(input.feePayer ?? owner, 'feePayer');
  const petName = normalizePetName(input.petName, 'petName');
  const pet = derivePetPda(owner, petName, programId).publicKey;
  const passport = derivePassportPda(pet, programId).publicKey;

  return transactionWithInstruction({
    feePayer,
    recentBlockhash: input.recentBlockhash,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: pet, isSigner: false, isWritable: true },
        { pubkey: passport, isSigner: false, isWritable: true },
      ],
      data: instructionData(
        concatBytes(PAWKET_INSTRUCTION_DISCRIMINATORS.performCareAction, [
          encodeCareActionVariant(input.action),
        ]),
      ),
    }),
  });
}

export function buildInitializeGameConfigTransaction(
  input: BuildInitializeGameConfigTransactionInput,
): Transaction {
  const programId = parsePublicKey(input.programId ?? PAWKET_PROGRAM_ID, 'programId');
  const authority = parsePublicKey(input.authority, 'authority');
  const treasury = parsePublicKey(input.treasury, 'treasury');
  const feePayer = parsePublicKey(input.feePayer ?? authority, 'feePayer');
  const gameConfig = deriveGameConfigPda(programId).publicKey;

  return transactionWithInstruction({
    feePayer,
    recentBlockhash: input.recentBlockhash,
    instruction: new TransactionInstruction({
      programId,
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: gameConfig, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData(
        concatBytes(PAWKET_INSTRUCTION_DISCRIMINATORS.initializeGameConfig, treasury.toBytes()),
      ),
    }),
  });
}

export class PawketProgramClient {
  readonly connection: Connection;
  readonly programId: PublicKey;

  constructor(config: PawketProgramConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.programId = parsePublicKey(config.programId ?? PAWKET_PROGRAM_ID, 'programId');
  }

  async getPetAddress(owner: PublicKey, petName: string) {
    return derivePetPda(owner, petName, this.programId).publicKey;
  }

  buildAdoptPetTransaction(input: Omit<BuildAdoptPetTransactionInput, 'programId'>) {
    return buildAdoptPetTransaction({ ...input, programId: this.programId });
  }

  buildCareTransaction(input: Omit<BuildCareTransactionInput, 'programId'>) {
    return buildCareTransaction({ ...input, programId: this.programId });
  }

  buildInitializeGameConfigTransaction(
    input: Omit<BuildInitializeGameConfigTransactionInput, 'programId'>,
  ) {
    return buildInitializeGameConfigTransaction({ ...input, programId: this.programId });
  }
}

function encodeEnumVariant<T extends string>(
  value: T,
  variants: Partial<Record<T, number>>,
  field: string,
): number {
  const variant = variants[value];
  if (variant === undefined) {
    throw new PawketSolanaValidationError(`Invalid ${field} variant: ${String(value)}.`);
  }
  return variant;
}

function parsePublicKey(value: PublicKeyInput, field: string): PublicKey {
  if (value instanceof PublicKey) return value;
  try {
    return new PublicKey(value);
  } catch {
    throw new PawketSolanaValidationError(`${field} must be a valid Solana public key.`);
  }
}

function normalizePetName(value: string, field: string): string {
  return normalizeSeedString(value, field, 2, 24);
}

function normalizeSeedString(
  value: string,
  field: string,
  minBytes: number,
  maxBytes: number,
): string {
  if (typeof value !== 'string') {
    throw new PawketSolanaValidationError(`${field} must be a string.`);
  }
  const normalized = value.trim();
  const byteLength = textEncoder.encode(normalized).length;
  if (byteLength < minBytes || byteLength > maxBytes) {
    throw new PawketSolanaValidationError(
      `${field} must be ${minBytes}-${maxBytes} UTF-8 bytes after trimming.`,
    );
  }
  return normalized;
}

function encodeSeed(seed: string): Uint8Array {
  return textEncoder.encode(seed);
}

function encodeString(value: string): Uint8Array {
  const bytes = textEncoder.encode(value);
  const output = new Uint8Array(4 + bytes.length);
  new DataView(output.buffer).setUint32(0, bytes.length, true);
  output.set(bytes, 4);
  return output;
}

function concatBytes(...chunks: readonly (ArrayLike<number> | Uint8Array)[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(Array.from(chunk), offset);
    offset += chunk.length;
  }
  return output;
}

function instructionData(data: Uint8Array): TransactionInstructionData {
  return data as unknown as TransactionInstructionData;
}

function findPda(seeds: Uint8Array[], programId: PublicKey): PawketPda {
  const [publicKey, bump] = PublicKey.findProgramAddressSync(seeds, programId);
  return { publicKey, bump };
}

function transactionWithInstruction(input: {
  feePayer: PublicKey;
  recentBlockhash: string | undefined;
  instruction: TransactionInstruction;
}): Transaction {
  const transaction = new Transaction({ feePayer: input.feePayer });
  if (input.recentBlockhash) transaction.recentBlockhash = input.recentBlockhash;
  transaction.add(input.instruction);
  return transaction;
}
