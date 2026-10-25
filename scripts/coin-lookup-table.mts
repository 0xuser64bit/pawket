import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  DAMM_V2_PROGRAM_ID,
  deriveDammV2EventAuthority,
  deriveDammV2PoolAuthority,
  deriveDbcEventAuthority,
  deriveDbcPoolAuthority,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { COIN_CONFIGS, type CoinCluster } from "../src/lib/coins/presets.ts";
import { isGenesisOf } from "../src/lib/solana/cluster.ts";

const cluster = (process.argv[2] ?? "devnet") as CoinCluster;
if (cluster !== "devnet" && cluster !== "mainnet-beta") throw new Error("usage: node scripts/coin-lookup-table.mts [devnet|mainnet-beta]");
const configs = COIN_CONFIGS[cluster];
if (!configs) throw new Error(`Pawket has no coin configs on ${cluster}. Nothing was signed.`);
const url = process.env.SOLANA_RPC_URL ?? (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const connection = new Connection(url, "confirmed");
if (!isGenesisOf(cluster, await connection.getGenesisHash())) throw new Error(`That RPC is not ${cluster}. Nothing was signed.`);
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(process.env.PAYER_KEYPAIR ?? `${homedir()}/.config/solana/id.json`, "utf8")) as number[]),
);

const addresses = [
  DAMM_V2_PROGRAM_ID,
  deriveDbcPoolAuthority(),
  deriveDbcEventAuthority(),
  deriveDammV2PoolAuthority(),
  deriveDammV2EventAuthority(),
  new PublicKey("So11111111111111111111111111111111111111112"),
  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  SystemProgram.programId,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  ...DAMM_V2_MIGRATION_FEE_ADDRESS,
  ...Object.values(configs).map((config) => new PublicKey(config)),
];

const [create, table] = AddressLookupTableProgram.createLookupTable({
  authority: payer.publicKey,
  payer: payer.publicKey,
  recentSlot: await connection.getSlot("finalized"),
});
const extend = AddressLookupTableProgram.extendLookupTable({ payer: payer.publicKey, authority: payer.publicKey, lookupTable: table, addresses });
await sendAndConfirmTransaction(connection, new Transaction().add(create, extend), [payer]);
await sendAndConfirmTransaction(connection, new Transaction().add(AddressLookupTableProgram.freezeLookupTable({ authority: payer.publicKey, lookupTable: table })), [payer]);
const made = (await connection.getAddressLookupTable(table)).value;
if (!made || made.state.addresses.length !== addresses.length || made.isActive() === false) throw new Error(`${table.toBase58()} did not come out as expected.`);
console.log(`${cluster} graduation lookup table: ${table.toBase58()} (${addresses.length} addresses, frozen)`);
process.exit(0);
