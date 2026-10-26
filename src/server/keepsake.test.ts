// @vitest-environment node
import { address, createKeyPairSignerFromBytes, getAddressEncoder, type Address, type Instruction } from "@solana/kit";
import { afterEach, expect, it, vi } from "vitest";
import type { PetOnChain } from "@/lib/solana/accounts";
import { MPL_CORE_PROGRAM_ID, PAWKET_COLLECTION } from "@/lib/solana/core";

const built = vi.hoisted(() => ({ instructions: [] as Instruction[], account: null as { owner: string; data: Uint8Array } | null }));
vi.mock("./sponsor", () => ({
  sponsorRpc: () => ({
    getAccountInfo: () => ({
      send: async () => ({
        value: built.account && {
          owner: built.account.owner,
          data: [Buffer.from(built.account.data).toString("base64"), "base64"],
          executable: false,
          lamports: 3_000_000n,
          space: BigInt(built.account.data.length),
        },
      }),
    }),
  }),
  signedBySponsor: async (_sponsor: unknown, instructions: Instruction[]) => {
    built.instructions = instructions;
    throw new Error("built");
  },
}));

const { keepsakeTransaction, readKeepsake } = await import("./keepsake");

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

it("finds a pet's card only as an asset of Pawket's collection held by the pet's owner", async () => {
  vi.stubEnv("SPONSOR_KEYPAIR", JSON.stringify(Array.from(await key())));
  vi.stubEnv("DERIVATION_SECRET", "");
  const { address: at, owner } = pet.pet as { address: Address; owner: Address };
  const bytes = (who: string) => [...getAddressEncoder().encode(address(who))];
  const asset = (holder: string, collection: string) => Uint8Array.from([1, ...bytes(holder), 2, ...bytes(collection), 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  built.account = null;
  expect(await readKeepsake({ address: at, owner })).toMatchObject({ made: false });
  built.account = { owner: MPL_CORE_PROGRAM_ID, data: asset(owner, PAWKET_COLLECTION) };
  expect(await readKeepsake({ address: at, owner })).toMatchObject({ made: true });
  for (const squatted of [asset(at, PAWKET_COLLECTION), asset(owner, at)]) {
    built.account = { owner: MPL_CORE_PROGRAM_ID, data: squatted };
    expect(await readKeepsake({ address: at, owner })).toMatchObject({ made: false });
  }
  built.account = { owner: "11111111111111111111111111111111", data: asset(owner, PAWKET_COLLECTION) };
  expect(await readKeepsake({ address: at, owner })).toMatchObject({ made: false });
});
