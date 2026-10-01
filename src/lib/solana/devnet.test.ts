// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  generateKeyPairSigner,
  type KeyPairSigner,
} from "@solana/kit";
import { beforeAll, describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { fetchPetOnChain, fetchPetsOnChain, toCompanionRecord, wearableSlot } from "./accounts";
import {
  getAdoptPetInstruction,
  getCareInstruction,
  getDressInstruction,
  getFinishRoundInstruction,
} from "./instructions";
import { derivePassportPda, derivePetPda } from "./pda";
import { sendPawket } from "./send";
import { cosign } from "./sponsor";
import { extractProgramErrorCode } from "./transactions";

/**
 * The whole path on devnet, run by `pnpm e2e:devnet` and skipped otherwise:
 * a brand-new wallet with no SOL adopts, cares, plays and dresses through
 * the sponsor, and every number comes back from the chain. The sponsor key
 * is SPONSOR_KEYPAIR or .keys/sponsor.json.
 */
const RUN = process.env.PAWKET_DEVNET === "1";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

describe.skipIf(!RUN)("Pawket on devnet", { timeout: 180_000 }, () => {
  const rpc = createSolanaRpc(RPC_URL);
  let sponsor: KeyPairSigner;
  let owner: KeyPairSigner;
  let pet: Awaited<ReturnType<typeof derivePetPda>>["address"];
  let passport: typeof pet;
  // A pet adopted here is a real pet on devnet, so it gets a pet's name.
  const NAMES = ["Biscuit", "Mochi", "Clover", "Juniper", "Waffles", "Pickle", "Noodle", "Sprout"];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];

  const send = (instructions: Parameters<typeof sendPawket>[0]["instructions"]) =>
    sendPawket({
      rpc,
      owner,
      sponsor: sponsor.address,
      instructions,
      cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
    });

  beforeAll(async () => {
    const raw = process.env.SPONSOR_KEYPAIR ?? readFileSync(path.join(process.cwd(), ".keys/sponsor.json"), "utf8");
    sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(raw) as number[]));
    owner = await generateKeyPairSigner();
    pet = (await derivePetPda(owner.address, name)).address;
    passport = (await derivePassportPda(pet)).address;
  });

  it("adopts for a wallet with no SOL", async () => {
    const result = await send(({ payer }) => [
      getAdoptPetInstruction({
        owner,
        payer,
        pet,
        passport,
        name,
        species: PetSpecies.CloudBun,
        personality: PetPersonality.Brave,
      }),
    ]);
    expect(result).toMatchObject({ outcome: "confirmed", sponsored: true });

    const onChain = await fetchPetOnChain(rpc, pet);
    expect(onChain?.pet).toMatchObject({
      owner: owner.address,
      name,
      species: PetSpecies.CloudBun,
      personality: PetPersonality.Brave,
      stats: { hunger: 72, happiness: 72, energy: 72, hygiene: 72 },
      xp: 0,
      wearing: 0,
    });
    const { value: lamports } = await rpc.getBalance(owner.address).send();
    expect(lamports).toBe(0n);
  });

  it("cares, plays a round and dresses, and reads it all back", async () => {
    await send(() => [getCareInstruction({ owner, pet, passport, action: CareActionType.Feed })]);
    await send(() => [getFinishRoundInstruction({ owner, pet, passport })]);
    await send(() => [getDressInstruction({ owner, pet, wearing: wearableSlot("rain-cape") })]);

    const onChain = await fetchPetOnChain(rpc, pet);
    expect(onChain).not.toBeNull();
    const record = toCompanionRecord(onChain!);
    expect(record.xp).toBe(35);
    expect(record.stats.hunger).toBeGreaterThanOrEqual(94);
    expect(record.careLog.map((entry) => entry.action)).toEqual([CareActionType.Feed]);
    expect(record.streak.count).toBe(1);
    expect(record.plays).toBe(1);
    expect(record.wearing).toBe("rain-cape");
  });

  it("refuses a care still cooling down before anyone pays for it", async () => {
    const before = (await rpc.getBalance(sponsor.address).send()).value;
    const refused = await send(() => [
      getCareInstruction({ owner, pet, passport, action: CareActionType.Feed }),
    ]).catch((error: unknown) => error);
    expect(extractProgramErrorCode(refused)).toBe(6002);
    // Preflight refused it, so nothing landed and nobody paid.
    expect((await rpc.getBalance(sponsor.address).send()).value).toBe(before);
  });

  it("finds the pet among its owner's", async () => {
    const mine = await fetchPetsOnChain(rpc, owner.address);
    expect(mine.map((entry) => entry.pet.address)).toEqual([pet]);
  });
});
