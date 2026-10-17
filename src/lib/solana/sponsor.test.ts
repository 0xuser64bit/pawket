// @vitest-environment node
import {
  AccountRole,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
  type Instruction,
  type KeyPairSigner,
  type TransactionSigner,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { beforeAll, describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import {
  getAdoptPetInstruction,
  getBuyInstruction,
  getBuyWithWalletInstruction,
  getWalletSpendInstruction,
  getCheckInInstruction,
  getCreateEventInstruction,
  getCreatePollInstruction,
  asDeviceInstruction,
  getDressOwnedInstruction,
  getRsvpInstruction,
  getVoteInstruction,
  getWaveInstruction,
  getCareInstruction,
  getCloseWalletInstruction,
  getDepositInstruction,
  getDressInstruction,
  getFoundGuildInstruction,
  getJoinGuildInstruction,
  getLeaveGuildInstruction,
  getLinkDeviceInstruction,
  getOpenWalletInstruction,
  getUnlinkDeviceInstruction,
  getWithdrawInstruction,
} from "./instructions";
import idl from "./idl/pawket.json";
import { checkSponsorable, cosign, createLimiter, KIND_OF, SPONSOR_SLOTS, SponsorRefusal } from "./sponsor";

const LIFETIME = {
  blockhash: "11111111111111111111111111111111" as Blockhash,
  lastValidBlockHeight: 100n,
};
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const PASSPORT = "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm";
const GUILD = "8Vp2LsXSrgjxbNsmWg5pTGsEk3ag8x1wGkzvWbJ4b3Zt";
const MEMBER = "4fQfsGgDvo3AgpfTDwL3eXLc3WNeTVpZ1b8fwW7cHRnD";
const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const DEVICE = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

let sponsor: KeyPairSigner;
let owner: KeyPairSigner;

beforeAll(async () => {
  sponsor = await generateKeyPairSigner();
  owner = await generateKeyPairSigner();
});

/** What the browser builds and sends the sponsor: compiled, signed by nobody yet. */
async function built(
  instructions: (payer: TransactionSigner) => Instruction[],
  feePayer: TransactionSigner = createNoopSigner(sponsor.address),
) {
  const message = pipe(
    createTransactionMessage({ version: "legacy" }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
    (m) => appendTransactionMessageInstructions(instructions(feePayer), m),
  );
  return compileTransaction(message);
}

const adopt = (payer: TransactionSigner, who: TransactionSigner = owner) =>
  getAdoptPetInstruction({
    owner: who,
    payer,
    pet: PET,
    passport: PASSPORT,
    name: "Pepper",
    species: PetSpecies.LunaCat,
    personality: PetPersonality.Cozy,
  });
const care = (who: TransactionSigner = owner) =>
  getCareInstruction({ owner: who, pet: PET, passport: PASSPORT, action: CareActionType.Feed });

describe("checkSponsorable", () => {
  it("signs an adoption it pays the rent for, and care", async () => {
    expect(checkSponsorable(await built((payer) => [adopt(payer)]), sponsor.address)).toEqual({
      ok: true,
      kinds: ["adopt"],
      rent: 1,
    });
    expect(
      checkSponsorable(
        await built(() => [care(), getDressInstruction({ owner, pet: PET, wearing: 2 })]),
        sponsor.address,
      ),
    ).toEqual({ ok: true, kinds: ["care", "dress"], rent: 0 });
  });

  it("refuses to be anything but the fee payer", async () => {
    const ownerPays = await built((payer) => [adopt(payer)], owner);
    expect(checkSponsorable(ownerPays, sponsor.address)).toMatchObject({ ok: false });
  });

  it("refuses a transfer out of its own float", async () => {
    const theft = await built((payer) => [
      getTransferSolInstruction({ source: payer, destination: owner.address, amount: 1_000_000_000n }),
    ]);
    expect(checkSponsorable(theft, sponsor.address)).toEqual({
      ok: false,
      reason: "Only Pawket instructions are sponsored.",
    });
  });

  it("refuses another program wearing a Pawket discriminator", async () => {
    const impostor = {
      ...care(),
      programAddress: "Stake11111111111111111111111111111111111111" as Instruction["programAddress"],
    };
    expect(checkSponsorable(await built(() => [care(), impostor]), sponsor.address)).toEqual({
      ok: false,
      reason: "Only Pawket instructions are sponsored.",
    });
  });

  it("refuses to sign as the owner of a pet", async () => {
    const asOwner = await built((payer) => [care(payer)]);
    expect(checkSponsorable(asOwner, sponsor.address)).toEqual({
      ok: false,
      reason: "The sponsor only pays; it takes no other part.",
    });
    const asAdopter = await built((payer) => [adopt(payer, payer)]);
    expect(checkSponsorable(asAdopter, sponsor.address)).toMatchObject({ ok: false });
  });

  it("refuses a priority fee, one way to spend the float faster", async () => {
    const priority: Instruction = {
      programAddress: "ComputeBudget111111111111111111111111111111" as Instruction["programAddress"],
      accounts: [],
      data: new Uint8Array([3, 0, 202, 154, 59, 0, 0, 0, 0]),
    };
    expect(checkSponsorable(await built(() => [priority, care()]), sponsor.address)).toMatchObject({
      ok: false,
    });
  });

  it("refuses more signatures than a Pawket transaction needs, the other way: each is a fee it pays", async () => {
    // Anchor takes extra accounts without a word, so a care can carry signers it never reads.
    const extra = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const ix = care();
    const padded = { ...ix, accounts: [...(ix.accounts ?? []), ...extra.map(({ address }) => ({ address, role: AccountRole.READONLY_SIGNER }))] };
    expect(checkSponsorable(await built(() => [padded]), sponsor.address)).toMatchObject({ ok: false });
    // Linking a device is the most any asks: the sponsor, the owner and the device.
    const link = await built(() => [getLinkDeviceInstruction({ owner, wallet: WALLET, device: DEVICE, expiresAt: 1_790_848_800, dailyActions: 200 })]);
    expect(checkSponsorable(link, sponsor.address)).toEqual({ ok: true, kinds: ["link"], rent: 0 });
  });

  it("pays the rent of a new guild and of a pet's place in one, and takes it back when the pet leaves", async () => {
    const found = (payer: TransactionSigner) =>
      getFoundGuildInstruction({ owner, payer, pet: PET, guild: GUILD, member: MEMBER, slug: "sunbeam-club", name: "Sunbeam Club", motto: "", crest: 0, colour: 0 });
    const join = (payer: TransactionSigner) => getJoinGuildInstruction({ owner, payer, pet: PET, guild: GUILD, member: MEMBER });
    expect(checkSponsorable(await built((payer) => [found(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["found"], rent: 1 });
    expect(checkSponsorable(await built((payer) => [join(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["join"], rent: 1 });
    const leave = await built((payer) => [getLeaveGuildInstruction({ owner, pet: PET, member: MEMBER, guild: GUILD, payer: payer.address })]);
    expect(checkSponsorable(leave, sponsor.address)).toEqual({ ok: true, kinds: ["leave"], rent: 0 });
  });

  it("refuses to stand in for a guild's founder, a member, or its pet", async () => {
    const asFounder = await built((payer) => [
      getFoundGuildInstruction({ owner: payer, payer, pet: PET, guild: GUILD, member: MEMBER, slug: "sunbeam-club", name: "Sunbeam Club", motto: "", crest: 0, colour: 0 }),
    ]);
    expect(checkSponsorable(asFounder, sponsor.address)).toMatchObject({ ok: false });
    const asMember = await built((payer) => [getJoinGuildInstruction({ owner, payer, pet: payer.address, guild: GUILD, member: MEMBER })]);
    expect(checkSponsorable(asMember, sponsor.address)).toMatchObject({ ok: false });
    const asLeaver = await built((payer) => [getLeaveGuildInstruction({ owner: payer, pet: PET, member: MEMBER, guild: GUILD, payer: payer.address })]);
    expect(checkSponsorable(asLeaver, sponsor.address)).toMatchObject({ ok: false });
  });

  it("pays the fee for looking after a Pawket Wallet, and takes no part in it", async () => {
    const tending = await built(() => [
      getOpenWalletInstruction({ owner, wallet: WALLET }),
      getDepositInstruction({ owner, wallet: WALLET, amount: 50_000_000n }),
      getLinkDeviceInstruction({ owner, wallet: WALLET, device: DEVICE, expiresAt: 1_790_848_800, dailyActions: 200 }),
    ]);
    expect(checkSponsorable(tending, sponsor.address)).toEqual({ ok: true, kinds: ["open-wallet", "deposit", "link"], rent: 0 });
    const leaving = await built(() => [
      getWithdrawInstruction({ owner, wallet: WALLET, amount: 1n }),
      getUnlinkDeviceInstruction({ authority: owner, wallet: WALLET, device: DEVICE, deviceSigns: false }),
      getCloseWalletInstruction({ owner, wallet: WALLET, rentPayer: owner.address }),
    ]);
    expect(checkSponsorable(leaving, sponsor.address)).toEqual({ ok: true, kinds: ["withdraw", "unlink", "close-wallet"], rent: 0 });
  });

  it("pays a wallet's rent, never takes its money, and never stands in for its device", async () => {
    // The rent comes back to the sponsor when the wallet closes (`close = rent_payer`).
    const rent = await built((payer) => [getOpenWalletInstruction({ owner, payer, wallet: WALLET })]);
    expect(checkSponsorable(rent, sponsor.address)).toEqual({ ok: true, kinds: ["open-wallet"], rent: 1 });
    // Closing hands the sponsor back the rent it paid (the program holds it to `rent_payer`).
    const asRentPayer = await built((payer) => [getCloseWalletInstruction({ owner, wallet: WALLET, rentPayer: payer.address })]);
    expect(checkSponsorable(asRentPayer, sponsor.address)).toEqual({ ok: true, kinds: ["close-wallet"], rent: 0 });
    // A withdrawal to the sponsor, or the sponsor as the wallet's owner, is a part it does not take.
    const asOwner = await built((payer) => [getWithdrawInstruction({ owner: payer, wallet: WALLET, amount: 1n })]);
    expect(checkSponsorable(asOwner, sponsor.address)).toMatchObject({ ok: false });
    const closesAsOwner = await built((payer) => [getCloseWalletInstruction({ owner: payer, wallet: WALLET, rentPayer: payer.address })]);
    expect(checkSponsorable(closesAsOwner, sponsor.address)).toMatchObject({ ok: false });
    const asDevice = await built((payer) => [getLinkDeviceInstruction({ owner, wallet: WALLET, device: payer, expiresAt: 1, dailyActions: 1 })]);
    expect(checkSponsorable(asDevice, sponsor.address)).toMatchObject({ ok: false });
  });

  it("pays for a linked device's action as for its owner's, one account later, and stands in for no device", async () => {
    const device = createNoopSigner(DEVICE as KeyPairSigner["address"]);
    const linked = { device, wallet: WALLET };
    const byDevice = await built((payer) => [
      asDeviceInstruction(getCareInstruction({ owner: owner.address, pet: PET, passport: PASSPORT, action: CareActionType.Feed }), linked),
      asDeviceInstruction(getJoinGuildInstruction({ owner: owner.address, payer, pet: PET, guild: GUILD, member: MEMBER }), linked),
    ]);
    expect(checkSponsorable(byDevice, sponsor.address)).toEqual({ ok: true, kinds: ["care", "join"], rent: 1 });
    const twoRents = await built((payer) => [
      asDeviceInstruction(getJoinGuildInstruction({ owner: owner.address, payer, pet: PET, guild: GUILD, member: MEMBER }), linked),
      asDeviceInstruction(getWaveInstruction({ visitor: owner.address, payer, pet: PET, guestbook: WALLET }), linked),
    ]);
    expect(checkSponsorable(twoRents, sponsor.address)).toEqual({ ok: false, reason: expect.stringMatching(/one new account's rent a transaction/) });
    const leave = await built((payer) => [
      asDeviceInstruction(getLeaveGuildInstruction({ owner: owner.address, pet: PET, member: MEMBER, guild: GUILD, payer: payer.address }), linked),
    ]);
    expect(checkSponsorable(leave, sponsor.address)).toEqual({ ok: true, kinds: ["leave"], rent: 0 });
    // The sponsor as the device, or as the owner's wallet account, is a part it does not take.
    const asTheDevice = await built((payer) => [
      asDeviceInstruction(getCareInstruction({ owner: owner.address, pet: PET, passport: PASSPORT, action: CareActionType.Feed }), { device: payer, wallet: WALLET }),
    ]);
    expect(checkSponsorable(asTheDevice, sponsor.address)).toMatchObject({ ok: false });
    const asTheWallet = await built((payer) => [
      asDeviceInstruction(getCareInstruction({ owner: owner.address, pet: PET, passport: PASSPORT, action: CareActionType.Feed }), { device, wallet: payer.address }),
    ]);
    expect(checkSponsorable(asTheWallet, sponsor.address)).toMatchObject({ ok: false });
  });

  it("knows no device twin for money: a sale cannot be signed by a device", () => {
    const sale = getBuyInstruction({ owner, closet: WALLET, item: 19 });
    expect(() => asDeviceInstruction(sale, { device: DEVICE, wallet: WALLET })).toThrow(/cannot sign/);
    const deposit = getDepositInstruction({ owner, wallet: WALLET, amount: 1n });
    expect(() => asDeviceInstruction(deposit, { device: DEVICE, wallet: WALLET })).toThrow(/cannot sign/);
  });

  it("pays the fee and the closet's rent for a purchase, never its price, and the fee to wear what was bought", async () => {
    const CLOSET = "7preVB3hcxXBLoAxefPgUfB9Hd62GsLkN9PTqG763MVc";
    const buy = await built((payer) => [getBuyWithWalletInstruction({ owner, payer, closet: CLOSET, wallet: WALLET, item: 19 })]);
    expect(checkSponsorable(buy, sponsor.address)).toEqual({ ok: true, kinds: ["buy"], rent: 1 });
    const asWallet = await built((payer) => [getBuyWithWalletInstruction({ owner, payer, closet: CLOSET, wallet: payer.address, item: 19 })]);
    expect(checkSponsorable(asWallet, sponsor.address)).toMatchObject({ ok: false });
    const coin = await built(() => [getWalletSpendInstruction({ owner, wallet: WALLET, device: DEVICE, amount: 1n, keep: 10n })]);
    expect(checkSponsorable(coin, sponsor.address)).toMatchObject({ ok: false });
    // The sponsor as the buyer would be paying the price: a part it does not take.
    const asBuyer = await built((payer) => [getBuyInstruction({ owner: payer, payer, closet: CLOSET, item: 19 })]);
    expect(checkSponsorable(asBuyer, sponsor.address)).toMatchObject({ ok: false });
    const wear = await built(() => [getDressOwnedInstruction({ owner, pet: PET, closet: CLOSET, wearing: 19 })]);
    expect(checkSponsorable(wear, sponsor.address)).toEqual({ ok: true, kinds: ["dress-owned"], rent: 0 });
    const device = createNoopSigner(DEVICE as KeyPairSigner["address"]);
    const byDevice = await built(() => [
      asDeviceInstruction(getDressOwnedInstruction({ owner: owner.address, pet: PET, closet: CLOSET, wearing: 19 }), { device, wallet: WALLET }),
    ]);
    expect(checkSponsorable(byDevice, sponsor.address)).toEqual({ ok: true, kinds: ["dress-owned"], rent: 0 });
  });

  it("pays the rent of a guild's events, RSVPs, polls and ballots, and of a guestbook, and stands in for nobody", async () => {
    const EVENT = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
    const event = (payer: TransactionSigner, who: TransactionSigner = owner) =>
      getCreateEventInstruction({ owner: who, payer, guild: GUILD, event: EVENT, id: 1, title: "Sunday nap", note: "", startsAt: 1, endsAt: 2 });
    const rsvp = (payer: TransactionSigner) => getRsvpInstruction({ owner, payer, pet: PET, member: MEMBER, event: EVENT, rsvp: WALLET });
    const poll = (payer: TransactionSigner) =>
      getCreatePollInstruction({ owner, payer, guild: GUILD, poll: EVENT, id: 1, question: "Which rug?", options: ["Red", "Blue"], closesAt: 9 });
    const vote = (payer: TransactionSigner, who: TransactionSigner = owner) =>
      getVoteInstruction({ owner: who, payer, pet: PET, member: MEMBER, poll: EVENT, ballot: WALLET, option: 1 });
    const wave = (payer: TransactionSigner, who: TransactionSigner = owner) => getWaveInstruction({ visitor: who, payer, pet: PET, guestbook: WALLET });
    // Each rent alone; never four in one transaction for the price of one limit.
    for (const [one, kind] of [[event, "event"], [rsvp, "rsvp"], [poll, "poll"], [vote, "vote"]] as const) {
      expect(checkSponsorable(await built((payer) => [one(payer)]), sponsor.address)).toEqual({ ok: true, kinds: [kind], rent: 1 });
    }
    const four = await built((payer) => [event(payer), rsvp(payer), poll(payer), vote(payer)]);
    expect(checkSponsorable(four, sponsor.address)).toEqual({ ok: false, reason: expect.stringMatching(/one new account's rent a transaction/) });
    const checkIn = await built(() => [getCheckInInstruction({ owner, pet: PET, event: EVENT, rsvp: WALLET }), getWaveInstruction({ visitor: owner, payer: owner, pet: PET, guestbook: WALLET })]);
    expect(checkSponsorable(checkIn, sponsor.address)).toEqual({ ok: true, kinds: ["check-in", "wave"], rent: 0 });
    expect(checkSponsorable(await built((payer) => [wave(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["wave"], rent: 1 });
    for (const asSomeone of [(p: TransactionSigner) => event(p, p), (p: TransactionSigner) => vote(p, p), (p: TransactionSigner) => wave(p, p)]) {
      expect(checkSponsorable(await built((payer) => [asSomeone(payer)]), sponsor.address)).toMatchObject({ ok: false });
    }
  });

  it("stands exactly where the program names a payer, in every instruction and so in every twin", () => {
    // A twin's accounts are its owner instruction's, one later (`program.test.ts`), so the owner's names decide.
    for (const [name, kind] of Object.entries(KIND_OF)) {
      const ix = idl.instructions.find((each) => each.name === name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`));
      const payers = (ix?.accounts ?? []).flatMap((account, i) => (account.name === "payer" || account.name === "rent_payer" ? [i] : []));
      expect(ix, name).toBeDefined();
      expect(SPONSOR_SLOTS[kind], name).toEqual(payers);
    }
  });

  it("refuses an instruction it does not know, even on the Pawket program", async () => {
    const odd = { ...care(), data: new Uint8Array(9) };
    expect(checkSponsorable(await built(() => [odd]), sponsor.address)).toEqual({
      ok: false,
      reason: "That is not a Pawket instruction.",
    });
  });
});

describe("cosign", () => {
  it("signs first, as fee payer, and leaves the player's slot for the wallet", async () => {
    const wire = getBase64EncodedWireTransaction(await built((payer) => [adopt(payer)]));
    const result = await cosign(sponsor, wire);
    expect(result.kinds).toEqual(["adopt"]);
    const signed = getTransactionDecoder().decode(getBase64Encoder().encode(result.transaction));
    expect(signed.signatures[sponsor.address]).toBeTruthy();
    expect(signed.signatures[owner.address]).toBeNull();
    // The message is exactly the one that was built: the client checks this too.
    expect(Array.from(signed.messageBytes)).toEqual(
      Array.from(getTransactionDecoder().decode(getBase64Encoder().encode(wire)).messageBytes),
    );
  });

  it("signs nothing it refuses, and says why", async () => {
    const wire = getBase64EncodedWireTransaction(await built((payer) => [care(payer)]));
    const refusal = await cosign(sponsor, wire).catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(SponsorRefusal);
    expect((refusal as SponsorRefusal).status).toBe(403);
    await expect(cosign(sponsor, "not base64!")).rejects.toMatchObject({ status: 400 });
  });

  it("stops when the limiter says so", async () => {
    const wire = getBase64EncodedWireTransaction(await built(() => [care()]));
    await expect(cosign(sponsor, wire, () => false)).rejects.toMatchObject({ status: 429 });
  });
});

describe("createLimiter", () => {
  it("allows a number per window, per key", () => {
    const allow = createLimiter(2, 1000);
    expect([allow("a", 0), allow("a", 10), allow("a", 20), allow("b", 20)]).toEqual([true, true, false, true]);
    expect(allow("a", 1011)).toBe(true);
  });
});
