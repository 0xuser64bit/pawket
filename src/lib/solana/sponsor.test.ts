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
import { getAdoptPetInstruction, getCareInstruction, getDressInstruction } from "./instructions";
import { checkSponsorable, cosign, createLimiter, SponsorRefusal } from "./sponsor";

const LIFETIME = {
  blockhash: "11111111111111111111111111111111" as Blockhash,
  lastValidBlockHeight: 100n,
};
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const PASSPORT = "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm";

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
