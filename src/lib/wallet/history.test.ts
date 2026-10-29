import { createNoopSigner, getAddressDecoder, getBase58Decoder, getU64Encoder, type Address, type Instruction } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { CareActionType } from "@/lib/game/enums";
import { getCreateKeepsakeInstruction, PAWKET_COLLECTION } from "@/lib/solana/core";
import idl from "@/lib/solana/idl/pawket.json";
import { MARKET, PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { entryFrom, type ReadTransaction } from "./history";

const DEVICE = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin" as Address;
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const PASSPORT = "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm";
const OWNER = "4fQfsGgDvo3AgpfTDwL3eXLc3WNeTVpZ1b8fwW7cHRnD";
const key = (n: number) => getAddressDecoder().decode(new Uint8Array(32).fill(n));
const STRANGER = key(1);
const STRANGERS_WALLET = key(2);
const SPONSOR = key(3);
const SYSTEM = "11111111111111111111111111111111";

const data = (bytes: number[]) => getBase58Decoder().decode(Uint8Array.from(bytes));

function tx(keys: string[], instructions: ReadTransaction["transaction"]["message"]["instructions"], pre: number[], post: number[], err: unknown = null): ReadTransaction {
  return {
    blockTime: 1_790_848_800,
    meta: { fee: 5_000, err, preBalances: pre, postBalances: post },
    transaction: { message: { accountKeys: keys, instructions } },
  };
}

/** One instruction as a transaction reads back, its fee paid by `payer`. */
function compiled(ix: Instruction, payer: string): ReadTransaction {
  const keys = [...new Set([payer, ...ix.accounts!.map((account) => account.address as string), ix.programAddress as string])];
  const accounts = ix.accounts!.map((account) => keys.indexOf(account.address));
  const balances = keys.map(() => 1);
  return tx(keys, [{ programIdIndex: keys.indexOf(ix.programAddress), accounts, data: getBase58Decoder().decode(ix.data!) }], balances, balances);
}

describe("a Pawket Wallet's statement", () => {
  it("reads a device's care as the care, the pet, and one fee out of the balance", () => {
    const keys = [DEVICE, WALLET, PET, PASSPORT, PAWKET_PROGRAM_ID];
    const care = { programIdIndex: 4, accounts: [0, 1, 2, 3], data: data([...PAWKET_DISCRIMINATORS.careByDevice, 2]) };
    const entry = entryFrom("sig", tx(keys, [care], [1_000_000, 50_000_000, 0, 0, 1], [1_000_000, 49_995_000, 0, 0, 1]), WALLET);
    expect(entry).toEqual({
      signature: "sig",
      at: 1_790_848_800,
      kinds: ["care"],
      action: CareActionType.Groom,
      pet: PET,
      change: -5_000n,
      fee: 5_000n,
      feePayer: DEVICE,
      ok: true,
    });
  });

  it("reads one transaction that opens, fills and links, in that order, and leaves the rent out of the balance", () => {
    const rent = 1_447_800;
    const keys = [OWNER, WALLET, DEVICE, "11111111111111111111111111111111", PAWKET_PROGRAM_ID];
    const ixs = [
      { programIdIndex: 4, accounts: [0, 0, 1, 3], data: data([...PAWKET_DISCRIMINATORS.openWallet]) },
      { programIdIndex: 4, accounts: [0, 1, 3], data: data([...PAWKET_DISCRIMINATORS.deposit, 0, 225, 245, 5, 0, 0, 0, 0]) },
      { programIdIndex: 4, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.linkDevice, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0]) },
    ];
    const entry = entryFrom(
      "sig",
      tx(keys, ixs, [200_000_000, 0, 0, 1, 1], [200_000_000 - 100_000_000 - rent - 5_000, 100_000_000 + rent - 1_000_000, 1_000_000, 1, 1]),
      WALLET,
      { rent: BigInt(rent) },
    );
    expect(entry?.kinds).toEqual(["open", "deposit", "link"]);
    expect(entry).toMatchObject({ amount: 100_000_000n, toDevice: 1_000_000n, change: 99_000_000n });
  });

  it("counts a close as the whole balance going out, and not the rent", () => {
    const rent = 1_447_800;
    const keys = [OWNER, WALLET, OWNER, PAWKET_PROGRAM_ID];
    const close = { programIdIndex: 3, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.closeWallet]) };
    const entry = entryFrom("sig", tx(keys, [close], [5_000_000, 12_000_000 + rent, 5_000_000, 1], [5_000_000 + 12_000_000 + rent - 5_000, 0, 0, 1]), WALLET, { rent: BigInt(rent) });
    expect(entry?.change).toBe(-12_000_000n);
  });

  it("names the piece a device dressed a pet in, and taking it off", () => {
    const keys = [DEVICE, WALLET, PET, PAWKET_PROGRAM_ID];
    const on = entryFrom("a", tx(keys, [{ programIdIndex: 3, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.dressByDevice, 18]) }], [0, 0, 0, 0], [0, 0, 0, 0]), WALLET);
    const off = entryFrom("b", tx(keys, [{ programIdIndex: 3, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.dressByDevice, 0]) }], [0, 0, 0, 0], [0, 0, 0, 0]), WALLET);
    expect(on?.wearing).toBe("leaf-sprout");
    expect(off?.wearing).toBeNull();
  });

  it("leaves out what touched the wallet without being Pawket's", () => {
    const keys = [OWNER, WALLET, "11111111111111111111111111111111"];
    const transfer = { programIdIndex: 2, accounts: [0, 1], data: data([2, 0, 0, 0, 64, 66, 15, 0, 0, 0, 0, 0]) };
    expect(entryFrom("c", tx(keys, [transfer], [10, 0, 1], [5, 5, 1]), WALLET)).toBeNull();
  });
  it("keeps purchases and atomic coin activity in the same statement", () => {
    const keys = [DEVICE, OWNER, WALLET, PAWKET_PROGRAM_ID, SYSTEM, key(4), MARKET.treasury, "Sysvar1nstructions1111111111111111111111111"];
    const read = (discriminator: readonly number[], accounts: number[]) =>
      entryFrom("sig", tx(keys, [{ programIdIndex: 3, accounts, data: data([...discriminator]) }], [1_000_000, 200_000_000, 100_000_000, 1, 1, 0, 0, 1], [1_000_000, 200_000_000, 50_000_000, 1, 1, 0, 0, 1]), WALLET);
    // owner, payer, closet, treasury, system, wallet
    expect(read(PAWKET_DISCRIMINATORS.buyWithWallet, [1, 0, 5, 6, 4, 2])).toMatchObject({ kinds: ["purchase"], change: -50_000_000n });
    // owner, wallet, device, instructions, system
    expect(read(PAWKET_DISCRIMINATORS.fundWalletSpend, [1, 2, 0, 7, 4])).toMatchObject({ kinds: ["coin"], change: -50_000_000n });
  });

  it("reads an instruction only where the program checks its Pawket Wallet", () => {
    const described: string[] = [];
    for (const ix of idl.instructions) {
      const at = ix.accounts.findIndex((account) => account.name === "wallet");
      if (at < 0) continue;
      const keys = [...ix.accounts.map((_, i) => (i === at ? WALLET : key(10 + i))), PAWKET_PROGRAM_ID];
      const balances = keys.map(() => 1);
      const read = (accounts: number[]) =>
        entryFrom("sig", tx(keys, [{ programIdIndex: keys.length - 1, accounts, data: data([...ix.discriminator, ...new Array(16).fill(0)]) }], balances, balances), WALLET);
      const slots = ix.accounts.map((_, i) => i);
      if (!read(slots)) continue;
      described.push(ix.name);
      // The same instruction holding this wallet in any other account acts on another wallet.
      for (const other of slots.filter((i) => i !== at)) {
        expect(read(slots.map((i) => (i === at ? other : i === other ? at : i))), `${ix.name}, the wallet at ${other}`).toBeNull();
      }
    }
    expect(described.sort()).toEqual([
      "adopt_pet_by_device", "buy_with_wallet", "care_by_device", "check_in_by_device", "close_wallet", "create_event_by_device",
      "create_poll_by_device", "deposit", "dress_by_device", "dress_owned_by_device", "finish_round_by_device", "found_guild_by_device",
      "fund_wallet_spend", "join_guild_by_device", "leave_guild_by_device", "link_device", "open_wallet", "rsvp_by_device",
      "unlink_device", "vote_by_device", "wave_by_device", "withdraw",
    ]);
  });

  it("leaves out a stranger's own instruction in a transaction that only mentions this wallet", () => {
    const keys = [STRANGER, STRANGERS_WALLET, WALLET, PAWKET_PROGRAM_ID, SYSTEM];
    const theirs = { programIdIndex: 3, accounts: [0, 1, 4], data: data([...PAWKET_DISCRIMINATORS.deposit, ...getU64Encoder().encode(5_000_000_000n)]) };
    const mention = { programIdIndex: 4, accounts: [0, 2], data: data([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) };
    const planted = tx(keys, [theirs, mention], [10_000_000_000, 2_000_000, 2_000_000, 1, 1], [4_999_995_000, 5_002_000_000, 2_000_000, 1, 1]);
    expect(entryFrom("sig", planted, WALLET)).toBeNull();
    expect(entryFrom("sig", planted, STRANGERS_WALLET)).toMatchObject({ kinds: ["deposit"], amount: 5_000_000_000n, change: 5_000_000_000n });
  });

  it("lists a refused transaction only when the wallet's owner or device paid its fee", () => {
    const refused = (payer: string) => {
      const keys = [payer, DEVICE, WALLET, PET, PASSPORT, PAWKET_PROGRAM_ID];
      const care = { programIdIndex: 5, accounts: [1, 2, 3, 4], data: data([...PAWKET_DISCRIMINATORS.careByDevice, 2]) };
      const balances = [1_000_000, 1_000_000, 50_000_000, 0, 0, 1];
      return tx(keys, [care], balances, balances, { InstructionError: [0, { Custom: 6000 }] });
    };
    const keys = { owner: OWNER as Address, device: DEVICE as Address };
    expect(entryFrom("sig", refused(DEVICE), WALLET, keys)).toMatchObject({ kinds: ["care"], ok: false, feePayer: DEVICE, change: 0n });
    expect(entryFrom("sig", refused(OWNER), WALLET, keys)).toMatchObject({ kinds: ["care"], ok: false, feePayer: OWNER });
    expect(entryFrom("sig", refused(STRANGER), WALLET, keys)).toBeNull();
    expect(entryFrom("sig", refused(SPONSOR), WALLET, keys)).toBeNull();
    expect(entryFrom("sig", refused(DEVICE), WALLET)).toBeNull();
  });

  it("reads a keepsake card only where its builder names the Pawket Wallet", () => {
    const card = getCreateKeepsakeInstruction({
      asset: createNoopSigner(key(5)),
      collection: PAWKET_COLLECTION,
      authority: createNoopSigner(SPONSOR),
      payer: createNoopSigner(SPONSOR),
      owner: createNoopSigner(OWNER as Address),
      pet: PET,
      pawketWallet: WALLET,
      name: "Biscuit",
      uri: "https://pawket.world/api/keepsake/pet",
      species: "Cat",
      personality: "Calm",
    });
    expect(entryFrom("sig", compiled(card, SPONSOR), WALLET)?.kinds).toEqual(["card"]);
    // The same card naming this wallet as its owner instead reads as nothing of this wallet's.
    const swapped = { ...card, accounts: card.accounts!.map((account, i) => (i === 4 ? card.accounts![8] : i === 8 ? card.accounts![4] : account)) };
    expect(entryFrom("sig", compiled(swapped, SPONSOR), WALLET)).toBeNull();
  });
});
