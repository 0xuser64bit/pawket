import { getBase58Decoder, type Address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { CareActionType } from "@/lib/game/enums";
import { PAWKET_DISCRIMINATORS, PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { entryFrom, type ReadTransaction } from "./history";

const DEVICE = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin" as Address;
const PET = "J3nMY26sQZiBod2RCwsUFrh8E5PW56Mhr4ksm8RFQJAp";
const PASSPORT = "FEJ7fHr3JBuYMDZ67UsWZfaGVo2S4dMizG6T3xp1BQMm";
const OWNER = "4fQfsGgDvo3AgpfTDwL3eXLc3WNeTVpZ1b8fwW7cHRnD";

const data = (bytes: number[]) => getBase58Decoder().decode(Uint8Array.from(bytes));

function tx(keys: string[], instructions: ReadTransaction["transaction"]["message"]["instructions"], pre: number[], post: number[]): ReadTransaction {
  return {
    blockTime: 1_790_848_800,
    meta: { fee: 5_000, err: null, preBalances: pre, postBalances: post },
    transaction: { message: { accountKeys: keys, instructions } },
  };
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
      // 100,000,000 lamports, little-endian
      { programIdIndex: 4, accounts: [0, 1, 3], data: data([...PAWKET_DISCRIMINATORS.deposit, 0, 225, 245, 5, 0, 0, 0, 0]) },
      { programIdIndex: 4, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.linkDevice, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0]) },
    ];
    const entry = entryFrom(
      "sig",
      tx(keys, ixs, [200_000_000, 0, 0, 1, 1], [200_000_000 - 100_000_000 - rent - 5_000, 100_000_000 + rent - 1_000_000, 1_000_000, 1, 1]),
      WALLET,
      BigInt(rent),
    );
    expect(entry?.kinds).toEqual(["open", "deposit", "link"]);
    expect(entry).toMatchObject({ amount: 100_000_000n, toDevice: 1_000_000n, change: 99_000_000n });
  });

  it("counts a close as the whole balance going out, and not the rent", () => {
    const rent = 1_447_800;
    const keys = [OWNER, WALLET, OWNER, PAWKET_PROGRAM_ID];
    const close = { programIdIndex: 3, accounts: [0, 1, 2], data: data([...PAWKET_DISCRIMINATORS.closeWallet]) };
    const entry = entryFrom("sig", tx(keys, [close], [5_000_000, 12_000_000 + rent, 5_000_000, 1], [5_000_000 + 12_000_000 + rent - 5_000, 0, 0, 1]), WALLET, BigInt(rent));
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
});
