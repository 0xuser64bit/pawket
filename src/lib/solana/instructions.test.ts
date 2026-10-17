import { AccountRole, createNoopSigner, address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import {
  encodeAnchorString,
  getAdoptPetInstruction,
  getCareInstruction,
  getDressInstruction,
  getFinishRoundInstruction,
  getReturnFloatInstruction,
} from "./instructions";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID, WEARABLE_COUNT } from "./program";
import { deriveWalletPda } from "./pda";

const OWNER = "11111111111111111111111111111111";
const SPONSOR = "SysvarRent111111111111111111111111111111111";
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const PASSPORT = "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

const addresses = (ix: { accounts?: readonly { address: string }[] }) =>
  (ix.accounts ?? []).map((a) => String(a.address));
const roles = (ix: { accounts?: readonly { role: AccountRole }[] }) =>
  (ix.accounts ?? []).map((a) => a.role);

describe("encodeAnchorString", () => {
  it("prefixes UTF-8 bytes with a u32 LE length", () => {
    expect(Array.from(encodeAnchorString("Nova"))).toEqual([
      4, 0, 0, 0, 78, 111, 118, 97,
    ]);
  });
});

describe("getAdoptPetInstruction", () => {
  const ix = getAdoptPetInstruction({
    owner: OWNER,
    payer: SPONSOR,
    pet: PET,
    passport: PASSPORT,
    name: "Nova",
    species: PetSpecies.MossPup,
    personality: PetPersonality.Brave,
  });

  it("targets the Pawket program", () => {
    expect(String(ix.programAddress)).toBe(PAWKET_PROGRAM_ID);
  });

  it("orders accounts owner → payer → pet → passport → system with exact roles", () => {
    expect(addresses(ix)).toEqual([OWNER, SPONSOR, PET, PASSPORT, SYSTEM_PROGRAM]);
    expect(roles(ix)).toEqual([
      AccountRole.READONLY_SIGNER,
      AccountRole.WRITABLE_SIGNER,
      AccountRole.WRITABLE,
      AccountRole.WRITABLE,
      AccountRole.READONLY,
    ]);
  });

  it("makes the owner the payer when no sponsor is named", () => {
    const own = getAdoptPetInstruction({
      owner: OWNER,
      pet: PET,
      passport: PASSPORT,
      name: "Nova",
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Cozy,
    });
    expect(addresses(own).slice(0, 2)).toEqual([OWNER, OWNER]);
  });

  it("encodes discriminator + trimmed name + species + personality", () => {
    const trimmed = getAdoptPetInstruction({
      owner: OWNER,
      payer: SPONSOR,
      pet: PET,
      passport: PASSPORT,
      name: "  Nova ",
      species: PetSpecies.MossPup,
      personality: PetPersonality.Brave,
    });
    // discriminator(8) + name len(4) + "Nova"(4) + species(1) + personality(1)
    const expected = [
      ...PAWKET_DISCRIMINATORS.adoptPet,
      4, 0, 0, 0, 78, 111, 118, 97,
      1, // moss_pup
      2, // brave
    ];
    expect(Array.from(ix.data ?? [])).toEqual(expected);
    expect(Array.from(trimmed.data ?? [])).toEqual(expected);
  });

  it("carries a signer on the meta so partial signing can find it", () => {
    const wallet = createNoopSigner(address(OWNER));
    const signed = getAdoptPetInstruction({
      owner: wallet,
      payer: createNoopSigner(address(SPONSOR)),
      pet: PET,
      passport: PASSPORT,
      name: "Nova",
      species: PetSpecies.LunaCat,
      personality: PetPersonality.Cozy,
    });
    const owner = signed.accounts?.[0] as { signer?: unknown };
    expect(owner.signer).toBe(wallet);
    expect(addresses(signed)[0]).toBe(OWNER);
  });

  it("rejects bad names", () => {
    expect(() =>
      getAdoptPetInstruction({
        owner: OWNER,
        pet: PET,
        passport: PASSPORT,
        name: "x",
        species: PetSpecies.LunaCat,
        personality: PetPersonality.Cozy,
      }),
    ).toThrow();
  });
});

describe("getCareInstruction", () => {
  it("encodes the Play variant with owner as read-only signer", () => {
    const ix = getCareInstruction({
      owner: OWNER,
      pet: PET,
      passport: PASSPORT,
      action: CareActionType.Play,
    });
    expect(String(ix.programAddress)).toBe(PAWKET_PROGRAM_ID);
    expect(addresses(ix)).toEqual([OWNER, PET, PASSPORT]);
    expect(roles(ix)).toEqual([
      AccountRole.READONLY_SIGNER,
      AccountRole.WRITABLE,
      AccountRole.WRITABLE,
    ]);
    expect(Array.from(ix.data ?? [])).toEqual([
      ...PAWKET_DISCRIMINATORS.performCareAction,
      1, // play
    ]);
  });
});

describe("getFinishRoundInstruction", () => {
  it("is the discriminator alone over owner, pet and passport", () => {
    const ix = getFinishRoundInstruction({ owner: OWNER, pet: PET, passport: PASSPORT });
    expect(addresses(ix)).toEqual([OWNER, PET, PASSPORT]);
    expect(roles(ix)).toEqual([
      AccountRole.READONLY_SIGNER,
      AccountRole.WRITABLE,
      AccountRole.WRITABLE,
    ]);
    expect(Array.from(ix.data ?? [])).toEqual([...PAWKET_DISCRIMINATORS.finishRound]);
  });
});

describe("getDressInstruction", () => {
  it("encodes the wardrobe slot over owner and pet", () => {
    const ix = getDressInstruction({ owner: OWNER, pet: PET, wearing: 3 });
    expect(addresses(ix)).toEqual([OWNER, PET]);
    expect(roles(ix)).toEqual([AccountRole.READONLY_SIGNER, AccountRole.WRITABLE]);
    expect(Array.from(ix.data ?? [])).toEqual([...PAWKET_DISCRIMINATORS.dress, 3]);
  });

  it("refuses a slot the wardrobe does not have", () => {
    expect(getDressInstruction({ owner: OWNER, pet: PET, wearing: WEARABLE_COUNT }).data?.at(-1)).toBe(WEARABLE_COUNT);
    expect(() => getDressInstruction({ owner: OWNER, pet: PET, wearing: WEARABLE_COUNT + 1 })).toThrow();
    expect(() => getDressInstruction({ owner: OWNER, pet: PET, wearing: -1 })).toThrow();
    expect(getDressInstruction({ owner: OWNER, pet: PET, wearing: 0 }).data?.[8]).toBe(0);
  });
});

describe("getReturnFloatInstruction", () => {
  it("is a plain system transfer from the device's own key to its owner's Pawket Wallet, nothing of Pawket's", async () => {
    const device = createNoopSigner(address("So11111111111111111111111111111111111111112"));
    const owner = address("SysvarRent111111111111111111111111111111111");
    const ix = await getReturnFloatInstruction({ device, owner, lamports: 995_000n });
    expect(ix.programAddress).toBe("11111111111111111111111111111111");
    // Its destination is always the owner's own Pawket Wallet, derived, never passed in.
    expect(ix.accounts?.map((meta) => [meta.address, meta.role])).toEqual([
      [device.address, AccountRole.WRITABLE_SIGNER],
      [(await deriveWalletPda(owner)).address, AccountRole.WRITABLE],
    ]);
    // The system program's Transfer: index 2, then the lamports, little-endian.
    expect(Array.from(ix.data ?? [])).toEqual([2, 0, 0, 0, ...Array.from(new Uint8Array(new BigUint64Array([995_000n]).buffer))]);
  });
});
