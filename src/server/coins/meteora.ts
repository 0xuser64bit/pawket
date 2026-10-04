import "server-only";

import { createHmac } from "node:crypto";
import { Connection, Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  deriveDammV2PoolAddress,
  deriveDbcPoolAddress,
  deriveDbcPoolAuthority,
  DynamicBondingCurveClient,
  getCurrentPoint,
  getPriceFromSqrtPrice,
  SwapMode,
  U64_MAX,
  type PoolConfig,
  type VirtualPool,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CpAmm, derivePoolAuthority, getTokenProgram } from "@meteora-ag/cp-amm-sdk";
import { getPublicEnv } from "@/config/env";
import { getServerEnv } from "@/config/server-env";
import { COIN_PRESETS, COIN_TERMS, coinName, coinSymbol, presetConfig, presetForConfig, type PresetId } from "@/lib/coins/presets";
import { coinStage, type CoinStage } from "@/lib/coins/stage";
import { DELISTED_SLUGS } from "@/lib/guilds/delisted";
import type { ChainGuild } from "@/lib/solana/accounts";

/**
 * A guild's coin, as Meteora keeps it: read from Solana, quoted and built
 * here, signed by the player in their own wallet. This is the one module
 * that speaks Meteora's SDKs (web3.js v1 and Anchor underneath, server
 * only — the lint rule keeps them in this folder).
 *
 * A guild has one coin at one address: its mint's key comes from the
 * sponsor's secret and the guild's slug, as a keepsake's does from the
 * pet's, so the coin is found with one read, nobody can make one at that
 * address but Pawket's server, and a coin claiming to be a guild's that is
 * not at that address is simply not the guild's. Coins are off wherever
 * the sponsor's key is not set, or the cluster has no preset configs.
 */

const WRAPPED_SOL = new PublicKey("So11111111111111111111111111111111111111112");
const DBC_POOL_AUTHORITY = deriveDbcPoolAuthority();
const DAMM_POOL_AUTHORITY = derivePoolAuthority();

let connection: Connection | null = null;
function rpc(): Connection {
  connection ??= new Connection(getServerEnv().solanaRpcUrl ?? getPublicEnv().solanaRpcUrl, "confirmed");
  return connection;
}
const dbc = () => new DynamicBondingCurveClient(rpc(), "confirmed");
const damm = () => new CpAmm(rpc());

/** The guild's coin key, or null where coins are off. Its secret never leaves this module. */
function coinKeypair(slug: string): Keypair | null {
  const keypair = getServerEnv().sponsorKeypair;
  if (!keypair) return null;
  const secret = Uint8Array.from(JSON.parse(keypair) as number[]).subarray(0, 32);
  return Keypair.fromSeed(createHmac("sha256", secret).update(`pawket guild coin ${slug}`).digest());
}

/** A coin as a screen draws it: plain JSON, lamports and coin units as decimal strings. */
export interface CoinState {
  slug: string;
  name: string;
  symbol: string;
  mint: string;
  stage: CoinStage;
  preset: PresetId | null;
  /** The curve's pool on Meteora's Dynamic Bonding Curve. */
  pool: string | null;
  /** The wallet that launched it: the guild's founder. */
  creator: string | null;
  raised: string;
  threshold: string;
  /** SOL for one whole coin, at the price now. */
  price: number;
  /** The graduated pool, once the curve has migrated to DAMM v2. */
  graduated: { pool: string; verified: boolean } | null;
  fees: { founderUnclaimed: string; pawketUnclaimed: string; total: string };
  /** Wallets holding the coin, and how much of what they hold the largest ten have, in percent. */
  holders: { count: number; topTenPercent: number } | null;
}

/** A coin with what this module needs to quote and build from it. */
interface LiveCoin {
  state: CoinState;
  mint: Keypair;
  curve: { address: PublicKey; pool: VirtualPool; config: PoolConfig; configAddress: PublicKey } | null;
  graduated: { address: PublicKey; pool: Awaited<ReturnType<CpAmm["fetchPoolState"]>> } | null;
}

const configs = new Map<string, Promise<PoolConfig | null>>();
/** A preset's config never changes once made, so it is read once per process. */
function readConfig(address: PublicKey): Promise<PoolConfig | null> {
  const key = address.toBase58();
  let config = configs.get(key);
  if (!config) {
    config = dbc().state.getPoolConfig(address);
    configs.set(key, config);
    config.catch(() => configs.delete(key));
  }
  return config;
}

const holderReads = new Map<string, { at: number; value: Promise<CoinState["holders"]> }>();
/**
 * Every token account of the coin, less the pools' own vaults: how many
 * wallets hold it, and how concentrated it is. A scan, so it answers for
 * 15 seconds; null when the RPC will not run it.
 */
function readHolders(mint: PublicKey): Promise<CoinState["holders"]> {
  const key = mint.toBase58();
  const cached = holderReads.get(key);
  if (cached && Date.now() - cached.at < 15_000) return cached.value;
  const value = (async () => {
    const accounts = await rpc().getProgramAccounts(new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), {
      filters: [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: key } }],
      dataSlice: { offset: 32, length: 40 },
    });
    const byOwner = new Map<string, bigint>();
    for (const { account } of accounts) {
      const owner = new PublicKey(account.data.subarray(0, 32));
      if (owner.equals(DBC_POOL_AUTHORITY) || owner.equals(DAMM_POOL_AUTHORITY)) continue;
      const amount = account.data.readBigUInt64LE(32);
      if (amount > 0n) byOwner.set(owner.toBase58(), (byOwner.get(owner.toBase58()) ?? 0n) + amount);
    }
    const amounts = [...byOwner.values()].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
    const total = amounts.reduce((sum, amount) => sum + amount, 0n);
    const topTen = amounts.slice(0, 10).reduce((sum, amount) => sum + amount, 0n);
    return { count: amounts.length, topTenPercent: total === 0n ? 0 : Number((topTen * 10_000n) / total) / 100 };
  })().catch(() => null);
  holderReads.set(key, { at: Date.now(), value });
  return value;
}

const big = (value: BN | bigint | number) => BigInt(value.toString());

/** The guild's coin, read live from Solana; null where coins are off. Throws when Solana does not answer. */
async function liveCoin(guild: ChainGuild): Promise<LiveCoin | null> {
  const cluster = getPublicEnv().solanaCluster;
  const mint = coinKeypair(guild.slug);
  const offered = COIN_PRESETS.flatMap((preset) => {
    const config = presetConfig(cluster, preset.id);
    return config ? [new PublicKey(config)] : [];
  });
  if (!mint || offered.length === 0) return null;

  const listed = !DELISTED_SLUGS.has(guild.slug);
  const pools = offered.map((config) => deriveDbcPoolAddress(WRAPPED_SOL, mint.publicKey, config));
  const accounts = await rpc().getMultipleAccountsInfo(pools);
  const found = accounts.findIndex((account) => account !== null);
  const base: CoinState = {
    slug: guild.slug,
    name: coinName(guild.name),
    symbol: coinSymbol(guild.slug),
    mint: mint.publicKey.toBase58(),
    stage: "none",
    preset: null,
    pool: null,
    creator: null,
    raised: "0",
    threshold: "0",
    price: 0,
    graduated: null,
    fees: { founderUnclaimed: "0", pawketUnclaimed: "0", total: "0" },
    holders: null,
  };
  if (found < 0) return { state: base, mint, curve: null, graduated: null };

  const address = pools[found];
  const configAddress = offered[found];
  const [pool, config] = await Promise.all([dbc().state.getPool(address), readConfig(configAddress)]);
  if (!pool || !config) return { state: base, mint, curve: null, graduated: null };

  const curveState = pool.poolState;
  const migrated = curveState.isMigrated === 1;
  let graduated: LiveCoin["graduated"] = null;
  if (migrated) {
    const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[config.migrationFeeOption];
    const dammAddress = deriveDammV2PoolAddress(dammConfig, mint.publicKey, WRAPPED_SOL);
    const dammPool = await damm()
      .fetchPoolState(dammAddress)
      .catch(() => null);
    if (dammPool) graduated = { address: dammAddress, pool: dammPool };
  }
  const verified = Boolean(
    graduated && graduated.pool.tokenAMint.equals(mint.publicKey) && graduated.pool.tokenBMint.equals(WRAPPED_SOL),
  );
  const raised = big(curveState.quoteReserve);
  const threshold = big(config.migrationQuoteThreshold);
  const sqrtPrice = verified && graduated ? graduated.pool.sqrtPrice : curveState.sqrtPrice;

  return {
    mint,
    curve: { address, pool, config, configAddress },
    graduated: verified ? graduated : null,
    state: {
      ...base,
      stage: coinStage({ listed, curve: { raised, threshold, migrated }, graduated: migrated ? { verified } : null }),
      preset: presetForConfig(cluster, configAddress.toBase58()),
      pool: address.toBase58(),
      creator: curveState.creator.toBase58(),
      raised: raised.toString(),
      threshold: threshold.toString(),
      price: Number(getPriceFromSqrtPrice(sqrtPrice, COIN_TERMS.decimals, 9).toString()),
      graduated: graduated ? { pool: graduated.address.toBase58(), verified } : null,
      fees: {
        founderUnclaimed: big(curveState.creatorQuoteFee).toString(),
        pawketUnclaimed: big(curveState.partnerQuoteFee).toString(),
        total: big(curveState.metrics.totalTradingQuoteFee).toString(),
      },
      holders: await readHolders(mint.publicKey),
    },
  };
}

/** The guild's coin as a screen draws it, or null where coins are off. */
export async function readCoin(guild: ChainGuild): Promise<CoinState | null> {
  return (await liveCoin(guild))?.state ?? null;
}

export type TradeSide = "buy" | "sell";

/** A quote: what a trade gives for what, now, and the least it will accept. Amounts are base units. */
export interface CoinQuote {
  side: TradeSide;
  route: "curve" | "pool";
  amountIn: string;
  /** Of `amountIn`, what the trade takes; the rest comes back, as when a buy fills the curve. */
  amountUsed: string;
  amountOut: string;
  minimumOut: string;
  /** In lamports: every fee is taken in SOL. */
  fee: string;
  /** How far the trade moves the price, in percent. */
  priceImpact: number;
  slippageBps: number;
  quotedAt: number;
}

export class CoinRefusal extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CoinRefusal";
  }
}

const STAGE_REFUSAL: Partial<Record<CoinStage, string>> = {
  none: "This guild has no coin.",
  pending: "Trading is paused while the coin graduates. Nothing was sent.",
  suspended: "Pawket stopped offering trades in this coin. What you hold is untouched on Solana.",
};

async function tradable(guild: ChainGuild): Promise<LiveCoin> {
  const coin = await liveCoin(guild);
  if (!coin) throw new CoinRefusal("Guild coins are off on this deployment.", 503);
  const refusal = STAGE_REFUSAL[coin.state.stage];
  if (refusal) throw new CoinRefusal(refusal, 409);
  return coin;
}

export async function quoteTrade(guild: ChainGuild, side: TradeSide, amountIn: bigint, slippageBps: number): Promise<CoinQuote> {
  if (amountIn <= 0n) throw new CoinRefusal("Choose an amount above nothing.", 400);
  const coin = await tradable(guild);
  const quotedAt = Date.now();
  if (coin.state.stage === "damm" && coin.graduated) {
    const slot = await rpc().getSlot("confirmed");
    const time = (await rpc().getBlockTime(slot)) ?? Math.floor(quotedAt / 1000);
    const quote = damm().getQuote({
      inAmount: new BN(amountIn.toString()),
      inputTokenMint: side === "buy" ? WRAPPED_SOL : coin.mint.publicKey,
      slippage: slippageBps,
      poolState: coin.graduated.pool,
      currentTime: time,
      currentSlot: slot,
      tokenADecimal: COIN_TERMS.decimals,
      tokenBDecimal: 9,
    });
    return {
      side,
      route: "pool",
      amountIn: amountIn.toString(),
      amountUsed: quote.consumedInAmount.toString(),
      amountOut: quote.swapOutAmount.toString(),
      minimumOut: quote.minSwapOutAmount.toString(),
      fee: quote.totalFee.toString(),
      priceImpact: Math.abs(Number(quote.priceImpact.toString())),
      slippageBps,
      quotedAt,
    };
  }
  const { pool, config } = coin.curve!;
  // A partial fill: a buy that would carry the curve past its threshold
  // takes only what graduation needs, and the rest stays in the wallet.
  const quote = dbc().pool.swapQuote2({
    virtualPool: pool,
    config,
    swapBaseForQuote: side === "sell",
    swapMode: SwapMode.PartialFill,
    amountIn: new BN(amountIn.toString()),
    slippageBps,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint: await getCurrentPoint(rpc(), config.activationType),
  });
  const before = Number(getPriceFromSqrtPrice(pool.poolState.sqrtPrice, COIN_TERMS.decimals, 9).toString());
  const after = Number(getPriceFromSqrtPrice(quote.nextSqrtPrice, COIN_TERMS.decimals, 9).toString());
  return {
    side,
    route: "curve",
    amountIn: amountIn.toString(),
    amountUsed: big(quote.includedFeeInputAmount).toString(),
    amountOut: quote.outputAmount.toString(),
    minimumOut: (quote.minimumAmountOut ?? quote.outputAmount).toString(),
    fee: big(quote.tradingFee).toString(),
    priceImpact: before > 0 ? Math.abs((after - before) / before) * 100 : 0,
    slippageBps,
    quotedAt,
  };
}

/** The player is the fee payer and signs last, in their own wallet; any key the transaction makes signs here first. */
async function forPlayer(transaction: Transaction, player: PublicKey, signers: Keypair[] = []): Promise<string> {
  transaction.feePayer = player;
  transaction.recentBlockhash = (await rpc().getLatestBlockhash("confirmed")).blockhash;
  if (signers.length) transaction.partialSign(...signers);
  return transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

/**
 * The founder launches the guild's coin on a preset: the curve's pool and
 * the coin itself (signed here by the coin's own key), and, when they ask,
 * their own first buy in the same transaction — before anyone else can.
 */
export async function launchTransaction({
  guild,
  founder,
  preset,
  firstBuyLamports,
  metadataUri,
}: {
  guild: ChainGuild;
  founder: string;
  preset: PresetId;
  firstBuyLamports: bigint;
  metadataUri: string;
}): Promise<string> {
  const coin = await liveCoin(guild);
  if (!coin) throw new CoinRefusal("Guild coins are off on this deployment.", 503);
  if (coin.state.stage !== "none") throw new CoinRefusal(`${guild.name} already has its coin. Nothing was sent.`, 409);
  const config = presetConfig(getPublicEnv().solanaCluster, preset);
  if (!config) throw new CoinRefusal("That preset is not offered here.", 400);
  const payer = new PublicKey(founder);
  const transaction = await dbc().creator.createPoolWithFirstBuy({
    createPoolParam: {
      name: coinName(guild.name),
      symbol: coinSymbol(guild.slug),
      uri: metadataUri,
      payer,
      poolCreator: payer,
      config: new PublicKey(config),
      baseMint: coin.mint.publicKey,
    },
    firstBuyParam:
      firstBuyLamports > 0n
        ? {
            buyer: payer,
            buyAmount: new BN(firstBuyLamports.toString()),
            // Nothing can trade on a pool before the transaction that makes it lands.
            minimumAmountOut: new BN(0),
            referralTokenAccount: null,
          }
        : undefined,
  });
  return forPlayer(transaction, payer, [coin.mint]);
}

/** A trade at no worse than `minimumOut`: on the curve, or in the graduated pool once it is verified. */
export async function tradeTransaction({
  guild,
  owner,
  side,
  amountIn,
  minimumOut,
}: {
  guild: ChainGuild;
  owner: string;
  side: TradeSide;
  amountIn: bigint;
  minimumOut: bigint;
}): Promise<string> {
  if (amountIn <= 0n || minimumOut <= 0n) throw new CoinRefusal("Choose an amount above nothing.", 400);
  const coin = await tradable(guild);
  const player = new PublicKey(owner);
  if (coin.state.stage === "damm" && coin.graduated) {
    const { address, pool } = coin.graduated;
    const transaction = await damm().swap({
      payer: player,
      pool: address,
      inputTokenMint: side === "buy" ? WRAPPED_SOL : coin.mint.publicKey,
      outputTokenMint: side === "buy" ? coin.mint.publicKey : WRAPPED_SOL,
      amountIn: new BN(amountIn.toString()),
      minimumAmountOut: new BN(minimumOut.toString()),
      tokenAMint: pool.tokenAMint,
      tokenBMint: pool.tokenBMint,
      tokenAVault: pool.tokenAVault,
      tokenBVault: pool.tokenBVault,
      tokenAProgram: getTokenProgram(pool.tokenAFlag),
      tokenBProgram: getTokenProgram(pool.tokenBFlag),
      referralTokenAccount: null,
      poolState: pool,
    });
    return forPlayer(transaction, player);
  }
  const transaction = await dbc().pool.swap2({
    owner: player,
    payer: player,
    pool: coin.curve!.address,
    swapMode: SwapMode.PartialFill,
    amountIn: new BN(amountIn.toString()),
    minimumAmountOut: new BN(minimumOut.toString()),
    swapBaseForQuote: side === "sell",
    referralTokenAccount: null,
  });
  return forPlayer(transaction, player);
}

/**
 * Graduation: a curve that raised its threshold moves into its DAMM v2
 * pool, its liquidity locked there for good. Meteora's keepers do this on
 * mainnet; on devnet anyone may, paying the new pool's rent.
 */
export async function graduateTransaction(guild: ChainGuild, payer: string): Promise<string> {
  const coin = await liveCoin(guild);
  if (!coin?.curve) throw new CoinRefusal("This guild has no coin.", 404);
  if (coin.curve.pool.poolState.isMigrated === 1) throw new CoinRefusal("The coin has graduated already. Nothing was sent.", 409);
  if (coin.state.stage !== "pending") throw new CoinRefusal("The curve has not raised its threshold yet. Nothing was sent.", 409);
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[coin.curve.config.migrationFeeOption];
  const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await dbc().migration.migrateToDammV2({
    payer: new PublicKey(payer),
    pool: coin.curve.address,
    dammConfig,
  });
  return forPlayer(transaction, new PublicKey(payer), [firstPositionNftKeypair, secondPositionNftKeypair]);
}

/** The founder's share of the curve's trading fees, claimed to their wallet. */
export async function claimTransaction(guild: ChainGuild, founder: string): Promise<string> {
  const coin = await liveCoin(guild);
  if (!coin?.curve) throw new CoinRefusal("This guild has no coin.", 404);
  if (coin.curve.pool.poolState.creator.toBase58() !== founder) {
    throw new CoinRefusal("Only the wallet that launched the coin claims its share. Nothing was sent.", 403);
  }
  if (big(coin.curve.pool.poolState.creatorQuoteFee) === 0n) throw new CoinRefusal("There is nothing to claim yet. Nothing was sent.", 409);
  const creator = new PublicKey(founder);
  const transaction = await dbc().creator.claimCreatorTradingFee({
    creator,
    payer: creator,
    pool: coin.curve.address,
    maxBaseAmount: U64_MAX,
    maxQuoteAmount: U64_MAX,
  });
  return forPlayer(transaction, creator);
}
