// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  fetchEncodedAccount,
  generateKeyPairSigner,
  getAddressDecoder,
  type KeyPairSigner,
} from "@solana/kit";
import { beforeAll, describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { fetchGuild, fetchGuildPets, fetchPetOnChain, fetchPetsOnChain, toCompanionRecord, wearableSlot } from "./accounts";
import {
  getAdoptPetInstruction,
  getCareInstruction,
  getDressInstruction,
  getFinishRoundInstruction,
  getFoundGuildInstruction,
  getJoinGuildInstruction,
  getLeaveGuildInstruction,
} from "./instructions";
import { deriveGuildPda, deriveMemberPda, derivePassportPda, derivePetPda } from "./pda";
import { keepsakeTransaction, readKeepsake } from "@/server/keepsake";
import { MPL_CORE_PROGRAM_ID } from "./core";
import { sendPawket, sendPrepared } from "./send";
import { cosign } from "./sponsor";
import { extractProgramErrorCode } from "./transactions";
import { TEST_GUILD_NAME } from "@/lib/guilds/delisted";

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
    process.env.SPONSOR_KEYPAIR = raw; // the keepsake's key comes from the sponsor's
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

  it("founds a guild, a second pet joins it and leaves, and the sponsor has its rent back", async () => {
    // A guild is one name for good, so the test's is unique and says what it is.
    const slug = `devnet-check-${Date.now().toString(36)}`;
    const guild = (await deriveGuildPda(slug)).address;
    const founderPlace = (await deriveMemberPda(pet)).address;
    const founded = await send(({ payer }) => [
      getFoundGuildInstruction({ owner, payer, pet, guild, member: founderPlace, slug, name: TEST_GUILD_NAME, motto: "Made by the devnet test.", crest: 1, colour: 1 }),
    ]);
    expect(founded).toMatchObject({ outcome: "confirmed", sponsored: true });
    expect(await fetchGuild(rpc, slug)).toMatchObject({ slug, name: TEST_GUILD_NAME, memberCount: 1, founderPet: pet });

    // A second pet of the same wallet joins, so leaving can be checked on a pet that is not the founder.
    const second = (await derivePetPda(owner.address, `${name}2`)).address;
    const secondPassport = (await derivePassportPda(second)).address;
    const place = (await deriveMemberPda(second)).address;
    await send(({ payer }) => [
      getAdoptPetInstruction({
        owner,
        payer,
        pet: second,
        passport: secondPassport,
        name: `${name}2`,
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Cozy,
      }),
    ]);
    await send(({ payer }) => [getJoinGuildInstruction({ owner, payer, pet: second, guild, member: place })]);
    expect((await fetchGuild(rpc, slug))?.memberCount).toBe(2);
    expect((await fetchGuildPets(rpc, guild)).map((entry) => entry.pet.address).sort()).toEqual([pet, second].sort());
    expect((await fetchPetOnChain(rpc, second))?.member?.guild).toBe(guild);

    const before = (await rpc.getBalance(sponsor.address).send()).value;
    const joined = await fetchPetOnChain(rpc, second);
    await send(() => [getLeaveGuildInstruction({ owner, pet: second, member: place, guild, payer: joined!.member!.payer })]);
    expect((await fetchGuild(rpc, slug))?.memberCount).toBe(1);
    expect((await fetchPetOnChain(rpc, second))?.member).toBeNull();
    // The rent came back to the sponsor, which paid it, less the fee.
    expect((await rpc.getBalance(sponsor.address).send()).value).toBeGreaterThan(before);
    expect((await rpc.getBalance(owner.address).send()).value).toBe(0n);
  });

  it("keeps the pet's card in the owner's wallet, frozen, once", async () => {
    const onChain = await fetchPetOnChain(rpc, pet);
    const result = await sendPrepared({ rpc, owner, prepare: () => keepsakeTransaction(sponsor, onChain!) });
    expect(result).toMatchObject({ outcome: "confirmed", sponsored: true });

    const keepsake = await readKeepsake(pet);
    expect(keepsake?.made).toBe(true);
    const account = await fetchEncodedAccount(rpc, keepsake!.address);
    expect(account.exists && account.programAddress).toBe(MPL_CORE_PROGRAM_ID);
    // AssetV1: its key (1), then the owner.
    const data = account.exists ? account.data : new Uint8Array();
    expect(data[0]).toBe(1);
    expect(getAddressDecoder().decode(data.subarray(1, 33))).toBe(owner.address);
    expect((await rpc.getBalance(owner.address).send()).value).toBe(0n);

    // The card's address is taken: a second one fails at preflight, unpaid.
    const again = await sendPrepared({ rpc, owner, prepare: () => keepsakeTransaction(sponsor, onChain!) }).catch(
      (error: unknown) => error,
    );
    expect(again).toBeInstanceOf(Error);
  });
});
