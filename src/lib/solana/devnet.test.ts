// @vitest-environment node
import {
  createKeyPairSignerFromBytes,
  createNoopSigner,
  fetchEncodedAccount,
  generateKeyPairSigner,
  getAddressDecoder,
  type Instruction,
  type KeyPairSigner,
  type TransactionSigner,
} from "@solana/kit";
import { beforeAll, describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  fetchBallot,
  fetchCloset,
  fetchGuestbook,
  fetchGuild,
  fetchGuildEvents,
  fetchGuildPets,
  fetchGuildPolls,
  fetchPetOnChain,
  fetchPetRsvps,
  fetchPetsOnChain,
  fetchWallet,
  toCompanionRecord,
  wearableSlot,
} from "./accounts";
import {
  asDeviceInstruction,
  getAdoptPetInstruction,
  getBuyWithWalletInstruction,
  getCheckInInstruction,
  getCreateEventInstruction,
  getCreatePollInstruction,
  getDressOwnedInstruction,
  getRsvpInstruction,
  getVoteInstruction,
  getWaveInstruction,
  getCareInstruction,
  getCloseWalletInstruction,
  getDepositInstruction,
  getDressInstruction,
  getFinishRoundInstruction,
  getFoundGuildInstruction,
  getJoinGuildInstruction,
  getLeaveGuildInstruction,
  getLinkDeviceInstruction,
  getOpenWalletInstruction,
  getUnlinkDeviceInstruction,
  getWithdrawInstruction,
} from "./instructions";
import {
  deriveBallotPda,
  deriveClosetPda,
  deriveEventPda,
  deriveGuestbookPda,
  deriveGuildPda,
  deriveMemberPda,
  derivePassportPda,
  derivePetPda,
  derivePollPda,
  deriveRsvpPda,
  deriveWalletPda,
} from "./pda";
import { MARKET, WALLET_LIMITS } from "./program";
import { fetchWalletHistory } from "@/lib/wallet/history";
import { keepsakeTransaction, readKeepsake } from "@/server/keepsake";
import { MPL_CORE_PROGRAM_ID } from "./core";
import { createPatientRpc } from "./rpc";
import { sendPawket, sendPrepared } from "./send";
import { cosign } from "./sponsor";
import { extractProgramErrorCode } from "./transactions";
import { TEST_GUILD_NAME } from "@/lib/guilds/delisted";
import { assertSponsorHasRoom, sponsorKeypairJson } from "../../../e2e/devnet";

/**
 * The whole path on devnet, run by `pnpm e2e:devnet` and skipped otherwise:
 * a brand-new wallet with no SOL adopts, cares, plays and dresses through
 * the sponsor, and every number comes back from the chain. The sponsor key
 * is SPONSOR_KEYPAIR or .keys/sponsor.json, and the run refuses to start
 * while its float is too low to share with the live site (`e2e/devnet.ts`).
 */
const RUN = process.env.PAWKET_DEVNET === "1";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

describe.skipIf(!RUN)("Pawket on devnet", { timeout: 180_000 }, () => {
  // Patient: the public endpoint answers a burst of tests with 429s.
  const rpc = createPatientRpc(RPC_URL);
  let sponsor: KeyPairSigner;
  let owner: KeyPairSigner;
  let pet: Awaited<ReturnType<typeof derivePetPda>>["address"];
  let passport: typeof pet;
  /** The guild the test founds, for its events and polls further on. */
  let testGuild: typeof pet;
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
    await assertSponsorHasRoom();
    const raw = sponsorKeypairJson();
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
    // The last piece in the wardrobe: slot 18 only exists since the wardrobe grew.
    await send(() => [getDressInstruction({ owner, pet, wearing: wearableSlot("leaf-sprout") })]);

    const onChain = await fetchPetOnChain(rpc, pet);
    expect(onChain).not.toBeNull();
    const record = toCompanionRecord(onChain!);
    expect(record.xp).toBe(35);
    expect(record.stats.hunger).toBeGreaterThanOrEqual(94);
    expect(record.careLog.map((entry) => entry.action)).toEqual([CareActionType.Feed]);
    expect(record.streak.count).toBe(1);
    expect(record.plays).toBe(1);
    expect(record.wearing).toBe("leaf-sprout");
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
    testGuild = guild;
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
  it("links a browser for a wallet with no SOL, and the browser keeps, joins, waves and leaves with no owner signature", async () => {
    const device = await generateKeyPairSigner();
    const wallet = (await deriveWalletPda(owner.address)).address;
    // One approval: the sponsor pays the fee and the wallet's rent, nothing goes in, and the browser signs its link.
    const linked = await send(({ payer }) => [
      getOpenWalletInstruction({ owner, payer, wallet }),
      getLinkDeviceInstruction({ owner, wallet, device, expiresAt: Math.floor(Date.now() / 1000) + 3_600, dailyActions: 20 }),
    ]);
    expect(linked).toMatchObject({ outcome: "confirmed", sponsored: true });
    expect((await rpc.getBalance(device.address).send()).value).toBe(0n);

    // From here on only the browser signs: each action built as the owner's, sent as its twin, the sponsor paying.
    const forOwner = createNoopSigner(owner.address);
    const byDevice = (build: (payer: TransactionSigner) => Instruction[]) =>
      sendPawket({
        rpc,
        owner: device,
        sponsor: sponsor.address,
        instructions: ({ payer }) => build(payer).map((ix) => asDeviceInstruction(ix, { device, wallet })),
        cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
      });
    const third = (await derivePetPda(owner.address, `${name}3`)).address;
    const thirdPassport = (await derivePassportPda(third)).address;
    const place = (await deriveMemberPda(third)).address;
    const kept = await byDevice((payer) => [
      getAdoptPetInstruction({
        owner: forOwner,
        payer,
        pet: third,
        passport: thirdPassport,
        name: `${name}3`,
        species: PetSpecies.MossPup,
        personality: PetPersonality.Curious,
      }),
    ]);
    expect(kept).toMatchObject({ outcome: "confirmed", sponsored: true });
    expect((await fetchPetOnChain(rpc, third))?.pet.owner).toBe(owner.address);
    await byDevice((payer) => [getJoinGuildInstruction({ owner: forOwner, payer, pet: third, guild: testGuild, member: place })]);
    expect((await fetchPetOnChain(rpc, third))?.member?.guild).toBe(testGuild);

    // A neighbour's pet, adopted with no SOL of its own, to wave at.
    const neighbour = await generateKeyPairSigner();
    const theirs = (await derivePetPda(neighbour.address, "Pickle")).address;
    const theirPassport = (await derivePassportPda(theirs)).address;
    await sendPawket({
      rpc,
      owner: neighbour,
      sponsor: sponsor.address,
      instructions: ({ owner: signer, payer }) => [
        getAdoptPetInstruction({ owner: signer, payer, pet: theirs, passport: theirPassport, name: "Pickle", species: PetSpecies.LunaCat, personality: PetPersonality.Cozy }),
      ],
      cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
    });
    const guestbook = (await deriveGuestbookPda(theirs)).address;
    await byDevice((payer) => [getWaveInstruction({ visitor: forOwner, payer, pet: theirs, guestbook })]);
    expect((await fetchGuestbook(rpc, theirs))?.recent[0].visitor).toBe(owner.address);
    await byDevice(() => [getLeaveGuildInstruction({ owner: forOwner, pet: third, member: place, guild: testGuild, payer: sponsor.address })]);
    expect((await fetchPetOnChain(rpc, third))?.member).toBeNull();

    // Nobody but the browser signed, and neither the owner nor the browser paid a lamport.
    expect((await rpc.getBalance(owner.address).send()).value).toBe(0n);
    expect((await rpc.getBalance(device.address).send()).value).toBe(0n);
    expect((await fetchWallet(rpc, owner.address))?.actions).toBe(4);

    // The browser lets itself go; the wallet closes, its rent back to the sponsor that paid it.
    await sendPawket({
      rpc,
      owner: device,
      sponsor: sponsor.address,
      instructions: () => [getUnlinkDeviceInstruction({ authority: device, wallet, device, deviceSigns: true })],
      cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
    });
    await send(() => [getCloseWalletInstruction({ owner, wallet, rentPayer: sponsor.address })]);
    expect(await fetchWallet(rpc, owner.address)).toBeNull();

    const rent = await rpc.getMinimumBalanceForRentExemption(157n).send();
    const history = await fetchWalletHistory(rpc, wallet, { rent });
    expect(history.entries.map((entry) => entry.kinds.join("+"))).toEqual(["close", "unlink", "leave", "wave", "join", "adopt", "open+link"]);
    expect(history.entries[3]).toMatchObject({ pet: theirs, feePayer: sponsor.address, change: 0n });
  });

  it("opens a Pawket Wallet whose device cares with no owner signature, and every lamport comes back", async () => {
    // Last, since the owner holds SOL from here on. A player with a little of their own: the sponsor hands the owner some, as a faucet would.
    await sendPawket({
      rpc,
      owner: sponsor,
      sponsor: null,
      instructions: () => [getTransferSolInstruction({ source: sponsor, destination: owner.address, amount: 20_000_000n })],
    });
    const device = await generateKeyPairSigner();
    const wallet = (await deriveWalletPda(owner.address)).address;
    // One approval: open, fill and link — the sponsor pays the fee, the owner the rent and the deposit, the device signs.
    const opened = await send(() => [
      getOpenWalletInstruction({ owner, payer: owner, wallet }),
      getDepositInstruction({ owner, wallet, amount: 10_000_000n }),
      getLinkDeviceInstruction({ owner, wallet, device, expiresAt: Math.floor(Date.now() / 1000) + 3_600, dailyActions: 20 }),
    ]);
    expect(opened).toMatchObject({ outcome: "confirmed", sponsored: true });
    const linked = await fetchWallet(rpc, owner.address);
    expect(linked).toMatchObject({ owner: owner.address, device: device.address, dailyActions: 20, deposited: 10_000_000n });
    expect((await rpc.getBalance(device.address).send()).value).toBe(WALLET_LIMITS.deviceFloat);

    // The device rests the pet: nobody but the device signs, and the balance pays its fee.
    const before = linked!.lamports;
    const rested = await sendPawket({
      rpc,
      owner: device,
      sponsor: null,
      instructions: () => [asDeviceInstruction(getCareInstruction({ owner: owner.address, pet, passport, action: CareActionType.Rest }), { device, wallet })],
    });
    expect(rested.outcome).toBe("confirmed");
    const record = toCompanionRecord((await fetchPetOnChain(rpc, pet))!);
    expect(record.careLog.map((entry) => entry.action)).toEqual([CareActionType.Feed, CareActionType.Rest]);
    const after = (await fetchWallet(rpc, owner.address))!;
    expect(after.lamports).toBe(before - WALLET_LIMITS.feePerSignature);
    expect(after.actions).toBe(1);
    expect((await rpc.getBalance(device.address).send()).value).toBe(WALLET_LIMITS.deviceFloat);

    // Some back to the owner; the device lets itself go, paying its own fee, and its float comes home.
    await send(() => [getWithdrawInstruction({ owner, wallet, amount: 3_000_000n })]);
    await sendPawket({
      rpc,
      owner: device,
      sponsor: null,
      instructions: () => [getUnlinkDeviceInstruction({ authority: device, wallet, device, deviceSigns: true })],
    });
    expect((await rpc.getBalance(device.address).send()).value).toBe(0n);
    expect((await fetchWallet(rpc, owner.address))?.device).toBeNull();

    // Closing: the balance to the owner, the rent to the owner who paid it.
    const ownerBefore = (await rpc.getBalance(owner.address).send()).value;
    const closing = (await fetchWallet(rpc, owner.address))!;
    await send(() => [getCloseWalletInstruction({ owner, wallet, rentPayer: owner.address })]);
    expect(await fetchWallet(rpc, owner.address)).toBeNull();
    expect((await rpc.getBalance(owner.address).send()).value).toBe(ownerBefore + closing.lamports);

    // And the statement says all of it, newest first.
    const rent = await rpc.getMinimumBalanceForRentExemption(157n).send();
    const history = await fetchWalletHistory(rpc, wallet, { rent });
    // Newest first; this owner's earlier Pawket Wallet, at the same address, comes after.
    expect(history.entries.slice(0, 5).map((entry) => entry.kinds.join("+"))).toEqual(["close", "unlink", "withdraw", "care", "open+deposit+link"]);
    expect(history.entries[3]).toMatchObject({ action: CareActionType.Rest, pet, change: -WALLET_LIMITS.feePerSignature, feePayer: device.address });
    expect(history.entries[4]).toMatchObject({ amount: 10_000_000n, toDevice: WALLET_LIMITS.deviceFloat, change: 10_000_000n - WALLET_LIMITS.deviceFloat });
    expect(history.entries[2]).toMatchObject({ amount: 3_000_000n, change: -3_000_000n });
  });


  it("buys a Market piece into the treasury, wears it, and a visitor with no SOL waves", async () => {
    // A purchase is the player's own SOL: the sponsor hands the owner some, as a faucet would.
    await sendPawket({
      rpc,
      owner: sponsor,
      sponsor: null,
      instructions: () => [getTransferSolInstruction({ source: sponsor, destination: owner.address, amount: 60_000_000n })],
    });
    const closet = (await deriveClosetPda(owner.address)).address;
    const treasuryBefore = (await rpc.getBalance(MARKET.treasury as typeof pet).send()).value;
    const wallet = (await deriveWalletPda(owner.address)).address;
    const device = await generateKeyPairSigner();
    await send(({ payer }) => [getOpenWalletInstruction({ owner, payer, wallet }), getDepositInstruction({ owner, wallet, amount: 55_000_000n }), getLinkDeviceInstruction({ owner, wallet, device, expiresAt: Math.floor(Date.now() / 1000) + 86_400, dailyActions: 100 })]);
    const before = (await rpc.getBalance(owner.address).send()).value;
    const bought = await send(({ payer }) => [getBuyWithWalletInstruction({ owner, payer, closet, wallet, item: 19 })]);
    expect((await rpc.getBalance(owner.address).send()).value).toBe(before);
    expect((await fetchWalletHistory(rpc, wallet)).entries[0].kinds).toEqual(["purchase"]);
    expect(bought).toMatchObject({ outcome: "confirmed", sponsored: true });
    expect((await rpc.getBalance(MARKET.treasury as typeof pet).send()).value - treasuryBefore).toBe(MARKET.wearablePrice);
    expect((await fetchCloset(rpc, owner.address))?.items).toEqual([19]);

    await send(() => [getDressOwnedInstruction({ owner, pet, closet, wearing: 19 })]);
    expect(toCompanionRecord((await fetchPetOnChain(rpc, pet))!).wearing).toBe("halo");

    const visitor = await generateKeyPairSigner();
    const guestbook = (await deriveGuestbookPda(pet)).address;
    const waved = await sendPawket({
      rpc,
      owner: visitor,
      sponsor: sponsor.address,
      instructions: ({ owner: signer, payer }) => [getWaveInstruction({ visitor: signer, payer, pet, guestbook })],
      cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
    });
    expect(waved).toMatchObject({ outcome: "confirmed", sponsored: true });
    const book = await fetchGuestbook(rpc, pet);
    expect(book).toMatchObject({ pet, waves: 1 });
    expect(book?.recent[0].visitor).toBe(visitor.address);
    expect((await rpc.getBalance(visitor.address).send()).value).toBe(0n);
  });

  it("plans an event its pet checks in at, and asks a poll each wallet answers once", async () => {
    const now = Math.floor(Date.now() / 1000);
    const startsAt = now + 60;
    const event = (await deriveEventPda(testGuild, startsAt)).address;
    const member = (await deriveMemberPda(pet)).address;
    const rsvp = (await deriveRsvpPda(event, pet)).address;
    await send(({ payer }) => [
      getCreateEventInstruction({ owner, payer, guild: testGuild, event, id: startsAt, title: "Devnet nap", note: "Made by the devnet test.", startsAt, endsAt: now + 3_600 }),
      getRsvpInstruction({ owner, payer, pet, member, event, rsvp }),
    ]);
    // Check-in opens fifteen minutes before the start, so it is open already.
    await send(() => [getCheckInInstruction({ owner, pet, event, rsvp })]);
    const [planned] = await fetchGuildEvents(rpc, testGuild);
    expect(planned).toMatchObject({ title: "Devnet nap", going: 1, came: 1 });
    expect((await fetchPetRsvps(rpc, pet)).map((entry) => entry.came)).toEqual([true]);

    const poll = (await derivePollPda(testGuild, now)).address;
    const ballot = (await deriveBallotPda(poll, owner.address)).address;
    await send(({ payer }) => [
      getCreatePollInstruction({ owner, payer, guild: testGuild, poll, id: now, question: "Where next?", options: ["Window", "Rug"], closesAt: now + 3_600 }),
      getVoteInstruction({ owner, payer, pet, member, poll, ballot, option: 1 }),
    ]);
    const [asked] = await fetchGuildPolls(rpc, testGuild);
    expect(asked).toMatchObject({ question: "Where next?", options: ["Window", "Rug"], votes: [0, 1] });
    expect((await fetchBallot(rpc, poll, owner.address))?.option).toBe(1);
  });
});
