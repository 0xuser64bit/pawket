import "server-only";

import { isAddress } from "@solana/kit";
import { serverRpcUrl } from "@/config/server-env";
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

function rpc() {
  return createPatientRpc(serverRpcUrl());
}

export async function readPet(id: string): Promise<PetOnChain | null> {
  if (!isAddress(id)) return null;
  return fetchPetOnChain(rpc(), id);
}

export async function readOwnedPets(owner: string): Promise<PetOnChain[]> {
  return (await fetchPetsOnChain(rpc(), owner)).sort((a, b) => b.pet.birthTimestamp - a.pet.birthTimestamp);
}

export const ALL_PETS_FRESH_MS = 8_000;
let scan: { at: number; pets: Promise<PetOnChain[]> } | null = null;
const scanAllPets = shared(() => fetchPetsOnChain(rpc()), "all-pets", 20);
const scanGuilds = shared(() => fetchGuilds(rpc()), "all-guilds", 20);

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

export async function readGuild(slug: string): Promise<ChainGuild | null> {
  return fetchGuild(rpc(), slug);
}

export async function readGuildAt(address: string): Promise<ChainGuild | null> {
  return fetchGuildAt(rpc(), address);
}

export async function readGuildPets(guild: string): Promise<PetOnChain[]> {
  return fetchGuildPets(rpc(), guild);
}

export async function readGatherings(guild: string): Promise<{ events: ChainEvent[]; polls: ChainPoll[] }> {
  const [events, polls] = await Promise.all([fetchGuildEvents(rpc(), guild), fetchGuildPolls(rpc(), guild)]);
  return { events, polls };
}

export async function readGuestbook(pet: string): Promise<ChainGuestbook | null> {
  return fetchGuestbook(rpc(), pet);
}

export async function readGatheringsCame(pet: string): Promise<number> {
  return (await fetchPetRsvps(rpc(), pet)).filter((rsvp) => rsvp.came).length;
}
