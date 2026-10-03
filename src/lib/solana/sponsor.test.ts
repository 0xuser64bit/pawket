// @vitest-environment node
import {
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
  getCareByDeviceInstruction,
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
import { checkSponsorable, cosign, createLimiter, SponsorRefusal } from "./sponsor";

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
    });
    expect(
      checkSponsorable(
        await built(() => [care(), getDressInstruction({ owner, pet: PET, wearing: 2 })]),
        sponsor.address,
      ),
    ).toEqual({ ok: true, kinds: ["care", "dress"] });
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

  it("refuses a priority fee, the one way to spend the float faster", async () => {
    const priority: Instruction = {
      programAddress: "ComputeBudget111111111111111111111111111111" as Instruction["programAddress"],
      accounts: [],
      data: new Uint8Array([3, 0, 202, 154, 59, 0, 0, 0, 0]),
    };
    expect(checkSponsorable(await built(() => [priority, care()]), sponsor.address)).toMatchObject({
      ok: false,
    });
  });

  it("pays the rent of a new guild and of a pet's place in one, and takes it back when the pet leaves", async () => {
    const found = (payer: TransactionSigner) =>
      getFoundGuildInstruction({ owner, payer, pet: PET, guild: GUILD, member: MEMBER, slug: "sunbeam-club", name: "Sunbeam Club", motto: "", crest: 0, colour: 0 });
    const join = (payer: TransactionSigner) => getJoinGuildInstruction({ owner, payer, pet: PET, guild: GUILD, member: MEMBER });
    expect(checkSponsorable(await built((payer) => [found(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["found"] });
    expect(checkSponsorable(await built((payer) => [join(payer)]), sponsor.address)).toEqual({ ok: true, kinds: ["join"] });
    const leave = await built((payer) => [getLeaveGuildInstruction({ owner, pet: PET, member: MEMBER, guild: GUILD, payer: payer.address })]);
    expect(checkSponsorable(leave, sponsor.address)).toEqual({ ok: true, kinds: ["leave"] });
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
    expect(checkSponsorable(tending, sponsor.address)).toEqual({ ok: true, kinds: ["open-wallet", "deposit", "link"] });
    const leaving = await built(() => [
      getWithdrawInstruction({ owner, wallet: WALLET, amount: 1n }),
      getUnlinkDeviceInstruction({ authority: owner, wallet: WALLET, device: DEVICE, deviceSigns: false }),
      getCloseWalletInstruction({ owner, wallet: WALLET, rentPayer: owner.address }),
    ]);
    expect(checkSponsorable(leaving, sponsor.address)).toEqual({ ok: true, kinds: ["withdraw", "unlink", "close-wallet"] });
  });

  it("never pays a wallet's rent, never takes its money, and never stands in for its device", async () => {
    // The owner pays a Pawket Wallet's rent; the sponsor as payer is refused.
    const rent = await built((payer) => [getOpenWalletInstruction({ owner, payer, wallet: WALLET })]);
    expect(checkSponsorable(rent, sponsor.address)).toMatchObject({ ok: false });
    // A withdrawal to the sponsor, or a close that hands it the rent, is a part it does not take.
    const asOwner = await built((payer) => [getWithdrawInstruction({ owner: payer, wallet: WALLET, amount: 1n })]);
    expect(checkSponsorable(asOwner, sponsor.address)).toMatchObject({ ok: false });
    const asRentPayer = await built((payer) => [getCloseWalletInstruction({ owner, wallet: WALLET, rentPayer: payer.address })]);
    expect(checkSponsorable(asRentPayer, sponsor.address)).toMatchObject({ ok: false });
    const asDevice = await built((payer) => [getLinkDeviceInstruction({ owner, wallet: WALLET, device: payer, expiresAt: 1, dailyActions: 1 })]);
    expect(checkSponsorable(asDevice, sponsor.address)).toMatchObject({ ok: false });
  });

  it("never signs for an action a linked device takes: a device pays its own way", async () => {
    const device = createNoopSigner(DEVICE as KeyPairSigner["address"]);
    const byDevice = await built(() => [
      getCareByDeviceInstruction({ device, wallet: WALLET, pet: PET, passport: PASSPORT, action: CareActionType.Feed }),
    ]);
    expect(checkSponsorable(byDevice, sponsor.address)).toEqual({
      ok: false,
      reason: "A linked device pays its own fees, from your Pawket Wallet.",
    });
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
