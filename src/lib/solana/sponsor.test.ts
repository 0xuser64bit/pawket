// @vitest-environment node
import {
  AccountRole,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  createNoopSigner,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessagePriorityFeeLamports,
  type Blockhash,
  type Instruction,
  type KeyPairSigner,
  type TransactionSigner,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { beforeAll, describe, expect, it, vi } from "vitest";
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
    const strangerPays = await built(() => [care()], createNoopSigner((await generateKeyPairSigner()).address));
    expect(checkSponsorable(strangerPays, sponsor.address)).toEqual({ ok: false, reason: "The sponsor must be the fee payer." });
  });

  it("refuses a v1 transaction, whose header can ask a priority fee without an instruction", async () => {
    const v1 = compileTransaction(pipe(
      createTransactionMessage({ version: 1 }),
      (m) => setTransactionMessageFeePayerSigner(createNoopSigner(sponsor.address), m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
      (m) => setTransactionMessagePriorityFeeLamports(1_000_000n, m),
      (m) => appendTransactionMessageInstructions([care()], m),
    ));
    expect(checkSponsorable(v1, sponsor.address)).toEqual({ ok: false, reason: "Only legacy and v0 transactions are sponsored." });
  });

  it("refuses what is not a transaction, and a version it does not know", () => {
    for (const messageBytes of [Uint8Array.of(1, 2, 3), Uint8Array.of(0x81, 1, 0, 0)]) {
      expect(checkSponsorable({ messageBytes, signatures: {} } as unknown as Parameters<typeof checkSponsorable>[0], sponsor.address)).toEqual({
        ok: false,
        reason: "That is not a transaction.",
      });
    }
  });

  it("signs a v0 transaction, but none that reads its accounts from a lookup table it cannot see", async () => {
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(createNoopSigner(sponsor.address), m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(LIFETIME, m),
      (m) => appendTransactionMessageInstructions([care()], m),
    );
    expect(checkSponsorable(compileTransaction(message), sponsor.address)).toEqual({ ok: true, kinds: ["care"], rent: 0 });
    const table = address("AddressLookupTab1e1111111111111111111111111");
    const looked = compileTransaction(compressTransactionMessageUsingAddressLookupTables(message, { [table]: [address(PASSPORT)] }));
    expect(checkSponsorable(looked, sponsor.address)).toEqual({ ok: false, reason: "Lookup tables are not sponsored." });
  });

  it("signs one to four instructions, never none and never five", async () => {
    const between = /^Between 1 and 4 instructions are sponsored\.$/;
    expect(checkSponsorable(await built(() => []), sponsor.address)).toEqual({ ok: false, reason: expect.stringMatching(between) });
    expect(checkSponsorable(await built(() => Array.from({ length: 4 }, () => care())), sponsor.address)).toMatchObject({ ok: true, kinds: ["care", "care", "care", "care"] });
    expect(checkSponsorable(await built(() => Array.from({ length: 5 }, () => care())), sponsor.address)).toEqual({ ok: false, reason: expect.stringMatching(between) });
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
    const extra = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const ix = care();
    const padded = { ...ix, accounts: [...(ix.accounts ?? []), ...extra.map(({ address }) => ({ address, role: AccountRole.READONLY_SIGNER }))] };
    expect(checkSponsorable(await built(() => [padded]), sponsor.address)).toEqual({ ok: false, reason: "At most 3 signatures are sponsored." });
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
    const rent = await built((payer) => [getOpenWalletInstruction({ owner, payer, wallet: WALLET })]);
    expect(checkSponsorable(rent, sponsor.address)).toEqual({ ok: true, kinds: ["open-wallet"], rent: 1 });
    const asRentPayer = await built((payer) => [getCloseWalletInstruction({ owner, wallet: WALLET, rentPayer: payer.address })]);
    expect(checkSponsorable(asRentPayer, sponsor.address)).toEqual({ ok: true, kinds: ["close-wallet"], rent: 0 });
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
    for (const amount of [1n, undefined]) {
      const coin = await built(() => [getWalletSpendInstruction({ owner, wallet: WALLET, device: DEVICE, amount, keep: 10n })]);
      expect(checkSponsorable(coin, sponsor.address)).toEqual({ ok: false, reason: "Coin spending is never sponsored." });
    }
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
      getCreateEventInstruction({ owner: who, payer, guild: GUILD, event: EVENT, founderMember: MEMBER, id: 1, title: "Sunday nap", note: "", startsAt: 1, endsAt: 2 });
    const rsvp = (payer: TransactionSigner) => getRsvpInstruction({ owner, payer, pet: PET, member: MEMBER, event: EVENT, rsvp: WALLET });
    const poll = (payer: TransactionSigner) =>
      getCreatePollInstruction({ owner, payer, guild: GUILD, poll: EVENT, founderMember: MEMBER, id: 1, question: "Which rug?", options: ["Red", "Blue"], closesAt: 9 });
    const vote = (payer: TransactionSigner, who: TransactionSigner = owner) =>
      getVoteInstruction({ owner: who, payer, pet: PET, member: MEMBER, poll: EVENT, ballot: WALLET, option: 1 });
    const wave = (payer: TransactionSigner, who: TransactionSigner = owner) => getWaveInstruction({ visitor: who, payer, pet: PET, guestbook: WALLET });
    for (const [one, kind] of [[event, "event"], [rsvp, "rsvp"], [poll, "poll"], [vote, "vote"]] as const) {
      expect(checkSponsorable(await built((payer) => [one(payer)]), sponsor.address)).toEqual({ ok: true, kinds: [kind], rent: 1 });
    }
    const four = await built((payer) => [event(payer), rsvp(payer), poll(payer), vote(payer)]);
    expect(checkSponsorable(four, sponsor.address)).toEqual({ ok: false, reason: expect.stringMatching(/one new account's rent a transaction/) });
    const checkIn = await built(() => [getCheckInInstruction({ owner, pet: PET, event: EVENT, rsvp: WALLET, member: MEMBER }), getWaveInstruction({ visitor: owner, payer: owner, pet: PET, guestbook: WALLET })]);
    expect(checkSponsorable(checkIn, sponsor.address)).toEqual({ ok: true, kinds: ["check-in", "wave"], rent: 0 });
    expect(checkSponsorable(await built((payer) => [wave(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["wave"], rent: 1 });
    for (const asSomeone of [(p: TransactionSigner) => event(p, p), (p: TransactionSigner) => vote(p, p), (p: TransactionSigner) => wave(p, p)]) {
      expect(checkSponsorable(await built((payer) => [asSomeone(payer)]), sponsor.address)).toMatchObject({ ok: false });
    }
  });

  it("stands exactly where the program names a payer, in every instruction and so in every twin", () => {
    for (const [name, kind] of Object.entries(KIND_OF)) {
      const ix = idl.instructions.find((each) => each.name === name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`));
      const payers = (ix?.accounts ?? []).flatMap((account, i) => (account.name === "payer" || account.name === "rent_payer" ? [i] : []));
      expect(ix, name).toBeDefined();
      expect(SPONSOR_SLOTS[kind], name).toEqual(payers);
    }
  });

  it("refuses an instruction it does not know, even on the Pawket program", async () => {
    const odd = { ...care(), data: new Uint8Array(9) };
    const bare = { programAddress: care().programAddress };
    for (const unknown of [odd, bare]) {
      expect(checkSponsorable(await built(() => [unknown]), sponsor.address)).toEqual({
        ok: false,
        reason: "That is not a Pawket instruction.",
      });
    }
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
    expect(Array.from(signed.messageBytes)).toEqual(
      Array.from(getTransactionDecoder().decode(getBase64Encoder().encode(wire)).messageBytes),
    );
  });

  it("signs nothing it refuses, and says why", async () => {
    const wire = getBase64EncodedWireTransaction(await built((payer) => [care(payer)]));
    const refusal = await cosign(sponsor, wire).catch((error: unknown) => error);
    expect(refusal).toBeInstanceOf(SponsorRefusal);
    expect(refusal).toMatchObject({ name: "SponsorRefusal", status: 403, message: "The sponsor only pays; it takes no other part." });
    await expect(cosign(sponsor, "not base64!")).rejects.toMatchObject({ name: "SponsorRefusal", status: 400, message: "That is not a transaction." });
  });

  it("stops when the limiter says so, and hands it what it would pay for", async () => {
    const wire = getBase64EncodedWireTransaction(await built((payer) => [adopt(payer)]));
    const limit = vi.fn(() => false);
    await expect(cosign(sponsor, wire, limit)).rejects.toMatchObject({ status: 429, message: "Too many in a row. Nothing was sent — try again in a while." });
    expect(limit).toHaveBeenCalledWith({ ok: true, kinds: ["adopt"], rent: 1 });
  });
});

describe("createLimiter", () => {
  it("allows a number per window, per key", () => {
    const allow = createLimiter(2, 1000);
    expect([allow("a", 0), allow("a", 10), allow("a", 20), allow("b", 20)]).toEqual([true, true, false, true]);
    expect(allow("a", 1011)).toBe(true);
  });

  it("forgets a hit exactly one window later, and never counts a refused one", () => {
    const allow = createLimiter(1, 1000);
    expect([allow("a", 5000), allow("a", 5999), allow("a", 6000), allow("a", 6999)]).toEqual([true, false, true, false]);
  });

  it("remembers the 10,000 callers heard from most recently, a refused one included", () => {
    const allow = createLimiter(1, 1000);
    expect([allow("busy", 0), allow("quiet", 0), allow("busy", 1)]).toEqual([true, true, false]);
    for (let i = 0; i < 9_998; i++) allow(`caller-${i}`, 2);
    // 10,000 callers. Refused again, the busy one is now the latest heard from.
    expect(allow("busy", 3)).toBe(false);
    // One more forgets the caller heard from longest ago, and only that one.
    allow("one-more", 4);
    expect(allow("busy", 5)).toBe(false);
    expect(allow("caller-1", 5)).toBe(false);
    expect(allow("quiet", 6)).toBe(true);
  });

  it("never forgets a caller that keeps calling, however many others pass through", () => {
    const allow = createLimiter(1, 1000);
    allow("busy", 0);
    for (let i = 0; i < 30_000; i++) {
      allow(`caller-${i}`, 1);
      if (i % 5_000 === 0) expect(allow("busy", 1)).toBe(false);
    }
  });
});
