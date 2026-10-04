import { AccountRole, type Instruction } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { WEARABLES } from "@/lib/closet/catalog";
import { CareActionType, PetPersonality, PetSpecies } from "@/lib/game/enums";
import idl from "./idl/pawket.json";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  getAdoptPetInstruction,
  getBuyInstruction,
  getCheckInInstruction,
  getCreateEventInstruction,
  getCreatePollInstruction,
  getDressOwnedByDeviceInstruction,
  getDressOwnedInstruction,
  getRsvpInstruction,
  getVoteInstruction,
  getWaveInstruction,
  getCareByDeviceInstruction,
  getCareInstruction,
  getCloseWalletInstruction,
  getDepositInstruction,
  getDressByDeviceInstruction,
  getDressInstruction,
  getFinishRoundByDeviceInstruction,
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
  CARE_ACTION_VARIANTS,
  GATHERING_LIMITS,
  GUILD_LIMITS,
  MARKET,
  PAWKET_ACCOUNTS,
  PAWKET_DISCRIMINATORS,
  PAWKET_ERROR_CODES,
  PAWKET_PROGRAM_ID,
  PET_PERSONALITY_VARIANTS,
  PET_SPECIES_VARIANTS,
  WALLET_LIMITS,
  WEARABLE_COUNT,
} from "./program";

/**
 * `program.ts` is hand-written; the IDL is what `anchor build` says the
 * program is. Every number the client encodes or decodes is held to it, so a
 * program change that skips the client fails here, not on devnet.
 */

const A = "11111111111111111111111111111111";
const B = "PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74";
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
  found_guild: getFoundGuildInstruction({
    owner: A,
    payer: A,
    pet: A,
    guild: A,
    member: A,
    slug: "sunbeam-club",
    name: "Sunbeam Club",
    motto: "Naps first.",
    crest: 0,
    colour: 0,
  }),
  join_guild: getJoinGuildInstruction({ owner: A, payer: A, pet: A, guild: A, member: A }),
  leave_guild: getLeaveGuildInstruction({ owner: A, pet: A, member: A, guild: A, payer: A }),
  open_wallet: getOpenWalletInstruction({ owner: A, payer: A, wallet: A }),
  deposit: getDepositInstruction({ owner: A, wallet: A, amount: 50_000_000n }),
  withdraw: getWithdrawInstruction({ owner: A, wallet: A, amount: 1n }),
  link_device: getLinkDeviceInstruction({ owner: A, wallet: A, device: B, expiresAt: 1_790_848_800, dailyActions: 300 }),
  // As the IDL has it; a device that signs its own unlink is a signer there too (below).
  unlink_device: getUnlinkDeviceInstruction({ authority: A, wallet: A, device: B, deviceSigns: false }),
  close_wallet: getCloseWalletInstruction({ owner: A, wallet: A, rentPayer: A }),
  care_by_device: getCareByDeviceInstruction({ device: A, wallet: A, pet: A, passport: A, action: CareActionType.Rest }),
  finish_round_by_device: getFinishRoundByDeviceInstruction({ device: A, wallet: A, pet: A, passport: A }),
  dress_by_device: getDressByDeviceInstruction({ device: A, wallet: A, pet: A, wearing: 18 }),
  buy: getBuyInstruction({ owner: A, payer: A, closet: A, item: 19 }),
  dress_owned: getDressOwnedInstruction({ owner: A, pet: A, closet: A, wearing: 19 }),
  dress_owned_by_device: getDressOwnedByDeviceInstruction({ device: A, wallet: A, pet: A, closet: A, wearing: 22 }),
  create_event: getCreateEventInstruction({ owner: A, payer: A, guild: A, event: A, id: 7, title: "Sunday nap", note: "By the window.", startsAt: 1_790_848_800, endsAt: 1_790_856_000 }),
  rsvp: getRsvpInstruction({ owner: A, payer: A, pet: A, member: A, event: A, rsvp: A }),
  check_in: getCheckInInstruction({ owner: A, pet: A, event: A, rsvp: A }),
  create_poll: getCreatePollInstruction({ owner: A, payer: A, guild: A, poll: A, id: 7, question: "Which rug?", options: ["Red", "Blue"], closesAt: 1_790_848_800 }),
  vote: getVoteInstruction({ owner: A, payer: A, pet: A, member: A, poll: A, ballot: A, option: 1 }),
  wave: getWaveInstruction({ visitor: A, payer: A, pet: A, guestbook: A }),
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

  it("decodes every account the program keeps", () => {
    const byName = Object.fromEntries(idl.accounts.map((a) => [a.name, a.discriminator]));
    expect(PAWKET_ACCOUNTS.pet.discriminator).toEqual(byName.Pet);
    expect(PAWKET_ACCOUNTS.passport.discriminator).toEqual(byName.PetPassport);
    expect(PAWKET_ACCOUNTS.guild.discriminator).toEqual(byName.Guild);
    expect(PAWKET_ACCOUNTS.member.discriminator).toEqual(byName.GuildMember);
    expect(PAWKET_ACCOUNTS.wallet.discriminator).toEqual(byName.PawketWallet);
    expect(PAWKET_ACCOUNTS.closet.discriminator).toEqual(byName.Closet);
    expect(PAWKET_ACCOUNTS.event.discriminator).toEqual(byName.GuildEvent);
    expect(PAWKET_ACCOUNTS.rsvp.discriminator).toEqual(byName.EventRsvp);
    expect(PAWKET_ACCOUNTS.poll.discriminator).toEqual(byName.GuildPoll);
    expect(PAWKET_ACCOUNTS.ballot.discriminator).toEqual(byName.Ballot);
    expect(PAWKET_ACCOUNTS.guestbook.discriminator).toEqual(byName.Guestbook);
    expect(Object.keys(PAWKET_ACCOUNTS)).toHaveLength(idl.accounts.length);
  });

  it("encodes the Pawket Wallet's arguments as the program reads them", () => {
    const args = (name: string) => idl.instructions.find((ix) => ix.name === name)!.args.map((a) => [a.name, a.type]);
    expect(args("link_device")).toEqual([
      ["expires_at", "i64"],
      ["daily_actions", "u16"],
    ]);
    expect(args("deposit")).toEqual([["amount", "u64"]]);
    const link = Array.from(BUILT.link_device.data ?? []);
    expect(link.slice(8, 16)).toEqual(Array.from(new Uint8Array(new BigInt64Array([1_790_848_800n]).buffer)));
    expect(link.slice(16)).toEqual([44, 1]);
    expect(Array.from(BUILT.deposit.data ?? []).slice(8)).toEqual([128, 240, 250, 2, 0, 0, 0, 0]);
    expect(Array.from(BUILT.dress_by_device.data ?? []).slice(8)).toEqual([18]);
    // The device signs a link, and an unlink it gives its float back on.
    expect(BUILT.link_device.accounts?.[2]).toMatchObject({ address: B, role: AccountRole.WRITABLE_SIGNER });
    expect(getUnlinkDeviceInstruction({ authority: A, wallet: A, device: B, deviceSigns: true }).accounts?.[2]).toMatchObject({
      address: B,
      role: AccountRole.WRITABLE_SIGNER,
    });
    expect(BUILT.unlink_device.accounts?.[2].role).toBe(AccountRole.WRITABLE);
  });

  it("holds the Pawket Wallet's limits to the program's", () => {
    const source = readFileSync(path.join(process.cwd(), "programs/pawket/src/lib.rs"), "utf8");
    const constant = (name: string) => source.match(new RegExp(`pub const ${name}: \\w+ = ([^;]+);`))?.[1].replaceAll("_", "");
    expect(constant("MAX_DEVICE_SECONDS")).toBe("30 * SECONDSPERDAY");
    expect(WALLET_LIMITS.maxDeviceSeconds).toBe(30 * 86_400);
    expect(Number(constant("MAX_DAILY_ACTIONS"))).toBe(WALLET_LIMITS.maxDailyActions);
    expect(BigInt(constant("DEVICE_FLOAT_LAMPORTS")!)).toBe(WALLET_LIMITS.deviceFloat);
    expect(BigInt(constant("FEE_PER_SIGNATURE")!)).toBe(WALLET_LIMITS.feePerSignature);
  });

  it("encodes a founding as the program reads its arguments", () => {
    const args = idl.instructions.find((ix) => ix.name === "found_guild")!.args.map((a) => a.name);
    expect(args).toEqual(["slug", "name", "motto", "crest", "colour"]);
    const data = Array.from(BUILT.found_guild.data ?? []);
    // discriminator, then "sunbeam-club" as a u32-prefixed string
    expect(data.slice(8, 12)).toEqual([12, 0, 0, 0]);
    expect(String.fromCharCode(...data.slice(12, 24))).toBe("sunbeam-club");
    expect(data.slice(-2)).toEqual([0, 0]);
    expect(GUILD_LIMITS.crests).toBe(8);
    expect(GUILD_LIMITS.colours).toBe(6);
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

  it("numbers the whole wardrobe and nothing past it: the free eighteen, then the Market's", () => {
    expect(WEARABLE_COUNT + MARKET.wearables).toBe(WEARABLES.length);
    expect(WEARABLES.slice(0, WEARABLE_COUNT).every((item) => !item.price)).toBe(true);
    expect(WEARABLES.slice(WEARABLE_COUNT).every((item) => item.price === MARKET.wearablePrice)).toBe(true);
  });

  it("holds the Market and a guild's gatherings to the program's numbers", () => {
    const source = readFileSync(path.join(process.cwd(), "programs/pawket/src/lib.rs"), "utf8");
    const constant = (name: string) => source.match(new RegExp(`pub const ${name}: [\\w&\\[\\]]+ = ([^;]+);`))?.[1].replaceAll("_", "");
    expect(Number(constant("MARKET_WEARABLE_COUNT"))).toBe(MARKET.wearables);
    expect(Number(constant("FIRST_ROOM_ITEM"))).toBe(MARKET.firstRoom);
    expect(Number(constant("MARKET_ROOM_COUNT"))).toBe(MARKET.rooms);
    expect(BigInt(constant("WEARABLE_PRICE_LAMPORTS")!)).toBe(MARKET.wearablePrice);
    expect(BigInt(constant("ROOM_PRICE_LAMPORTS")!)).toBe(MARKET.roomPrice);
    expect(source).toContain(`pubkey!("${MARKET.treasury}")`);
    expect(Number(constant("MAX_EVENT_TITLE_LEN"))).toBe(GATHERING_LIMITS.maxTitle);
    expect(Number(constant("MAX_EVENT_NOTE_LEN"))).toBe(GATHERING_LIMITS.maxNote);
    expect(Number(constant("MAX_POLL_QUESTION_LEN"))).toBe(GATHERING_LIMITS.maxQuestion);
    expect(Number(constant("MAX_POLL_OPTION_LEN"))).toBe(GATHERING_LIMITS.maxOption);
    expect(Number(constant("MAX_POLL_OPTIONS"))).toBe(GATHERING_LIMITS.maxOptions);
    // A poll's options go on the wire as a u32-counted list of strings.
    const poll = Array.from(BUILT.create_poll.data ?? []);
    expect(poll.slice(8, 12)).toEqual([7, 0, 0, 0]);
  });
});
