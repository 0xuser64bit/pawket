import { AccountRole, type Instruction } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { WEARABLES } from "@/lib/closet/catalog";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import idl from "./idl/pawket.json";
import {
  getAdoptPetInstruction,
  getCareInstruction,
  getDressInstruction,
  getFinishRoundInstruction,
} from "./instructions";
import {
  CARE_ACTION_VARIANTS,
  PAWKET_ACCOUNTS,
  PAWKET_DISCRIMINATORS,
  PAWKET_ERROR_CODES,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  WEARABLE_COUNT,
} from "./program";

/**
 * `program.ts` is hand-written; the IDL is what `anchor build` says the
 * program is. Every number the client encodes or decodes is held to it, so a
 * program change that skips the client fails here, not on devnet.
 */

const A = "11111111111111111111111111111111";
const camel = (snake: string) => snake.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());

function variants(name: string): string[] {
  const type = idl.types.find((t) => t.name === name)?.type as { variants?: { name: string }[] };
  return (type?.variants ?? []).map((v) => v.name);
}

const BUILT: Record<string, Instruction> = {
  adopt_pet: getAdoptPetInstruction({
    owner: A,
    payer: A,
    pet: A,
    passport: A,
    name: "Nova",
    species: PetSpecies.LunaCat,
    personality: PetPersonality.Cozy,
  }),
  perform_care_action: getCareInstruction({ owner: A, pet: A, passport: A, action: CareActionType.Feed }),
  finish_round: getFinishRoundInstruction({ owner: A, pet: A, passport: A }),
  dress: getDressInstruction({ owner: A, pet: A, wearing: 0 }),
};

describe("program.ts against the IDL", () => {
  it("names the deployed program", () => {
    expect(idl.address).toBe(PAWKET_PROGRAM_ID);
  });

  it("has a builder, a discriminator and the account order for every instruction", () => {
    expect(Object.keys(PAWKET_DISCRIMINATORS).sort()).toEqual(
      idl.instructions.map((ix) => camel(ix.name)).sort(),
    );
    for (const ix of idl.instructions) {
      const key = camel(ix.name) as keyof typeof PAWKET_DISCRIMINATORS;
      expect(PAWKET_DISCRIMINATORS[key], ix.name).toEqual(ix.discriminator);

      const built = BUILT[ix.name];
      expect(built, `a builder for ${ix.name}`).toBeDefined();
      const want = ix.accounts.map((a) => {
        const account = a as { signer?: boolean; writable?: boolean };
        if (account.signer) return account.writable ? AccountRole.WRITABLE_SIGNER : AccountRole.READONLY_SIGNER;
        return account.writable ? AccountRole.WRITABLE : AccountRole.READONLY;
      });
      expect((built.accounts ?? []).map((a) => a.role), ix.name).toEqual(want);
      expect(Array.from(built.data ?? []).slice(0, 8)).toEqual(ix.discriminator);
    }
  });

  it("decodes the two accounts the program keeps", () => {
    const byName = Object.fromEntries(idl.accounts.map((a) => [a.name, a.discriminator]));
    expect(PAWKET_ACCOUNTS.pet.discriminator).toEqual(byName.Pet);
    expect(PAWKET_ACCOUNTS.passport.discriminator).toEqual(byName.PetPassport);
  });

  it("encodes enums in the program's variant order", () => {
    const order = (map: Record<string, number>) =>
      Object.entries(map).sort((a, b) => a[1] - b[1]).map(([key]) => key);
    const pascal = (value: string) => camel(value).replace(/^\w/, (c) => c.toUpperCase());

    expect(order(PET_SPECIES_VARIANTS).map(pascal)).toEqual(variants("PetSpecies"));
    expect(order(PET_PERSONALITY_VARIANTS).map(pascal)).toEqual(variants("PetPersonality"));
    expect(order(CARE_ACTION_VARIANTS).map(pascal)).toEqual(variants("CareActionType"));
  });

  it("maps every program error, and only those", () => {
    const shout = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
    expect(PAWKET_ERROR_CODES).toEqual(
      Object.fromEntries(idl.errors.map((e) => [e.code, shout(e.name)])),
    );
  });

  it("numbers the whole wardrobe and nothing past it", () => {
    expect(WEARABLE_COUNT).toBe(WEARABLES.length);
  });
});
