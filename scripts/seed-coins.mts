/**
 * Launches the starter guilds' coins through Pawket's own coin routes, as
 * their founder would from the coin page — so a visitor finds a coin at
 * every stage: Sunbeam Club's on its gentle curve, Muddy Paws' on its
 * lively one, and Cloud Nine's graduated into its DAMM v2 pool. Run it
 * again and it does only what is missing.
 *
 *   pnpm dlx tsx scripts/seed-coins.mts http://localhost:3000
 *
 * The founder is the starter guilds' founder wallet (.keys/guild-founder.json,
 * made by scripts/seed-guilds.mts); the deploy wallet (~/.config/solana/id.json)
 * tops it up with devnet SOL, since Pawket's sponsor never pays for coins.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createKeyPairSignerFromBytes, type Address } from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import { createPatientRpc } from "../src/lib/solana/rpc";
import { sendPawket, sendPrepared } from "../src/lib/solana/send";

const host = process.argv[2];
if (!host) throw new Error("usage: tsx scripts/seed-coins.mts http://<app host>");
const rpc = createPatientRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
const key = (path: string) => createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]));
const founder = await key(".keys/guild-founder.json");
const funder = await key(`${homedir()}/.config/solana/id.json`);

const COINS = [
  { slug: "sunbeam-club", preset: "gentle", firstBuy: 300_000_000n, graduate: false },
  { slug: "muddy-paws", preset: "lively", firstBuy: 500_000_000n, graduate: false },
  { slug: "cloud-nine", preset: "gentle", firstBuy: 500_000_000n, graduate: true },
] as const;

const { value: balance } = await rpc.getBalance(founder.address, { commitment: "confirmed" }).send();
if (balance < 4_000_000_000n) {
  await sendPawket({
    rpc,
    owner: funder,
    sponsor: null,
    instructions: () => [getTransferSolInstruction({ source: funder, destination: founder.address, amount: 4_000_000_000n - balance })],
  });
  console.log(`topped the founder up to 4 SOL: ${founder.address}`);
}

async function post(path: string, fields: Record<string, unknown> = {}) {
  const result = await sendPrepared({
    rpc,
    owner: founder,
    sponsored: false,
    prepare: async () => {
      const response = await fetch(new URL(path, host), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, account: founder.address }),
      });
      const body = (await response.json()) as { transaction?: string; message?: string };
      if (!body.transaction) throw new Error(`${path}: ${body.message}`);
      return body.transaction;
    },
  });
  console.log(`${path}: ${result.outcome} ${result.signature}`);
  // The public devnet RPC rate-limits a burst; a breath between sends keeps under it.
  await new Promise((resolve) => setTimeout(resolve, 2500));
}

async function stage(slug: string): Promise<{ stage: string; raised: string; threshold: string }> {
  // The coin page's own read, through the quote route's refusal or the metadata's guild check, is
  // more than this script needs: ask the page for its stage line instead.
  const html = await (await fetch(new URL(`/guilds/${slug}/coin`, host))).text();
  const raised = /Raised on the curve<\/span><span class="pk-receipt__v">([\d.,]+) SOL of ([\d.,]+) SOL/.exec(html);
  const named = /Launch open · bonding curve|Migration pending|Active liquidity · DAMM v2|No token · social guild/.exec(html)?.[0] ?? "";
  const stages: Record<string, string> = {
    "Launch open · bonding curve": "dbc",
    "Migration pending": "pending",
    "Active liquidity · DAMM v2": "damm",
    "No token · social guild": "none",
  };
  return { stage: stages[named] ?? "unknown", raised: raised?.[1] ?? "0", threshold: raised?.[2] ?? "0" };
}

for (const coin of COINS) {
  let now = await stage(coin.slug);
  if (now.stage === "none") {
    await post(`/api/coins/${coin.slug}/launch`, { preset: coin.preset, firstBuy: coin.firstBuy.toString() });
    now = await stage(coin.slug);
  }
  while (coin.graduate && now.stage === "dbc") {
    const left = BigInt(Math.ceil((Number(now.threshold.replace(/,/g, "")) - Number(now.raised.replace(/,/g, ""))) * 1e9));
    const amount = (left < 1_000_000_000n ? left + left / 5n + 10_000_000n : 1_000_000_000n).toString();
    const quote = (await (await fetch(new URL(`/api/coins/${coin.slug}/quote?side=buy&amount=${amount}&slippage=300`, host))).json()) as {
      minimumOut: string;
    };
    await post(`/api/coins/${coin.slug}/trade`, { side: "buy", amount, minimumOut: quote.minimumOut });
    now = await stage(coin.slug);
  }
  if (coin.graduate && now.stage === "pending") {
    await post(`/api/coins/${coin.slug}/graduate`);
    now = await stage(coin.slug);
  }
  console.log(`${coin.slug}: ${now.stage} at ${host}/guilds/${coin.slug}/coin`);
}
console.log(`Founder: ${founder.address as Address}`);
