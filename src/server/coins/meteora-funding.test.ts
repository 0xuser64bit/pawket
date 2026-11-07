// @vitest-environment node
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { deriveDbcPoolAddress, deriveDbcTokenVaultAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID, type DynamicBondingCurveClient, type PoolConfig, type VirtualPool } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COIN_CONFIGS } from "@/lib/coins/presets";
import type { ChainGuild } from "@/lib/solana/accounts";

vi.mock("@/config/env", () => ({ getPublicEnv: () => ({ solanaCluster: "devnet", appUrl: "https://dev.pawket.world" }) }));
vi.mock("@/config/server-env", () => ({ serverRpcUrl: () => "http://127.0.0.1:8899" }));
vi.mock("@/server/derive", () => ({ derivedSeed: () => new Uint8Array(32).fill(7) }));
vi.mock("@/server/sponsor", () => ({ sponsorRpc: () => ({}) }));
vi.mock("@/lib/solana/accounts", () => ({ fetchWallet: async () => ({ device: device.toBase58(), deviceExpiresAt: Number.MAX_SAFE_INTEGER, lamports: walletLamports }) }));
vi.mock("@meteora-ag/dynamic-bonding-curve-sdk", async (original) => {
  const sdk = await original<typeof import("@meteora-ag/dynamic-bonding-curve-sdk")>();
  return { ...sdk, DynamicBondingCurveClient: class extends sdk.DynamicBondingCurveClient {
    constructor(...args: ConstructorParameters<typeof sdk.DynamicBondingCurveClient>) {
      super(...args);
      for (const state of [this.state, ...[this.pool, this.creator, this.migration].map((client) => (client as unknown as { state: DynamicBondingCurveClient["state"] }).state)]) {
        state.getPool = async () => virtualPool;
        state.getPoolConfig = async () => poolConfig;
      }
    }
  } };
});

const owner = Keypair.generate().publicKey;
const device = Keypair.generate().publicKey;
const mint = Keypair.fromSeed(new Uint8Array(32).fill(7)).publicKey;
const sol = new PublicKey("So11111111111111111111111111111111111111112");
const config = new PublicKey(COIN_CONFIGS.devnet!.gentle);
const pool = deriveDbcPoolAddress(sol, mint, config);
let walletLamports = 9_001_000_000n;
const virtualPool = { poolState: {
  baseMint: mint, baseVault: deriveDbcTokenVaultAddress(pool, mint), quoteVault: deriveDbcTokenVaultAddress(pool, sol), config, poolType: 0, creator: owner,
  isMigrated: 0, quoteReserve: new BN(0), sqrtPrice: new BN("18446744073709551616"), creatorQuoteFee: new BN(0), partnerQuoteFee: new BN(0), metrics: { totalTradingQuoteFee: new BN(0) },
} } as unknown as VirtualPool;
const poolConfig = { quoteMint: sol, tokenType: 0, quoteTokenFlag: 0, migrationFeeOption: 2, migrationQuoteThreshold: new BN(1_000_000_000), poolFees: { baseFee: { baseFeeMode: 0 } }, activationType: 1, enableFirstSwapWithMinFee: false } as unknown as PoolConfig;
const guild = { slug: "funding-check", name: "Funding", founder: owner.toBase58() } as ChainGuild;
const claim = (side: "buy" | "sell") => ({
  v: 1 as const, cluster: "devnet" as const, slug: guild.slug, mint: mint.toBase58(), preset: "gentle" as const, route: "curve" as const,
  side, amountIn: "100000000", minimumOut: "1234", slippageBps: 100, quotedAt: 1, expiresAt: 2,
});

beforeEach(() => {
  walletLamports = 9_001_000_000n;
  vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockImplementation(async (keys) => keys.map((_, i) => i === 0 ? { owner: DYNAMIC_BONDING_CURVE_PROGRAM_ID, data: Buffer.alloc(0), executable: false, lamports: 1, rentEpoch: 0 } : null));
  vi.spyOn(Connection.prototype, "getAccountInfo").mockResolvedValue(null);
  vi.spyOn(Connection.prototype, "getMinimumBalanceForRentExemption").mockResolvedValue(1_000_000);
  vi.spyOn(Connection.prototype, "getBalance").mockImplementation(async (key) => key.equals(device) ? 1_000_000 : 33);
  vi.spyOn(Connection.prototype, "getLatestBlockhash").mockResolvedValue({ blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1 });
  vi.spyOn(Connection.prototype, "getFeeForMessage").mockResolvedValue({ context: { slot: 1 }, value: 10_000 });
});

describe("server coin funding", () => {
  it.each(["buy", "sell"] as const)("a %s receives only its operation input plus rent, leaving the rest of a large wallet unexposed", async (side) => {
    const { tradeTransaction } = await import("./meteora");
    const wire = await tradeTransaction({ guild, owner: owner.toBase58(), side, amountIn: 100_000_000n, minimumOut: 1234n, quote: claim(side) });
    const transaction = VersionedTransaction.deserialize(Buffer.from(wire, "base64"));
    const data = Buffer.from(transaction.message.compiledInstructions[0].data);
    expect(data.readBigUInt64LE(8)).toBe(side === "buy" ? 105_000_000n : 5_000_000n);
    expect(data.readBigUInt64LE(16)).toBe(33n);
    expect(transaction.message.staticAccountKeys[0].toBase58()).toBe(device.toBase58());
    expect(transaction.signatures.every((signature) => signature.every((byte) => byte === 0))).toBe(true);
  });

  it.each([
    ["route", { route: "pool" }],
    ["mint", { mint: Keypair.generate().publicKey.toBase58() }],
    ["preset", { preset: "lively" }],
    ["side", { side: "sell" }],
  ])("refuses a quote whose %s no longer matches the live coin", async (_field, changed) => {
    const { CoinRefusal, tradeTransaction } = await import("./meteora");
    const quote = { ...claim("buy"), ...(changed as Partial<ReturnType<typeof claim>>) };
    await expect(tradeTransaction({ guild, owner: owner.toBase58(), side: "buy", amountIn: 100_000_000n, minimumOut: 1234n, quote })).rejects.toBeInstanceOf(CoinRefusal);
  });

  it("preserves the device refill and uses a smaller available balance without funding the reserve", async () => {
    const { tradeTransaction } = await import("./meteora");
    walletLamports = 3_000_000n; // 1m rent + 10k refill + 1.99m available.
    const wire = await tradeTransaction({ guild, owner: owner.toBase58(), side: "sell", amountIn: 100_000_000n, minimumOut: 1234n, quote: claim("sell") });
    const transaction = VersionedTransaction.deserialize(Buffer.from(wire, "base64"));
    expect(Buffer.from(transaction.message.compiledInstructions[0].data).readBigUInt64LE(8)).toBe(1_990_000n);
  });
});
