// Gives a test wallet some devnet SOL from Pawket's devnet sponsor, as e2e/devnet.ts does for the
// screen specs (a faucet's job; Helius devnet airdrops fail). Devnet only. Usage: node fund.mjs <address> <sol>
import { readFileSync } from "node:fs";
import {
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

const [address, sol] = process.argv.slice(2);
const root = new URL("../../", import.meta.url).pathname;
const env = Object.fromEntries(readFileSync(`${root}.env`, "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (env.NEXT_PUBLIC_SOLANA_CLUSTER && env.NEXT_PUBLIC_SOLANA_CLUSTER !== "devnet") throw new Error("devnet only");
const sponsor = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(readFileSync(`${root}.keys/sponsor.json`, "utf8"))));
const rpc = createSolanaRpc(env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
const message = pipe(
  createTransactionMessage({ version: "legacy" }),
  (m) => setTransactionMessageFeePayerSigner(sponsor, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
  (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: sponsor, destination: address, amount: BigInt(Math.round(Number(sol) * 1e9)) }), m),
);
const signed = await signTransactionMessageWithSigners(message);
await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" }).send();
const signature = getSignatureFromTransaction(signed);
for (let i = 0; i < 60; i++) {
  const { value } = await rpc.getSignatureStatuses([signature]).send();
  if (value[0]?.confirmationStatus === "confirmed" || value[0]?.confirmationStatus === "finalized") {
    const { value: lamports } = await rpc.getBalance(address, { commitment: "confirmed" }).send();
    console.log(`funded ${address} with ${sol} SOL (${signature}); balance ${Number(lamports) / 1e9} SOL`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
throw new Error("not confirmed");
