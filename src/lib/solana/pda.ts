import {
  address,
  assertIsAddress,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
} from "@solana/kit";
import {
  MAX_NAME_BYTES,
  MAX_SKU_BYTES,
  MIN_NAME_BYTES,
  MIN_SKU_BYTES,
  PAWKET_PROGRAM_ID,
  PAWKET_SEEDS,
} from "./program";

export class SolanaValidationError extends Error {
  readonly code = "SOLANA_VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "SolanaValidationError";
  }
}

const utf8Encoder = getUtf8Encoder();

function byteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

/** Trim + validate an on-chain name (2–24 UTF-8 bytes) before derivation. */
export function normalizePetName(name: string): string {
  const trimmed = name.trim();
  const length = byteLength(trimmed);
  if (length < MIN_NAME_BYTES || length > MAX_NAME_BYTES) {
    throw new SolanaValidationError(
      `Pet name must be ${MIN_NAME_BYTES}–${MAX_NAME_BYTES} UTF-8 bytes.`,
    );
  }
  return trimmed;
}

/** Trim + validate an SKU seed (2–32 UTF-8 bytes). */
export function normalizeSku(sku: string): string {
  const trimmed = sku.trim();
  const length = byteLength(trimmed);
  if (length < MIN_SKU_BYTES || length > MAX_SKU_BYTES) {
    throw new SolanaValidationError(
      `SKU must be ${MIN_SKU_BYTES}–${MAX_SKU_BYTES} UTF-8 bytes.`,
    );
  }
  return trimmed;
}

export function parseAddress(value: string | Address, label: string): Address {
  try {
    const addr = typeof value === "string" ? address(value) : value;
    assertIsAddress(addr);
    return addr;
  } catch {
    throw new SolanaValidationError(`Invalid ${label}: not a Solana address.`);
  }
}

export interface DerivedPda {
  address: Address;
  bump: number;
}

export async function deriveGameConfigPda(
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const programAddress = parseAddress(programId, "program ID");
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [utf8Encoder.encode(PAWKET_SEEDS.gameConfig)],
  });
  return { address: addr, bump };
}

export async function derivePetPda(
  owner: string | Address,
  name: string,
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const ownerAddress = parseAddress(owner, "owner");
  const normalized = normalizePetName(name);
  const programAddress = parseAddress(programId, "program ID");
  const ownerBytes = getAddressEncoder().encode(ownerAddress);
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      utf8Encoder.encode(PAWKET_SEEDS.pet),
      ownerBytes,
      utf8Encoder.encode(normalized),
    ],
  });
  return { address: addr, bump };
}

export async function derivePassportPda(
  pet: string | Address,
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const petAddress = parseAddress(pet, "pet");
  const programAddress = parseAddress(programId, "program ID");
  const petBytes = getAddressEncoder().encode(petAddress);
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [utf8Encoder.encode(PAWKET_SEEDS.passport), petBytes],
  });
  return { address: addr, bump };
}
