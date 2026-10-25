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

export async function deriveWalletPda(
  owner: string | Address,
  programId: string | Address = PAWKET_PROGRAM_ID,
): Promise<DerivedPda> {
  const ownerAddress = parseAddress(owner, "owner");
  const programAddress = parseAddress(programId, "program ID");
  const [addr, bump] = await getProgramDerivedAddress({
    programAddress,
    seeds: [utf8Encoder.encode(PAWKET_SEEDS.wallet), getAddressEncoder().encode(ownerAddress)],
  });
  return { address: addr, bump };
}

const seed = (name: keyof typeof PAWKET_SEEDS) => utf8Encoder.encode(PAWKET_SEEDS[name]);
const bytesOf = (value: string | Address, label: string) => getAddressEncoder().encode(parseAddress(value, label));
const u32Le = (id: number) => new Uint8Array(new Uint32Array([id]).buffer);

async function derive(seeds: Array<Uint8Array | ReturnType<typeof bytesOf>>, programId: string | Address): Promise<DerivedPda> {
  const [addr, bump] = await getProgramDerivedAddress({ programAddress: parseAddress(programId, "program ID"), seeds });
  return { address: addr, bump };
}

export function deriveClosetPda(owner: string | Address, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("closet"), bytesOf(owner, "owner")], programId);
}

export function deriveEventPda(guild: string | Address, id: number, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("event"), bytesOf(guild, "guild"), u32Le(id)], programId);
}

export function deriveRsvpPda(event: string | Address, pet: string | Address, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("rsvp"), bytesOf(event, "event"), bytesOf(pet, "pet")], programId);
}

export function derivePollPda(guild: string | Address, id: number, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("poll"), bytesOf(guild, "guild"), u32Le(id)], programId);
}

export function deriveBallotPda(poll: string | Address, owner: string | Address, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("ballot"), bytesOf(poll, "poll"), bytesOf(owner, "owner")], programId);
}

export function deriveGuestbookPda(pet: string | Address, programId: string | Address = PAWKET_PROGRAM_ID) {
  return derive([seed("guestbook"), bytesOf(pet, "pet")], programId);
}
