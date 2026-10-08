// @vitest-environment node
import { Connection, Keypair, PublicKey, type AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";

/**
 * A guild's coin is the curve its founder made at the guild's coin address,
 * and nothing else is. Solana and Meteora are stood in for: one curve is
 * found there, made by `creator`. The whole life of a real coin is walked
 * against devnet (`pnpm e2e:coins`).
 */
const sponsor = Keypair.generate();
vi.mock("@/config/server-env", () => ({
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
      getProgram: () => ({ coder: { accounts: { decode: () => curve() } } }),
    };
  },
}));

const founder = Keypair.generate().publicKey;
const guild = { slug: "sunbeam-club", name: "Sunbeam Club", founder: founder.toBase58() } as unknown as ChainGuild;

describe("a guild's coin", () => {
  beforeEach(() => {
    const found = { data: Buffer.alloc(0) } as unknown as AccountInfo<Buffer>;
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([found, null]);
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
});
