import "server-only";

import { createHmac } from "node:crypto";
import { Connection, Keypair, PublicKey, TransactionInstruction, type Transaction } from "@solana/web3.js";
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
import { CpAmm, derivePoolAuthority, getTokenProgram, getUnClaimLpFee } from "@meteora-ag/cp-amm-sdk";
import { getPublicEnv } from "@/config/env";
import { getServerEnv, serverRpcUrl } from "@/config/server-env";
import { COIN_PRESETS, COIN_TERMS, coinName, coinSymbol, presetConfig, presetForConfig, type PresetId } from "@/lib/coins/presets";
import { coinStage, type CoinStage } from "@/lib/coins/stage";
import { DELISTED_SLUGS } from "@/lib/guilds/delisted";
import { fetchWallet, type ChainGuild } from "@/lib/solana/accounts";
import type { Address, Instruction } from "@solana/kit";
import { deriveWalletPda } from "@/lib/solana/pda";
import { getWalletSpendInstruction } from "@/lib/solana/instructions";
import { PAWKET_ACCOUNTS, WALLET_LIMITS } from "@/lib/solana/program";
import { sponsorRpc } from "@/server/sponsor";

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
  connection ??= new Connection(serverRpcUrl(), "confirmed");
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
  /** A curve sits at the guild's coin address that its founder did not make: not the guild's coin, and none can be launched. */
  taken?: boolean;
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

const holderReads = new Map<string, { at: number; value: Promise<Map<string, bigint> | null> }>();
/**
 * Every wallet holding the coin, and how much: its token accounts, less the
 * pools' own vaults. A scan, so it answers for 15 seconds; null when the RPC
 * will not run it.
 */
function holderWallets(mint: PublicKey): Promise<Map<string, bigint> | null> {
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
    return byOwner;
  })().catch(() => null);
  holderReads.set(key, { at: Date.now(), value });
  return value;
}

/** How many wallets hold the coin, and how much of what they hold the largest ten have. */
async function readHolders(mint: PublicKey): Promise<CoinState["holders"]> {
  const wallets = await holderWallets(mint);
  if (!wallets) return null;
  const amounts = [...wallets.values()].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
  const total = amounts.reduce((sum, amount) => sum + amount, 0n);
  const topTen = amounts.slice(0, 10).reduce((sum, amount) => sum + amount, 0n);
  return { count: amounts.length, topTenPercent: total === 0n ? 0 : Number((topTen * 10_000n) / total) / 100 };
}

/**
 * The wallets that hold any of a launched coin: whose pets wear the guild's
 * crest pin on its page. Cosmetic, and gone when they sell. Null when the
 * holders could not be read, which shows no pins rather than wrong ones.
 */
export async function readHolderWallets(coin: CoinState): Promise<Set<string> | null> {
  if (coin.stage === "none" || coin.stage === "suspended") return null;
  const wallets = await holderWallets(new PublicKey(coin.mint));
  return wallets ? new Set(wallets.keys()) : null;
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
  // Only the founder launches a guild's coin, so a curve someone else made
  // at its address (which takes the coin's key) is not the guild's coin.
  if (!curveState.creator.equals(new PublicKey(guild.founder))) return { state: base, mint, curve: null, graduated: null, taken: true };
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

/**
 * Every listed guild's coin stage, for the list of guilds: one read of all
 * their curves, and one of the graduated pools, however many guilds there
 * are. Empty where coins are off.
 */
export async function readCoinStages(guilds: ChainGuild[]): Promise<Map<string, CoinStage>> {
  const stages = new Map<string, CoinStage>();
  const cluster = getPublicEnv().solanaCluster;
  const offered = COIN_PRESETS.flatMap((preset) => {
    const config = presetConfig(cluster, preset.id);
    return config ? [new PublicKey(config)] : [];
  });
  if (offered.length === 0 || !getServerEnv().sponsorKeypair) return stages;

  const candidates = guilds.flatMap((guild) => {
    const mint = coinKeypair(guild.slug)!.publicKey;
    return offered.map((config) => ({ guild, mint, config, pool: deriveDbcPoolAddress(WRAPPED_SOL, mint, config) }));
  });
  const accounts = (await Promise.all(chunks(candidates, 100).map((chunk) => rpc().getMultipleAccountsInfo(chunk.map((c) => c.pool))))).flat();
  const coder = dbc().state.getProgram().coder;
  const launched: Array<{ slug: string; listed: boolean; raised: bigint; threshold: bigint; migrated: boolean; damm: PublicKey | null }> = [];
  for (const [i, account] of accounts.entries()) {
    if (!account) continue;
    const { guild, mint, config } = candidates[i];
    const pool = coder.accounts.decode<VirtualPool>("virtualPool", account.data).poolState;
    if (!pool.creator.equals(new PublicKey(guild.founder))) continue;
    const settings = await readConfig(config);
    if (!settings) continue;
    const migrated = pool.isMigrated === 1;
    launched.push({
      slug: guild.slug,
      listed: !DELISTED_SLUGS.has(guild.slug),
      raised: big(pool.quoteReserve),
      threshold: big(settings.migrationQuoteThreshold),
      migrated,
      damm: migrated ? deriveDammV2PoolAddress(DAMM_V2_MIGRATION_FEE_ADDRESS[settings.migrationFeeOption], mint, WRAPPED_SOL) : null,
    });
  }
  const graduated = launched.filter((coin) => coin.damm);
  const dammAccounts = graduated.length ? await rpc().getMultipleAccountsInfo(graduated.map((coin) => coin.damm!)) : [];
  const verified = new Set(graduated.filter((_, i) => dammAccounts[i] !== null).map((coin) => coin.slug));
  for (const coin of launched) {
    stages.set(
      coin.slug,
      coinStage({
        listed: coin.listed,
        curve: { raised: coin.raised, threshold: coin.threshold, migrated: coin.migrated },
        graduated: coin.migrated ? { verified: verified.has(coin.slug) } : null,
      }),
    );
  }
  return stages;
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
    // The whole 1%: the pool's share and Meteora's are reported apart.
    fee: (big(quote.tradingFee) + big(quote.protocolFee) + big(quote.referralFee)).toString(),
    priceImpact: before > 0 ? Math.abs((after - before) / before) * 100 : 0,
    slippageBps,
    quotedAt,
  };
}

/** The owner approves the coin transaction; Pawket Wallet funds it and its device pays the fee.
 * Both funding brackets land atomically with the trade. Existing owner SOL stays unchanged.
 */
async function forPlayer(transaction: Transaction, player: PublicKey, signers: Keypair[] = []): Promise<string> {
  const owner = player.toBase58() as Address;
  const wallet = await fetchWallet(sponsorRpc(), owner);
  if (!wallet || !wallet.device || wallet.deviceExpiresAt <= Date.now() / 1000) throw new CoinRefusal("Link this device in your Pawket Wallet first.", 409);
  const deviceAddress = wallet.device;
  const device = new PublicKey(deviceAddress);
  const [rent, deviceBalance, keep, blockhash] = await Promise.all([
    rpc().getMinimumBalanceForRentExemption(PAWKET_ACCOUNTS.wallet.size),
    rpc().getBalance(device), rpc().getBalance(player), rpc().getLatestBlockhash("confirmed"),
  ]);
  const balance = wallet.lamports - BigInt(rent);
  if (balance <= 0n) throw new CoinRefusal("Add SOL to your Pawket Wallet first.", 409);
  const address = (await deriveWalletPda(owner)).address;
  const legacy = (ix: Instruction) => new TransactionInstruction({
    programId: new PublicKey(ix.programAddress), data: Buffer.from(ix.data ?? []),
    keys: (ix.accounts ?? []).map((meta) => ({ pubkey: new PublicKey(meta.address), isSigner: meta.role >= 2, isWritable: (meta.role & 1) === 1 })),
  });
  const bracket = (amount?: bigint) => legacy(getWalletSpendInstruction({ owner, wallet: address, device: deviceAddress, keep: BigInt(keep), amount }));
  transaction.feePayer = device;
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.instructions.unshift(bracket(0n));
  transaction.add(bracket());
  const fee = (await rpc().getFeeForMessage(transaction.compileMessage(), "confirmed")).value;
  if (fee === null || deviceBalance < fee + 890_880) throw new CoinRefusal("Add SOL and relink this device in Pawket Wallet to fill its network-fee balance.", 409);
  const refill = WALLET_LIMITS.deviceFloat > BigInt(deviceBalance - fee) ? WALLET_LIMITS.deviceFloat - BigInt(deviceBalance - fee) : 0n;
  if (balance <= refill) throw new CoinRefusal("Add SOL to your Pawket Wallet to cover this transaction.", 409);
  transaction.instructions[0] = bracket(balance - refill);
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
  if (coin.taken) throw new CoinRefusal(`A coin ${guild.name}'s founder did not launch holds its address, so Pawket cannot launch one. Nothing was sent.`, 409);
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

/**
 * A wallet's positions in the coin's graduated pool — the founder's and
 * Pawket's halves of the locked liquidity — and the fees they have earned
 * and not yet claimed, in SOL and in the coin. Null before graduation.
 */
export async function readPositionFees(guild: ChainGuild, wallet: string): Promise<{ positions: number; feeSol: string; feeCoin: string } | null> {
  const coin = await liveCoin(guild);
  if (!coin?.graduated) return null;
  const { address, pool } = coin.graduated;
  const positions = await damm().getUserPositionByPool(address, new PublicKey(wallet));
  let feeSol = 0n;
  let feeCoin = 0n;
  for (const { positionState } of positions) {
    const fees = getUnClaimLpFee(pool, positionState);
    feeCoin += big(fees.feeTokenA);
    feeSol += big(fees.feeTokenB);
  }
  return { positions: positions.length, feeSol: feeSol.toString(), feeCoin: feeCoin.toString() };
}

/** What a wallet's locked positions in the graduated pool have earned, claimed to that wallet. The liquidity stays locked. */
export async function positionFeeTransaction(guild: ChainGuild, wallet: string): Promise<string> {
  const coin = await liveCoin(guild);
  if (!coin?.graduated) throw new CoinRefusal("This coin has not graduated: its fees are on the curve. Nothing was sent.", 409);
  const { address, pool } = coin.graduated;
  const owner = new PublicKey(wallet);
  const positions = await damm().getUserPositionByPool(address, owner);
  if (positions.length === 0) throw new CoinRefusal("This wallet holds no position in the pool. Nothing was sent.", 403);
  const [first, ...rest] = await Promise.all(
    positions.map(({ position, positionNftAccount }) =>
      damm().claimPositionFee({
        owner,
        position,
        pool: address,
        positionNftAccount,
        tokenAMint: pool.tokenAMint,
        tokenBMint: pool.tokenBMint,
        tokenAVault: pool.tokenAVault,
        tokenBVault: pool.tokenBVault,
        tokenAProgram: getTokenProgram(pool.tokenAFlag),
        tokenBProgram: getTokenProgram(pool.tokenBFlag),
      }),
    ),
  );
  for (const other of rest) first.add(...other.instructions);
  return forPlayer(first, owner);
}
