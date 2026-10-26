// @vitest-environment node
import { Connection, Keypair, PublicKey, SystemProgram, type AccountInfo } from "@solana/web3.js";
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";

const sponsor = Keypair.generate();
vi.mock("@/config/server-env", async (actual) => ({
  ...(await actual<typeof import("@/config/server-env")>()),
  getServerEnv: () => ({ sponsorKeypair: JSON.stringify([...sponsor.secretKey]) }),
  serverRpcUrl: () => "http://127.0.0.1:8899",
}));

let creator: PublicKey;
const curve = () => ({
  poolState: {
    creator,
    isMigrated: 0,
    quoteReserve: new BN(1_000),
    sqrtPrice: new BN(2).pow(new BN(64)),
    creatorQuoteFee: new BN(0),
    partnerQuoteFee: new BN(0),
    metrics: { totalTradingQuoteFee: new BN(0) },
  },
});
vi.mock("@meteora-ag/dynamic-bonding-curve-sdk", async (actual) => ({
  ...(await actual<typeof import("@meteora-ag/dynamic-bonding-curve-sdk")>()),
  DynamicBondingCurveClient: class {
    state = {
      getPool: async () => curve(),
      getPoolConfig: async () => ({ migrationQuoteThreshold: new BN(1_000_000), migrationFeeOption: 0 }),
      getProgram: () => ({ coder: { accounts: { decode: (_name: string, data: Buffer) => {
        if (data.length === 0) throw new Error("Invalid account discriminator");
        return curve();
      } } } }),
    };
  },
}));

const founder = Keypair.generate().publicKey;
const guild = { slug: "sunbeam-club", name: "Sunbeam Club", founder: founder.toBase58() } as unknown as ChainGuild;

describe("a guild's coin", () => {
  const pool = { owner: DYNAMIC_BONDING_CURVE_PROGRAM_ID, data: Buffer.alloc(8) } as unknown as AccountInfo<Buffer>;
  const dust = { owner: SystemProgram.programId, data: Buffer.alloc(0) } as unknown as AccountInfo<Buffer>;
  beforeEach(() => {
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([pool, null]);
    vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValue([]);
  });

  it("is the curve its founder made", async () => {
    creator = founder;
    const { readCoin, readCoinStages } = await import("./meteora");
    expect(await readCoin(guild)).toMatchObject({ stage: "dbc", creator: founder.toBase58() });
    expect((await readCoinStages([guild])).get(guild.slug)).toBe("dbc");
  });

  it("is not a curve someone else made at its address, and none is launched over it", async () => {
    creator = Keypair.generate().publicKey;
    const { readCoin, readCoinStages, launchTransaction } = await import("./meteora");
    expect(await readCoin(guild)).toMatchObject({ stage: "none", pool: null, creator: null });
    expect((await readCoinStages([guild])).has(guild.slug)).toBe(false);
    await expect(
      launchTransaction({ guild, founder: founder.toBase58(), preset: "gentle", firstBuyLamports: 0n, metadataUri: "https://pawket.world/x" }),
    ).rejects.toThrow(/founder did not launch/);
  });

  it("is the curve, not lamports someone sent to another preset's address first", async () => {
    creator = founder;
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([dust, pool]);
    const { readCoin, readCoinStages } = await import("./meteora");
    expect(await readCoin(guild)).toMatchObject({ stage: "dbc", preset: "lively" });
    expect((await readCoinStages([guild])).get(guild.slug)).toBe("dbc");
  });
});
