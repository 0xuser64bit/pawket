import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { guestPetSchema, projectGuestPet, cooldownsFor } from "@/lib/guest/pet";
import { decodePassport, decodePet, toCompanionRecord, wearableSlot } from "./accounts";
import { PAWKET_ACCOUNTS } from "./program";

/**
 * Bytes written by hand at the offsets the program test locks
 * (`account_layouts_are_the_contract_the_web_app_decodes`), so the decoder
 * is checked against the layout, not against itself.
 */
const OWNER = address("11111111111111111111111111111111");
const PET = address("J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp");
const PASSPORT = address("FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm");
const T = 1_790_848_800; // 2026-10-01T10:00:00Z, UTC day 20727

function petBytes({ name = "Pepper", wearing = 0 } = {}): Uint8Array {
  const bytes = new Uint8Array(PAWKET_ACCOUNTS.pet.size);
  const view = new DataView(bytes.buffer);
  bytes.set(PAWKET_ACCOUNTS.pet.discriminator, 0);
  // owner 8..40 stays zero: the system program's address, 1111…
  bytes[40] = 2; // cloud_bun
  bytes[41] = 3; // mischief
  view.setBigInt64(42, BigInt(T), true);
  view.setUint16(50, 2, true); // level
  view.setUint32(52, 120, true); // xp
  bytes.set([60, 80, 40, 90], 56);
  view.setBigInt64(60, BigInt(T + 3600), true); // stats_updated_at
  view.setBigInt64(68, BigInt(T + 3600), true); // last feed
  // last play, groom, rest stay 0: never
  bytes[100] = wearing;
  bytes[101] = 254; // bump
  const encoded = new TextEncoder().encode(name);
  view.setUint32(102, encoded.length, true);
  bytes.set(encoded, 106);
  return bytes;
}

function passportBytes(marks: Array<[number, number]>, careCount: number): Uint8Array {
  const bytes = new Uint8Array(PAWKET_ACCOUNTS.passport.size);
  const view = new DataView(bytes.buffer);
  bytes.set(PAWKET_ACCOUNTS.passport.discriminator, 0);
  bytes.set(new Uint8Array(32).fill(0), 8);
  view.setUint32(72, careCount + 1, true); // event_count
  view.setUint32(76, careCount, true);
  view.setUint32(80, 4, true); // plays
  view.setUint16(84, 3, true); // streak
  view.setUint16(86, 5, true); // best
  view.setUint32(88, 20727, true); // last active: 2026-10-01
  view.setUint32(92, 20726, true); // last play: 2026-09-30
  marks.forEach(([action, at], slot) => {
    bytes[96 + slot * 9] = action;
    view.setBigInt64(97 + slot * 9, BigInt(at), true);
  });
  bytes[168] = 255;
  return bytes;
}

describe("decodePet", () => {
  it("reads every field at its locked offset", () => {
    const pet = decodePet(PET, petBytes());
    expect(pet).toEqual({
      address: PET,
      owner: OWNER,
      name: "Pepper",
      species: PetSpecies.CloudBun,
      personality: PetPersonality.Mischief,
      birthTimestamp: T,
      level: 2,
      xp: 120,
      stats: { hunger: 60, happiness: 80, energy: 40, hygiene: 90 },
      statsUpdatedAt: T + 3600,
      lastCareAt: {
        [CareActionType.Feed]: T + 3600,
        [CareActionType.Play]: 0,
        [CareActionType.Groom]: 0,
        [CareActionType.Rest]: 0,
      },
      wearing: 0,
    });
  });

  it("reads a name of multibyte characters by its byte length", () => {
    expect(decodePet(PET, petBytes({ name: "ねこねこねこねこ" })).name).toBe("ねこねこねこねこ");
  });

  it("refuses bytes that are not a pet", () => {
    expect(() => decodePet(PET, passportBytes([], 0))).toThrow(/not a Pawket pet/);
  });
});

describe("decodePassport", () => {
  it("returns the ring oldest first and drops empty slots", () => {
    const passport = decodePassport(PASSPORT, passportBytes([[0, T], [1, T + 60]], 2));
    expect(passport.recent).toEqual([
      { action: CareActionType.Feed, at: T },
      { action: CareActionType.Play, at: T + 60 },
    ]);
    expect(passport).toMatchObject({ careCount: 2, plays: 4, streak: 3, bestStreak: 5 });
  });

  it("starts a full ring at care_count % 8, where the oldest was kept", () => {
    // Ten cares: slots 0 and 1 hold cares 8 and 9, slot 2 the oldest kept (care 2).
    const marks: Array<[number, number]> = Array.from({ length: 8 }, (_, slot) => {
      const care = slot < 2 ? slot + 8 : slot;
      return [care % 4, T + care * 1800];
    });
    const recent = decodePassport(PASSPORT, passportBytes(marks, 10)).recent;
    expect(recent.map((mark) => mark.at)).toEqual(
      Array.from({ length: 8 }, (_, i) => T + (i + 2) * 1800),
    );
  });

  it("refuses bytes that are not a passport", () => {
    expect(() => decodePassport(PASSPORT, petBytes())).toThrow(/not a Pawket passport/);
  });
});

describe("toCompanionRecord", () => {
  const onChain = {
    pet: decodePet(PET, petBytes({ wearing: 2 })),
    passport: decodePassport(PASSPORT, passportBytes([[0, T + 3600]], 1)),
  };
  const record = toCompanionRecord(onChain);

  it("is a valid companion record keyed by the pet's address", () => {
    expect(guestPetSchema.safeParse(record).success).toBe(true);
    expect(record.id).toBe(PET);
    expect(record.wearing).toBe("paper-crown");
    expect(record.streak).toEqual({ count: 3, lastDay: "2026-10-01" });
    expect(record.lastDailyPlayDay).toBe("2026-09-30");
    expect(record.careLog).toEqual([
      { action: CareActionType.Feed, at: "2026-10-01T11:00:00.000Z", xpGained: 10 },
    ]);
  });

  it("projects and cools down with the same functions as a browser pet", () => {
    const at = new Date((T + 3600 + 600) * 1000);
    expect(projectGuestPet(record, at).level).toBe(2);
    expect(cooldownsFor(record, at)).toEqual({
      [CareActionType.Feed]: 1200,
      [CareActionType.Play]: 0,
      [CareActionType.Groom]: 0,
      [CareActionType.Rest]: 0,
    });
  });
});

describe("wearableSlot", () => {
  it("numbers the wardrobe from 1 and nothing as 0", () => {
    expect(wearableSlot(null)).toBe(0);
    expect(wearableSlot("wool-scarf")).toBe(1);
    expect(wearableSlot("nap-ribbon")).toBe(6);
    expect(() => wearableSlot("top-hat")).toThrow();
  });
});
