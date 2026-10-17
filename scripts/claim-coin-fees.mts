/**
 * Collects Pawket's side of every guild coin into its treasury: the
 * partner's share of each curve's trading fees, each coin's launch fee, and
 * what Pawket's half of each graduated pool's locked liquidity has earned.
 * The treasury's key signs and pays; it never touches anyone else's share,
 * and the liquidity itself stays locked.
 *
 *   pnpm dlx tsx scripts/claim-coin-fees.mts            # devnet
 *   pnpm dlx tsx scripts/claim-coin-fees.mts mainnet-beta
 *
 * The treasury's key is .keys/treasury.json (TREASURY_KEYPAIR overrides). It
 * is never put on the server.
 */
import { readFileSync } from "node:fs";
import { Connection, Keypair, sendAndConfirmTransaction, type Transaction } from "@solana/web3.js";
import { DynamicBondingCurveClient, U64_MAX } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CpAmm, getTokenProgram, getUnClaimLpFee } from "@meteora-ag/cp-amm-sdk";
import { COIN_CONFIGS, PAWKET_TREASURY, type CoinCluster } from "../src/lib/coins/presets";
import { isGenesisOf } from "../src/lib/solana/cluster";

const cluster = (process.argv[2] ?? "devnet") as CoinCluster;
if (cluster !== "devnet" && cluster !== "mainnet-beta") throw new Error("usage: tsx scripts/claim-coin-fees.mts [devnet|mainnet-beta]");
const url = process.env.SOLANA_RPC_URL ?? (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const connection = new Connection(url, "confirmed");
if (!isGenesisOf(cluster, await connection.getGenesisHash())) throw new Error(`${url} is not ${cluster}. Nothing was signed.`);
const dbc = new DynamicBondingCurveClient(connection, "confirmed");
const damm = new CpAmm(connection);
const treasury = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.TREASURY_KEYPAIR ?? ".keys/treasury.json", "utf8")) as number[]),
);
if (treasury.publicKey.toBase58() !== PAWKET_TREASURY) throw new Error("That key is not Pawket's treasury.");

const send = async (label: string, transaction: Transaction) => {
  const signature = await sendAndConfirmTransaction(connection, transaction, [treasury], { commitment: "confirmed" });
  console.log(`${label}: ${signature}`);
};

const before = await connection.getBalance(treasury.publicKey);
for (const config of Object.values(COIN_CONFIGS[cluster] ?? {})) {
  for (const { publicKey: pool, account } of await dbc.state.getPoolsByConfig(config)) {
    const state = account.poolState;
    if (!state.partnerQuoteFee.isZero() || !state.partnerBaseFee.isZero()) {
      await send(
        `trading fees, ${pool.toBase58()}`,
        await dbc.partner.claimPartnerTradingFee({
          feeClaimer: treasury.publicKey,
          payer: treasury.publicKey,
          pool,
          maxBaseAmount: U64_MAX,
          maxQuoteAmount: U64_MAX,
        }),
      );
    }
    await dbc.partner
      .claimPartnerPoolCreationFee({ pool, feeReceiver: treasury.publicKey })
      .then((transaction) => send(`launch fee, ${pool.toBase58()}`, transaction))
      .catch(() => console.log(`launch fee, ${pool.toBase58()}: claimed already, or none`));
  }
}

for (const { position, positionNftAccount, positionState } of await damm.getPositionsByUser(treasury.publicKey)) {
  const pool = await damm.fetchPoolState(positionState.pool);
  const fees = getUnClaimLpFee(pool, positionState);
  if (fees.feeTokenA.isZero() && fees.feeTokenB.isZero()) continue;
  await send(
    `pool fees, ${positionState.pool.toBase58()}`,
    await damm.claimPositionFee({
      owner: treasury.publicKey,
      position,
      pool: positionState.pool,
      positionNftAccount,
      tokenAMint: pool.tokenAMint,
      tokenBMint: pool.tokenBMint,
      tokenAVault: pool.tokenAVault,
      tokenBVault: pool.tokenBVault,
      tokenAProgram: getTokenProgram(pool.tokenAFlag),
      tokenBProgram: getTokenProgram(pool.tokenBFlag),
    }),
  );
}

const after = await connection.getBalance(treasury.publicKey);
console.log(`Treasury ${PAWKET_TREASURY}: ${(before / 1e9).toFixed(6)} → ${(after / 1e9).toFixed(6)} SOL`);
