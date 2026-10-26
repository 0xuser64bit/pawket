// @vitest-environment node
import { createKeyPairSignerFromBytes, type Instruction } from "@solana/kit";
import { afterEach, expect, it, vi } from "vitest";
import type { PetOnChain } from "@/lib/solana/accounts";

const built = vi.hoisted(() => ({ instructions: [] as Instruction[] }));
vi.mock("./sponsor", () => ({
  sponsorRpc: () => ({}),
  signedBySponsor: async (_sponsor: unknown, instructions: Instruction[]) => {
    built.instructions = instructions;
    throw new Error("built");
  },
}));

const { keepsakeTransaction } = await import("./keepsake");

const key = async () => {
  const pair = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const secret = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).slice(-32);
  return Uint8Array.from([...secret, ...new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))]);
};
const pet = {
  pet: { address: "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp", owner: "3S6RvbyUvbCqyAEKNu3gGHDJoi7ZZB3JwQ7gFsDRhjEs", name: "Mango", species: 0, personality: 0 },
} as unknown as PetOnChain;
const authorityOf = async (sponsorBytes: Uint8Array) => {
  await expect(keepsakeTransaction(await createKeyPairSignerFromBytes(sponsorBytes), pet)).rejects.toThrow("built");
  return built.instructions[0].accounts![2].address;
};

afterEach(() => vi.unstubAllEnvs());

it("signs a keepsake with the sponsor as the collection's authority unless a separate authority is set", async () => {
  const sponsor = await key();
  vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from(sponsor)));
  vi.stubEnv("COLLECTION_AUTHORITY_KEYPAIR", "");
  expect(await authorityOf(sponsor)).toBe((await createKeyPairSignerFromBytes(sponsor)).address);

  const authority = await key();
  vi.stubEnv("COLLECTION_AUTHORITY_KEYPAIR", JSON.stringify(Array.from(authority)));
  expect(await authorityOf(sponsor)).toBe((await createKeyPairSignerFromBytes(authority)).address);

  vi.stubEnv("COLLECTION_AUTHORITY_KEYPAIR", `'${JSON.stringify(Array.from(authority))}'`);
  await expect(keepsakeTransaction(await createKeyPairSignerFromBytes(sponsor), pet)).rejects.toThrow(/^COLLECTION_AUTHORITY_KEYPAIR is not a keypair: a JSON array of 64 bytes\.$/);
});
