import { AccountRole } from "@solana/kit";
import { describe, expect, it } from "vitest";
import {
  encodeAnchorString,
  getAdoptPetInstruction,
  getCareInstruction,
} from "./instructions";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "./program";

const OWNER = "11111111111111111111111111111111";
const PET = "7C6FJ44NqBgJwnhjfKWeqRbqefVxWtv6GrcvyCwteCrF";
const PASSPORT = "BvgKi517VzV7hKiRha6v4q5UrvR6FtZfYZ88WfPEqGmM";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

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
    pet: PET,
    passport: PASSPORT,
    name: "Nova",
    species: PetSpecies.MossPup,
    personality: PetPersonality.Brave,
  });

  it("targets the Pawket program", () => {
    expect(String(ix.programAddress)).toBe(PAWKET_PROGRAM_ID);
  });

  it("orders accounts owner → pet → passport → system with exact roles", () => {
    expect(ix.accounts).toEqual([
      { address: expect.anything(), role: AccountRole.WRITABLE_SIGNER },
      { address: expect.anything(), role: AccountRole.WRITABLE },
      { address: expect.anything(), role: AccountRole.WRITABLE },
      { address: expect.anything(), role: AccountRole.READONLY },
    ]);
    const addrs = (ix.accounts ?? []).map((a) => String(a.address));
    expect(addrs).toEqual([OWNER, PET, PASSPORT, SYSTEM_PROGRAM]);
  });

  it("encodes discriminator + name + species + personality", () => {
    const data = Array.from(ix.data ?? []);
    // discriminator(8) + name len(4) + "Nova"(4) + species(1) + personality(1)
    expect(data).toEqual([
      ...PAWKET_DISCRIMINATORS.adoptPet,
      4, 0, 0, 0, 78, 111, 118, 97,
      1, // moss_pup
      2, // brave
    ]);
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
    expect(ix.accounts).toEqual([
      { address: expect.anything(), role: AccountRole.READONLY_SIGNER },
      { address: expect.anything(), role: AccountRole.WRITABLE },
      { address: expect.anything(), role: AccountRole.WRITABLE },
    ]);
    expect(Array.from(ix.data ?? [])).toEqual([
      ...PAWKET_DISCRIMINATORS.performCareAction,
      1, // play
    ]);
  });
});
