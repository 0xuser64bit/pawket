// @vitest-environment node
import { Connection, Keypair, PublicKey, SystemProgram, type AccountInfo } from "@solana/web3.js";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DAMM_V2_PROGRAM_ID, deriveDammV2PoolAddress, deriveDbcPoolAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";
import { presetConfig } from "@/lib/coins/presets";
import { derivedSeed } from "@/server/derive";

const sponsor = Keypair.generate();
vi.mock("@/config/server-env", async (actual) => ({
  ...(await actual<typeof import("@/config/server-env")>()),
  getServerEnv: () => ({ sponsorKeypair: JSON.stringify([...sponsor.secretKey]) }),
  serverRpcUrl: () => "http://127.0.0.1:8899",
}));

let creator: PublicKey;
let migrated = 0;
const curve = () => ({
  poolState: {
    creator,
    isMigrated: migrated,
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
    migrated = 0;
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([pool, null]);
    vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValue([]);
  });

  it.each([100, 101, 201])("reads %i migrated coins in bounded batches without losing pool order", async (count) => {
    creator = founder;
    migrated = 1;
    const guilds = Array.from({ length: count }, (_, index) => ({ ...guild, slug: `club-${index}` }));
    const wrappedSol = new PublicKey("So11111111111111111111111111111111111111112");
    const config = new PublicKey(presetConfig("devnet", "gentle")!);
    const accounts = new Map<string, AccountInfo<Buffer> | null>();
    const graduatedPool = { ...pool, owner: DAMM_V2_PROGRAM_ID };
    for (const [index, candidate] of guilds.entries()) {
      const mint = Keypair.fromSeed(derivedSeed(`pawket guild coin ${candidate.slug}`)!).publicKey;
      accounts.set(deriveDbcPoolAddress(wrappedSol, mint, config).toBase58(), pool);
      const damm = deriveDammV2PoolAddress(DAMM_V2_MIGRATION_FEE_ADDRESS[0], mint, wrappedSol);
      accounts.set(damm.toBase58(), index === 0 ? dust : index === count - 1 ? null : graduatedPool);
    }
    const reads = vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockImplementation(async (keys) => {
      if (keys.length > 100) throw new Error("At most 100 accounts per RPC request");
      return keys.map((key) => accounts.get(key.toBase58()) ?? null);
    });
    const { readCoinStages } = await import("./meteora");
    const stages = await readCoinStages(guilds);
    expect(stages.size).toBe(count);
    for (const [index, candidate] of guilds.entries()) {
      expect(stages.get(candidate.slug), candidate.slug).toBe(index === 0 || index === count - 1 ? "pending" : "damm");
    }
    expect(reads.mock.calls.every(([keys]) => keys.length <= 100)).toBe(true);
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
