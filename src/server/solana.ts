import "server-only";

import { createSolanaRpc, isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import { fetchPetOnChain, fetchPetsOnChain, type PetOnChain } from "@/lib/solana/accounts";

/**
 * Server Components read Solana here: the server's RPC (which may carry a
 * provider key), never the wallet client. Every read is live — the chain is
 * the record, and there is no cache between it and the page.
 */
function rpc() {
  return createSolanaRpc(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl);
}

/** The pet at `id`, null when `id` is not an address or nothing lives there; throws when Solana does not answer. */
export async function readPet(id: string): Promise<PetOnChain | null> {
  if (!isAddress(id)) return null;
  return fetchPetOnChain(rpc(), id);
}

/** Every pet the program keeps. */
export async function readAllPets(): Promise<PetOnChain[]> {
  return fetchPetsOnChain(rpc());
}
