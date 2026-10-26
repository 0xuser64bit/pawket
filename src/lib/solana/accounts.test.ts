import { address, getBase64Decoder } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import { guestPetSchema, projectGuestPet, cooldownsFor } from "@/lib/guest/pet";
import { decodeGuild, decodeMember, decodePassport, decodePet, displayName, fetchPetOnChain, fetchPetsOnChain, toCompanionRecord, wearableSlot } from "./accounts";
import { deriveMemberPda, derivePassportPda } from "./pda";
import { PAWKET_ACCOUNTS, PAWKET_PROGRAM_ID } from "./program";

const OWNER = address("11111111111111111111111111111111");
const PET = address("J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp");
const PASSPORT = address("FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm");
const T = 1_790_848_800;

function petBytes({ name = "Pepper", wearing = 0 } = {}): Uint8Array {
  const bytes = new Uint8Array(PAWKET_ACCOUNTS.pet.size);
  const view = new DataView(bytes.buffer);
  bytes.set(PAWKET_ACCOUNTS.pet.discriminator, 0);
  bytes[40] = 2;
  bytes[41] = 3;
  view.setBigInt64(42, BigInt(T), true);
  view.setUint16(50, 2, true);
  view.setUint32(52, 120, true);
  bytes.set([60, 80, 40, 90], 56);
  view.setBigInt64(60, BigInt(T + 3600), true);
  view.setBigInt64(68, BigInt(T + 3600), true);
  bytes[100] = wearing;
  bytes[101] = 254;
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
  view.setUint32(72, careCount + 1, true);
  view.setUint32(76, careCount, true);
  view.setUint32(80, 4, true);
  view.setUint16(84, 3, true);
  view.setUint16(86, 5, true);
  view.setUint32(88, 20727, true);
  view.setUint32(92, 20726, true);
  marks.forEach(([action, at], slot) => {
    bytes[96 + slot * 9] = action;
    view.setBigInt64(97 + slot * 9, BigInt(at), true);
  });
  bytes[168] = 255;
  return bytes;
}

function guildBytes({ slug = "sunbeam-club", name = "Sunbeam Club", motto = "Naps first." } = {}): Uint8Array {
  const bytes = new Uint8Array(PAWKET_ACCOUNTS.guild.size);
  const view = new DataView(bytes.buffer);
  bytes.set(PAWKET_ACCOUNTS.guild.discriminator, 0);
  bytes.set(new Uint8Array(32).fill(7), 40);
  view.setBigInt64(72, BigInt(T), true);
  view.setUint32(80, 3, true);
  bytes[84] = 2;
  bytes[85] = 1;
  bytes[86] = 253;
  let at = 87;
  for (const text of [slug, name, motto]) {
    const encoded = new TextEncoder().encode(text);
    view.setUint32(at, encoded.length, true);
    bytes.set(encoded, at + 4);
    at += 4 + encoded.length;
  }
  return bytes;
}

describe("decodeGuild and decodeMember", () => {
  it("reads a guild at the program's offsets", () => {
    const guild = decodeGuild(PASSPORT, guildBytes());
    expect(guild).toMatchObject({ memberCount: 3, crest: 2, colour: 1, slug: "sunbeam-club", name: "Sunbeam Club", motto: "Naps first.", createdAt: T });
    expect(guild.founder).toBe(OWNER);
  });

  it("shows a stranger's guild without its control characters", () => {
    const guild = decodeGuild(PASSPORT, guildBytes({ name: "\u202eSunbeam", motto: "" }));
    expect(guild.name).toBe("Sunbeam");
    expect(guild.motto).toBe("");
  });

  it("reads a member, pet first and guild second", () => {
    const bytes = new Uint8Array(PAWKET_ACCOUNTS.member.size);
    bytes.set(PAWKET_ACCOUNTS.member.discriminator, 0);
    bytes.set(new Uint8Array(32).fill(1), 8);
    bytes.set(new Uint8Array(32).fill(2), 40);
    new DataView(bytes.buffer).setBigInt64(136, BigInt(T), true);
    const member = decodeMember(PET, bytes);
    expect(member.joinedAt).toBe(T);
    expect(member.pet).not.toBe(member.guild);
  });

  it("refuses bytes that are not theirs", () => {
    expect(() => decodeGuild(PASSPORT, petBytes())).toThrow(/not a Pawket guild/);
    expect(() => decodeMember(PASSPORT, guildBytes())).toThrow(/not a Pawket guild member/);
  });
});

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
    member: null,
  };
  const record = toCompanionRecord(onChain);

  it("is a valid companion record keyed by the pet's address", () => {
    expect(guestPetSchema.safeParse(record).success).toBe(true);
    expect(record.id).toBe(PET);
    expect(record.wearing).toBe("paper-crown");
    expect(record.streak).toEqual({ count: 3, lastDay: "2026-10-01", best: 5 });
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

describe("displayName", () => {
  it("drops what could disguise a stranger's name in the park", () => {
    expect(displayName("Pep\u202Eper")).toBe("Pepper");
    expect(displayName("Ni\u200Bb\u0007")).toBe("Nib");
    expect(displayName("\u202E\u2066")).toBe("A pet");
    expect(displayName("ねこねこ")).toBe("ねこねこ");
    expect(decodePet(PET, petBytes({ name: "Pep\u202Eper" })).name).toBe("Pepper");
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

describe("reading a pet", () => {
  const SYSTEM = "11111111111111111111111111111111";
  const memberBytes = () => {
    const bytes = new Uint8Array(PAWKET_ACCOUNTS.member.size);
    bytes.set(PAWKET_ACCOUNTS.member.discriminator, 0);
    bytes.set(new Uint8Array(32).fill(2), 40);
    return bytes;
  };
  const chain = (accounts: Map<string, { owner: string; data: Uint8Array }>) => {
    const info = (key: string) => {
      const account = accounts.get(key);
      return account ? { data: [getBase64Decoder().decode(account.data), "base64"], executable: false, lamports: 890_880n, owner: account.owner, space: BigInt(account.data.length) } : null;
    };
    return {
      getMultipleAccounts: (keys: string[]) => ({ send: async () => ({ context: { slot: 1n }, value: keys.map(info) }) }),
      getProgramAccounts: () => ({ send: async () => [{ pubkey: PET, account: info(PET)! }] }),
    } as never;
  };
  const world = async (member: { owner: string; data: Uint8Array }) =>
    chain(new Map([
      [PET, { owner: PAWKET_PROGRAM_ID, data: petBytes() }],
      [(await derivePassportPda(PET)).address, { owner: PAWKET_PROGRAM_ID, data: passportBytes([], 0) }],
      [(await deriveMemberPda(PET)).address, member],
    ]));

  it("takes lamports someone sent to its member address for no guild, so nobody can break its reads", async () => {
    const rpc = await world({ owner: SYSTEM, data: new Uint8Array(0) });
    expect(await fetchPetOnChain(rpc, PET)).toMatchObject({ pet: { name: "Pepper" }, member: null });
    expect((await fetchPetsOnChain(rpc)).map(({ pet, member }) => [pet.name, member])).toEqual([["Pepper", null]]);
  });

  it("reads the member account the program made", async () => {
    const rpc = await world({ owner: PAWKET_PROGRAM_ID, data: memberBytes() });
    expect((await fetchPetOnChain(rpc, PET))?.member?.guild).toBe(address("8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR"));
    expect((await fetchPetsOnChain(rpc))[0].member).not.toBeNull();
  });
});
