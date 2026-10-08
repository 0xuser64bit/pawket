import "server-only";

import { createHmac } from "node:crypto";
import {
  createKeyPairSignerFromPrivateKeyBytes,
  createNoopSigner,
  fetchEncodedAccount,
  getBase64EncodedWireTransaction,
  type Address,
  type KeyPairSigner,
} from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import { PERSONALITY_LABEL, SPECIES_LABEL } from "@/lib/game/appearance";
import type { PetOnChain } from "@/lib/solana/accounts";
import { getCreateKeepsakeInstruction, MPL_CORE_PROGRAM_ID, PAWKET_COLLECTION } from "@/lib/solana/core";
import { deriveWalletPda } from "@/lib/solana/pda";
import { signedBySponsor, sponsorRpc } from "./sponsor";

/**
 * A pet's keepsake: its card in the owner's wallet (`src/lib/solana/core.ts`).
 * The card's key comes from the sponsor's and the pet's address, so a pet
 * has one card at one address, the Passport finds it without an index, and
 * nobody else can make it. Keepsakes are off wherever the sponsor is.
 */
async function keepsakeSigner(pet: Address): Promise<KeyPairSigner | null> {
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return null;
  const secret = Uint8Array.from(JSON.parse(keypair) as number[]).subarray(0, 32);
  const seed = createHmac("sha256", secret).update(`pawket keepsake ${pet}`).digest();
  return createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(seed));
}

export interface Keepsake {
  address: Address;
  /** True once the card is on Solana. */
  made: boolean;
}

/** Where the pet's card lives and whether it is there yet; null where keepsakes are off. */
export async function readKeepsake(pet: Address): Promise<Keepsake | null> {
  const signer = await keepsakeSigner(pet);
  if (!signer) return null;
  const account = await fetchEncodedAccount(sponsorRpc(), signer.address);
  return { address: signer.address, made: account.exists && account.programAddress === MPL_CORE_PROGRAM_ID };
}

/** The URI a card carries, on the canonical host so it outlives any one deployment. */
export function keepsakeUri(pet: string): string {
  return new URL(`/api/keepsake/${pet}`, getPublicEnv().appUrl).toString();
}

/**
 * The card's creation, signed by the sponsor (fee, rent, the collection's
 * say-so) and by the card's own key. The owner's slot stays open: their
 * wallet signs last, so a card never lands in a wallet that did not ask.
 */
export async function keepsakeTransaction(sponsor: KeyPairSigner, { pet }: PetOnChain): Promise<string> {
  const asset = await keepsakeSigner(pet.address);
  if (!asset) throw new Error("Keepsakes are off on this deployment.");
  const transaction = await signedBySponsor(sponsor, [
    getCreateKeepsakeInstruction({
      asset,
      collection: PAWKET_COLLECTION,
      authority: sponsor,
      payer: sponsor,
      owner: createNoopSigner(pet.owner),
      pet: pet.address,
      pawketWallet: (await deriveWalletPda(pet.owner)).address,
      name: pet.name,
      uri: keepsakeUri(pet.address),
      species: SPECIES_LABEL[pet.species],
      personality: PERSONALITY_LABEL[pet.personality],
    }),
  ]);
  return getBase64EncodedWireTransaction(transaction);
}
