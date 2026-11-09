import { readFileSync } from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { COIN_CONFIGS, COIN_LOOKUP_TABLES, type CoinCluster } from "../src/lib/coins/presets.ts";
import { graduationPlan, keeperLimit, type GraduationCandidate } from "../src/lib/coins/keeper.ts";
import { isUsableCoinLookup } from "../src/lib/coins/lookup.ts";
import { explorerTxUrl, isGenesisOf } from "../src/lib/solana/cluster.ts";

const cluster = (process.argv[2] ?? "devnet") as CoinCluster;
if (cluster !== "devnet" && cluster !== "mainnet-beta") throw new Error("usage: node scripts/graduate-coins.mts [devnet|mainnet-beta]");
const configs = COIN_CONFIGS[cluster];
if (!configs) throw new Error(`Pawket has no coin configs on ${cluster}. Nothing was signed.`);
const url = process.env.SOLANA_RPC_URL ?? (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const connection = new Connection(url, "confirmed");
if (!isGenesisOf(cluster, await connection.getGenesisHash())) throw new Error(`${url} is not ${cluster}. Nothing was signed.`);

const tableAddress = COIN_LOOKUP_TABLES[cluster];
if (!tableAddress) throw new Error(`Pawket has no graduation lookup table on ${cluster}. Nothing was signed.`);
const table = (await connection.getAddressLookupTable(new PublicKey(tableAddress))).value;
if (!table || !isUsableCoinLookup(table, tableAddress)) {
  throw new Error(`The graduation lookup table ${tableAddress} is not active and frozen. Nothing was signed.`);
}

const execute = process.env.EXECUTE === "1";
const limit = keeperLimit(process.env);
const dbc = new DynamicBondingCurveClient(connection, "confirmed");
const offered = Object.values(configs);

const states = new Map<string, { threshold: bigint; migrationFeeOption: number }>();
for (const config of offered) {
  const state = await dbc.state.getPoolConfig(new PublicKey(config));
  states.set(config, {
    threshold: BigInt(state.migrationQuoteThreshold.toString()),
    migrationFeeOption: state.migrationFeeOption,
  });
}

const candidates: GraduationCandidate[] = [];
for (const config of offered) {
  const state = states.get(config)!;
  for (const { publicKey, account } of await dbc.state.getPoolsByConfig(config)) {
    candidates.push({
      pool: publicKey.toBase58(),
      config,
      raised: BigInt(account.poolState.quoteReserve.toString()),
      threshold: state.threshold,
      migrated: account.poolState.isMigrated === 1,
    });
  }
}

const plan = graduationPlan(candidates, limit, offered);
type Entry = {
  pool: string;
  config: string;
  raised: string;
  threshold: string;
  outcome: "planned" | "confirmed" | "skipped" | "failed";
  signature?: string;
  explorer?: string;
  reason?: string;
};
const entries: Entry[] = [];
let confirmed = 0;
let failed = 0;
let skipped = 0;

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ pawket: "coin-graduation", cluster, at: new Date().toISOString(), ...entry }));
}

function safeError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/https?:\/\/\S+/g, "[url]").slice(0, 300);
}

function readKeeper(): Keypair {
  const path = process.env.KEEPER_KEYPAIR ?? ".keys/keeper.json";
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
  } catch {
    throw new Error(`The keeper needs its own key at ${path} (KEEPER_KEYPAIR). Nothing was signed.`);
  }
}

if (!execute) {
  for (const candidate of plan) {
    const entry: Entry = {
      pool: candidate.pool,
      config: candidate.config,
      raised: candidate.raised.toString(),
      threshold: candidate.threshold.toString(),
      outcome: "planned",
    };
    entries.push(entry);
    log(entry);
  }
} else {
  const keeper = readKeeper();
  const balance = await connection.getBalance(keeper.publicKey);
  if (balance === 0) throw new Error("The keeper key has no SOL for fees and rent. Nothing was signed.");

  for (const candidate of plan) {
    const base = {
      pool: candidate.pool,
      config: candidate.config,
      raised: candidate.raised.toString(),
      threshold: candidate.threshold.toString(),
    };
    let signature: string | undefined;
    try {
      const live = await dbc.state.getPool(new PublicKey(candidate.pool));
      if (live.poolState.isMigrated === 1) {
        skipped += 1;
        const entry: Entry = { ...base, outcome: "skipped", reason: "migrated before this run" };
        entries.push(entry);
        log(entry);
        continue;
      }
      const raised = BigInt(live.poolState.quoteReserve.toString());
      if (raised < candidate.threshold) {
        skipped += 1;
        const entry: Entry = { ...base, raised: raised.toString(), outcome: "skipped", reason: "below threshold before this run" };
        entries.push(entry);
        log(entry);
        continue;
      }

      const config = states.get(candidate.config)!;
      const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[config.migrationFeeOption];
      if (!dammConfig) throw new Error("The pool's migration fee option is not one Pawket offers.");
      const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await dbc.migration.migrateToDammV2({
        payer: keeper.publicKey,
        pool: new PublicKey(candidate.pool),
        dammConfig,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const message = new TransactionMessage({
        payerKey: keeper.publicKey,
        recentBlockhash: blockhash,
        instructions: transaction.instructions,
      }).compileToV0Message([table]);
      const signed = new VersionedTransaction(message);
      signed.sign([keeper, firstPositionNftKeypair, secondPositionNftKeypair]);
      signature = await connection.sendTransaction(signed, { maxRetries: 3, preflightCommitment: "confirmed" });
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      confirmed += 1;
      const entry: Entry = { ...base, outcome: "confirmed", signature, explorer: explorerTxUrl(signature, cluster) };
      entries.push(entry);
      log(entry);
    } catch (error) {
      failed += 1;
      const entry: Entry = {
        ...base,
        outcome: "failed",
        reason: signature ? `sent but not confirmed: ${safeError(error)}` : safeError(error),
        ...(signature ? { signature, explorer: explorerTxUrl(signature, cluster) } : {}),
      };
      entries.push(entry);
      log(entry);
    }
  }
}

const summary = {
  pawket: "coin-graduation-run",
  cluster,
  execute,
  limit,
  planned: plan.length,
  confirmed,
  skipped,
  failed,
  entries,
};
console.log(JSON.stringify(summary));

const webhook = process.env.KEEPER_WEBHOOK_URL;
if (webhook) {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(summary),
  }).catch(() => null);
  if (!response?.ok) {
    console.error(JSON.stringify({ pawket: "coin-graduation-webhook", outcome: "failed", status: response?.status ?? null }));
    process.exitCode = 1;
  }
}

if (failed > 0) process.exitCode = 1;
