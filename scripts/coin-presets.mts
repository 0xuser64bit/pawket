/**
 * Makes the config account behind each guild-coin preset on a cluster,
 * once: Meteora's Dynamic Bonding Curve reads every coin on a preset from
 * it — the curve, the fee and its split, graduation to DAMM v2 and the
 * locked liquidity. Pawket is the partner: its treasury claims Pawket's
 * share of the fees and receives what a curve leaves over.
 *
 *   pnpm dlx tsx scripts/coin-presets.mts            # devnet
 *   pnpm dlx tsx scripts/coin-presets.mts mainnet-beta
 *
 * The deploy wallet (~/.config/solana/id.json) pays. Prints the addresses
 * for `COIN_CONFIGS` in src/lib/coins/presets.ts; a preset that already has
 * an account there is left alone. A config's own key signs only its
 * creation and is not kept.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { COIN_CONFIGS, COIN_PRESETS, PAWKET_TREASURY, type CoinCluster, type PresetId } from "../src/lib/coins/presets";
import { presetParameters } from "../src/server/coins/curve";

const cluster = (process.argv[2] ?? "devnet") as CoinCluster;
if (cluster !== "devnet" && cluster !== "mainnet-beta") throw new Error("usage: tsx scripts/coin-presets.mts [devnet|mainnet-beta]");
const url = process.env.SOLANA_RPC_URL ?? (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const connection = new Connection(url, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.PAYER ?? `${homedir()}/.config/solana/id.json`, "utf8")) as number[]),
);
const treasury = new PublicKey(PAWKET_TREASURY);
const WRAPPED_SOL = new PublicKey("So11111111111111111111111111111111111111112");

const made: Partial<Record<PresetId, string>> = { ...COIN_CONFIGS[cluster] };
for (const preset of COIN_PRESETS) {
  const known = made[preset.id];
  if (known && (await connection.getAccountInfo(new PublicKey(known)))) {
    console.log(`${preset.id}: already at ${known}`);
    continue;
  }
  const config = Keypair.generate();
  const transaction = await client.partner.createConfig({
    ...presetParameters(preset, cluster),
    config: config.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    payer: payer.publicKey,
    quoteMint: WRAPPED_SOL,
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer, config], { commitment: "confirmed" });
  made[preset.id] = config.publicKey.toBase58();
  console.log(`${preset.id}: ${config.publicKey.toBase58()} (${signature})`);
}

console.log(`\nCOIN_CONFIGS["${cluster}"] = ${JSON.stringify(made, null, 2)}`);
