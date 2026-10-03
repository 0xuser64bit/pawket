import {
  address,
  assertIsAddress,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  type Address,
} from "@solana/kit";
import { normalizePetName, SolanaValidationError } from "./names";
import { PAWKET_PROGRAM_ID, PAWKET_SEEDS } from "./program";

const utf8Encoder = getUtf8Encoder();

export { normalizePetName, SolanaValidationError } from "./names";

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

/** A guild's account: seeded by its slug, so a slug is one guild. */
export async function deriveGuildPda(
  slug: string,
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const programAddress = parseAddress(programId, "program ID");
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [utf8Encoder.encode(PAWKET_SEEDS.guild), utf8Encoder.encode(slug)],
  });
  return { address: addr, bump };
}

/** A pet's place in a guild: seeded by the pet, so a pet is in one guild at most. */
export async function deriveMemberPda(
  pet: string | Address,
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const petAddress = parseAddress(pet, "pet");
  const programAddress = parseAddress(programId, "program ID");
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [utf8Encoder.encode(PAWKET_SEEDS.member), getAddressEncoder().encode(petAddress)],
  });
  return { address: addr, bump };
}
