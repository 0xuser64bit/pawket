import "server-only";

import { createSolanaRpc, isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import {
  fetchGuild,
  fetchGuildAt,
  fetchGuildPets,
  fetchGuilds,
  fetchPetOnChain,
  fetchPetsOnChain,
  type ChainGuild,
  type PetOnChain,
} from "@/lib/solana/accounts";

/**
 * Server Components read Solana here: the server's RPC (which may carry a
 * provider key), never the wallet client. Reads are live — the chain is the
 * record. The one exception is the scan of every pet: see `readAllPets`.
 */
function rpc() {
  return createSolanaRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
}

/** The pet at `id`, null when `id` is not an address or nothing lives there; throws when Solana does not answer. */
export async function readPet(id: string): Promise<PetOnChain | null> {
  if (!isAddress(id)) return null;
  return fetchPetOnChain(rpc(), id);
}

/** How long one scan of every pet answers for. */
export const ALL_PETS_FRESH_MS = 8_000;
let scan: { at: number; pets: Promise<PetOnChain[]> } | null = null;

/**
 * Every pet the program keeps. A scan is the heaviest read Pawket makes
 * (`getProgramAccounts`), and the park and the front door ask for it on
 * every visit — the front door twice — so callers within a few seconds of
 * each other share one: a crowd arriving at once is one request, not a
 * rate limit. A failed scan is never kept, so the next visit asks again and
 * nothing stale is ever shown as live.
 */
export async function readAllPets(): Promise<PetOnChain[]> {
  const now = Date.now();
  if (scan && now - scan.at < ALL_PETS_FRESH_MS) return scan.pets;
  const pets = fetchPetsOnChain(rpc());
  const mine = { at: now, pets };
  scan = mine;
  pets.catch(() => {
    if (scan === mine) scan = null;
  });
  return pets;
}

let guildScan: { at: number; guilds: Promise<ChainGuild[]> } | null = null;

/** Every guild the program keeps, shared between callers like the scan of every pet. */
export async function readGuilds(): Promise<ChainGuild[]> {
  const now = Date.now();
  if (guildScan && now - guildScan.at < ALL_PETS_FRESH_MS) return guildScan.guilds;
  const guilds = fetchGuilds(rpc());
  const mine = { at: now, guilds };
  guildScan = mine;
  guilds.catch(() => {
    if (guildScan === mine) guildScan = null;
  });
  return guilds;
}

/** The guild at `slug`, or null; throws when Solana does not answer. */
export async function readGuild(slug: string): Promise<ChainGuild | null> {
  return fetchGuild(rpc(), slug);
}

/** The guild a pet's place points at, or null. */
export async function readGuildAt(address: string): Promise<ChainGuild | null> {
  return fetchGuildAt(rpc(), address);
}

/** Every pet in a guild, read live. */
export async function readGuildPets(guild: string): Promise<PetOnChain[]> {
  return fetchGuildPets(rpc(), guild);
}
