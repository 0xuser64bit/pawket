import "server-only";

import { isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import {
  fetchGuestbook,
  fetchGuild,
  fetchGuildAt,
  fetchGuildEvents,
  fetchGuildPets,
  fetchGuildPolls,
  fetchGuilds,
  fetchPetOnChain,
  fetchPetRsvps,
  fetchPetsOnChain,
  type ChainEvent,
  type ChainGuestbook,
  type ChainGuild,
  type ChainPoll,
  type PetOnChain,
} from "@/lib/solana/accounts";
import { createPatientRpc } from "@/lib/solana/rpc";
import { shared } from "./cache";

/**
 * Server Components read Solana here: the server's RPC (which may carry a
 * provider key), never the wallet client. Reads are live — the chain is the
 * record. The one exception is the scan of every pet: see `readAllPets`.
 */
function rpc() {
  return createPatientRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
}

/** The pet at `id`, null when `id` is not an address or nothing lives there; throws when Solana does not answer. */
export async function readPet(id: string): Promise<PetOnChain | null> {
  if (!isAddress(id)) return null;
  return fetchPetOnChain(rpc(), id);
}

/** Every pet one wallet keeps on Solana, read live, most recently adopted first. */
export async function readOwnedPets(owner: string): Promise<PetOnChain[]> {
  return (await fetchPetsOnChain(rpc(), owner)).sort((a, b) => b.pet.birthTimestamp - a.pet.birthTimestamp);
}

/** How long one scan of every pet answers for, in this process. */
export const ALL_PETS_FRESH_MS = 8_000;
let scan: { at: number; pets: Promise<PetOnChain[]> } | null = null;
/** And across instances: twenty seconds of the Data Cache, then read again. */
const scanAllPets = shared(() => fetchPetsOnChain(rpc()), "all-pets", 20);
const scanGuilds = shared(() => fetchGuilds(rpc()), "all-guilds", 20);

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
  const pets = scanAllPets();
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
  const guilds = scanGuilds();
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

/** A guild's events and polls, read live: soonest event first, newest poll first. */
export async function readGatherings(guild: string): Promise<{ events: ChainEvent[]; polls: ChainPoll[] }> {
  const [events, polls] = await Promise.all([fetchGuildEvents(rpc(), guild), fetchGuildPolls(rpc(), guild)]);
  return { events, polls };
}

/** Who waved at a pet, or null before anyone has. */
export async function readGuestbook(pet: string): Promise<ChainGuestbook | null> {
  return fetchGuestbook(rpc(), pet);
}

/** How many guild events a pet checked in at, read from its RSVPs. */
export async function readGatheringsCame(pet: string): Promise<number> {
  return (await fetchPetRsvps(rpc(), pet)).filter((rsvp) => rsvp.came).length;
}
