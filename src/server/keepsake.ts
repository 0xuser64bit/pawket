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

async function keepsakeSigner(pet: Address): Promise<KeyPairSigner | null> {
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return null;
  const secret = Uint8Array.from(JSON.parse(keypair) as number[]).subarray(0, 32);
  const seed = createHmac("sha256", secret).update(`pawket keepsake ${pet}`).digest();
  return createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(seed));
}

export interface Keepsake {
  address: Address;
  made: boolean;
}

export async function readKeepsake(pet: Address): Promise<Keepsake | null> {
  const signer = await keepsakeSigner(pet);
  if (!signer) return null;
  const account = await fetchEncodedAccount(sponsorRpc(), signer.address);
  return { address: signer.address, made: account.exists && account.programAddress === MPL_CORE_PROGRAM_ID };
}

function keepsakeUri(pet: string): string {
  return new URL(`/api/keepsake/${pet}`, getPublicEnv().appUrl).toString();
}

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
