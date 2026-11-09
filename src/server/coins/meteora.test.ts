// @vitest-environment node
import { AddressLookupTableAccount, Connection, Keypair, PublicKey, SystemProgram, type AccountInfo } from "@solana/web3.js";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DAMM_V2_PROGRAM_ID, deriveDammV2PoolAddress, deriveDbcPoolAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import BN from "bn.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";
import { COIN_LOOKUP_TABLES, presetConfig } from "@/lib/coins/presets";
import { derivedSeed } from "@/server/derive";

const sponsor = Keypair.generate();
const quotes = vi.hoisted(() => ({ swap: vi.fn() }));
const configs = vi.hoisted(() => ({ started: 0, gate: null as Promise<void> | null }));
const migrations = vi.hoisted(() => ({ migrate: vi.fn() }));
const pets = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/server/solana", () => ({ readPet: pets.read }));
vi.mock("@/config/server-env", async (actual) => ({
  ...(await actual<typeof import("@/config/server-env")>()),
  getServerEnv: () => ({ sponsorKeypair: JSON.stringify([...sponsor.secretKey]) }),
  serverRpcUrl: () => "http://127.0.0.1:8899",
}));

let creator: PublicKey;
let migrated = 0;
let raised = 1_000;
const curve = () => ({
  poolState: {
    creator,
    isMigrated: migrated,
    quoteReserve: new BN(raised),
    sqrtPrice: new BN(2).pow(new BN(64)),
    creatorQuoteFee: new BN(0),
    partnerQuoteFee: new BN(0),
    metrics: { totalTradingQuoteFee: new BN(0) },
  },
});
vi.mock("@meteora-ag/dynamic-bonding-curve-sdk", async (actual) => ({
  ...(await actual<typeof import("@meteora-ag/dynamic-bonding-curve-sdk")>()),
  getCurrentPoint: async () => new BN(1),
  DynamicBondingCurveClient: class {
    pool = { swapQuote2: quotes.swap };
    migration = { migrateToDammV2: migrations.migrate };
    state = {
      getPool: async () => curve(),
      getPoolConfig: async () => {
        configs.started += 1;
        if (configs.gate) await configs.gate;
        return { migrationQuoteThreshold: new BN(1_000_000), migrationFeeOption: 0 };
      },
      getProgram: () => ({ coder: { accounts: { decode: (_name: string, data: Buffer) => {
        if (data.length === 0) throw new Error("Invalid account discriminator");
        return curve();
      } } } }),
    };
  },
}));

const founder = Keypair.generate().publicKey;
const foundingPet = Keypair.generate().publicKey.toBase58();
const guildAddress = Keypair.generate().publicKey.toBase58();
const guild = {
  slug: "sunbeam-club",
  name: "Sunbeam Club",
  founder: founder.toBase58(),
  address: guildAddress,
  founderPet: foundingPet,
  memberCount: 3,
} as unknown as ChainGuild;

afterEach(() => {
  vi.useRealTimers();
});

describe("a guild's coin", () => {
  const pool = { owner: DYNAMIC_BONDING_CURVE_PROGRAM_ID, data: Buffer.alloc(8) } as unknown as AccountInfo<Buffer>;
  const dust = { owner: SystemProgram.programId, data: Buffer.alloc(0) } as unknown as AccountInfo<Buffer>;
  beforeEach(() => {
    migrated = 0;
    raised = 1_000;
    migrations.migrate.mockReset();
    pets.read.mockReset().mockResolvedValue({ member: { guild: guildAddress } });
    quotes.swap.mockReset().mockReturnValue({
      includedFeeInputAmount: new BN(100),
      outputAmount: new BN(90),
      minimumAmountOut: new BN(89),
      tradingFee: new BN(1),
      protocolFee: new BN(0),
      referralFee: new BN(0),
      nextSqrtPrice: new BN(2).pow(new BN(64)),
    });
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([pool, null]);
    vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValue([]);
  });

  it("quotes from verified pool state without scanning optional holder analytics", async () => {
    creator = founder;
    const holders = vi.spyOn(Connection.prototype, "getProgramAccounts").mockImplementation(() => new Promise(() => {}));
    const { quoteTrade } = await import("./meteora");
    expect(await quoteTrade({ ...guild, slug: "quoted-without-holders" }, "buy", 100n, 100)).toMatchObject({
      route: "curve", amountIn: "100", amountUsed: "100", amountOut: "90", minimumOut: "89", fee: "1",
    });
    expect(holders).not.toHaveBeenCalled();
    expect(quotes.swap).toHaveBeenCalledOnce();
  });

  it("never waits for holder analytics to determine claim, graduation or position availability", async () => {
    creator = founder;
    const holders = vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValue([]);
    const candidate = { ...guild, slug: "actions-without-holders" };
    const { claimTransaction, graduateTransaction, readPositionFees } = await import("./meteora");
    await expect(claimTransaction(candidate, founder.toBase58())).rejects.toThrow("There is nothing to claim yet.");
    await expect(graduateTransaction(candidate, founder.toBase58())).rejects.toThrow("The curve has not raised its threshold yet.");
    expect(await readPositionFees(candidate, founder.toBase58())).toBeNull();
    expect(holders).not.toHaveBeenCalled();
  });

  it("refuses an unusable graduation lookup table before preparing the migration", async () => {
    creator = founder;
    raised = 1_000_000;
    const table = COIN_LOOKUP_TABLES.devnet!;
    vi.spyOn(Connection.prototype, "getAddressLookupTable").mockResolvedValue({
      context: { slot: 1 },
      value: new AddressLookupTableAccount({
        key: new PublicKey(table),
        state: { deactivationSlot: 7n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, addresses: [founder] },
      }),
    });
    const { graduateTransaction } = await import("./meteora");
    await expect(graduateTransaction({ ...guild, slug: "deactivated-lookup" }, founder.toBase58())).rejects.toThrow(
      "Graduation's lookup table is not usable",
    );
    expect(migrations.migrate).not.toHaveBeenCalled();
  });

  it("still reads and caches holder analytics for the coin's display", async () => {
    creator = founder;
    const owner = Keypair.generate().publicKey;
    const data = Buffer.alloc(40);
    owner.toBuffer().copy(data);
    data.writeBigUInt64LE(123n, 32);
    const holders = vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValue([
      { pubkey: Keypair.generate().publicKey, account: { ...pool, data } },
    ]);
    const { readCoin } = await import("./meteora");
    const candidate = { ...guild, slug: "display-with-holders" };
    expect((await readCoin(candidate))?.holders).toEqual({ count: 1, topTenPercent: 100 });
    expect((await readCoin(candidate))?.holders).toEqual({ count: 1, topTenPercent: 100 });
    expect(holders).toHaveBeenCalledOnce();
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

  it("does not count an oversized holder scan, and tries again on the next display read", async () => {
    creator = founder;
    const data = Buffer.alloc(40);
    Keypair.generate().publicKey.toBuffer().copy(data);
    data.writeBigUInt64LE(123n, 32);
    const tooMany = Array.from({ length: 5_001 }, () => ({ pubkey: Keypair.generate().publicKey, account: { ...pool, data } }));
    const holders = vi.spyOn(Connection.prototype, "getProgramAccounts").mockResolvedValueOnce(tooMany).mockResolvedValueOnce([]);
    const { readCoin } = await import("./meteora");
    const candidate = { ...guild, slug: "oversized-holders" };
    expect((await readCoin(candidate))?.holders).toBeNull();
    expect((await readCoin(candidate))?.holders).toEqual({ count: 0, topTenPercent: 0 });
    expect(holders).toHaveBeenCalledTimes(2);
  });

  it("returns no holder count when a scan takes too long, and retries next time", async () => {
    vi.useFakeTimers();
    creator = founder;
    const holders = vi.spyOn(Connection.prototype, "getProgramAccounts").mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce([]);
    const { readCoin } = await import("./meteora");
    const candidate = { ...guild, slug: "slow-holders" };
    const pending = readCoin(candidate);
    await vi.advanceTimersByTimeAsync(5_000);
    expect((await pending)?.holders).toBeNull();
    expect((await readCoin(candidate))?.holders).toEqual({ count: 0, topTenPercent: 0 });
    expect(holders).toHaveBeenCalledTimes(2);
  });

  it("starts every distinct config read before waiting for any of them", async () => {
    creator = founder;
    vi.resetModules();
    configs.started = 0;
    let release!: () => void;
    configs.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const wrappedSol = new PublicKey("So11111111111111111111111111111111111111112");
    const gentle = new PublicKey(presetConfig("devnet", "gentle")!);
    const lively = new PublicKey(presetConfig("devnet", "lively")!);
    const first = { ...guild, slug: "config-first" };
    const second = { ...guild, slug: "config-second" };
    const accounts = new Map<string, AccountInfo<Buffer> | null>();
    accounts.set(deriveDbcPoolAddress(wrappedSol, Keypair.fromSeed(derivedSeed(`pawket guild coin ${first.slug}`)!).publicKey, gentle).toBase58(), pool);
    accounts.set(deriveDbcPoolAddress(wrappedSol, Keypair.fromSeed(derivedSeed(`pawket guild coin ${second.slug}`)!).publicKey, lively).toBase58(), pool);
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockImplementation(async (keys) => keys.map((key) => accounts.get(key.toBase58()) ?? null));
    const { readCoinStages } = await import("./meteora");
    const pending = readCoinStages([first, second]);
    await vi.waitFor(() => expect(configs.started).toBeGreaterThanOrEqual(2));
    release();
    const stages = await pending;
    expect(stages.get(first.slug)).toBe("dbc");
    expect(stages.get(second.slug)).toBe("dbc");
    configs.gate = null;
  });

  it("is the curve its founder made", async () => {
    creator = founder;
    const { readCoin, readCoinStages } = await import("./meteora");
    expect(await readCoin(guild)).toMatchObject({ stage: "dbc", creator: founder.toBase58() });
    expect((await readCoinStages([guild])).get(guild.slug)).toBe("dbc");
  });

  it("authorizes a launch inside the action, not only at the route", async () => {
    const { assertLaunchable, launchTransaction } = await import("./meteora");
    await expect(assertLaunchable(guild, founder.toBase58())).resolves.toBeUndefined();

    const attempt = (overrides: Partial<typeof guild> = {}, founderAddress = founder.toBase58()) =>
      launchTransaction({
        guild: { ...guild, ...overrides } as ChainGuild,
        founder: founderAddress,
        preset: "gentle",
        firstBuyLamports: 0n,
        metadataUri: "https://pawket.world/x",
      });

    await expect(attempt({}, Keypair.generate().publicKey.toBase58())).rejects.toThrow("Only the wallet that founded");
    await expect(attempt({ name: "Devnet Check Coin" })).rejects.toThrow("does not offer coins");
    await expect(attempt({ memberCount: 2 })).rejects.toThrow("once 3 pets");
    pets.read.mockResolvedValueOnce({ member: { guild: Keypair.generate().publicKey.toBase58() } });
    await expect(attempt()).rejects.toThrow("has left it");
    pets.read.mockRejectedValueOnce(new Error("Solana did not answer"));
    await expect(attempt()).rejects.toThrow("Solana did not answer. Nothing was sent");
  });

  it("adds the graduated pool's lifetime quote fees to the coin's total", async () => {
    creator = founder;
    migrated = 1;
    const wrappedSol = new PublicKey("So11111111111111111111111111111111111111112");
    const mint = Keypair.fromSeed(derivedSeed(`pawket guild coin ${guild.slug}`)!).publicKey;
    vi.spyOn(CpAmm.prototype, "fetchPoolState").mockResolvedValue({
      tokenAMint: mint,
      tokenBMint: wrappedSol,
      sqrtPrice: new BN(2).pow(new BN(64)),
      metrics: { totalLpBFee: new BN(50), totalProtocolBFee: new BN(7) },
    } as never);
    const { readCoin } = await import("./meteora");
    expect((await readCoin(guild))?.fees.total).toBe("57");
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
